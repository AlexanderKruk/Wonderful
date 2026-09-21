import type { Client } from "../domain/client";
import {
  CustomerAuthenticationError,
  CustomerAuthorizationError,
  CustomerNotFoundError,
  CustomerSystemUnavailableError,
  InvalidCustomerResponseError,
} from "./errors";
import {
  parseCustomerSystemResponse,
  type CustomerSystemResponse,
} from "./customerResponse";

type CustomerConnectorOptions = {
  accessToken?: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryBaseDelayMs?: number;
};

export class CustomerConnector {
  private readonly accessToken?: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly retryBaseDelayMs: number;

  constructor(
    private readonly baseUrl: string,
    options: CustomerConnectorOptions = {},
  ) {
    this.accessToken = options.accessToken;
    this.timeoutMs = options.timeoutMs ?? 1_000;
    this.maxRetries = options.maxRetries ?? 2;
    this.retryBaseDelayMs = options.retryBaseDelayMs ?? 50;
  }

  async getClient(clientId: string): Promise<Client> {
    const rawClient = await this.getClientFromCustomerSystem(clientId);

    return {
      id: rawClient.client_no,
      name: rawClient.full_name,
      email: rawClient.contact?.email_address ?? null,
      status: this.mapStatus(rawClient.status_code),
    };
  }

  private mapStatus(statusCode: string): Client["status"] {
    switch (statusCode) {
      case "A":
        return "active";
      case "I":
        return "inactive";
      default:
        throw new InvalidCustomerResponseError(
          `Unknown customer status: ${statusCode}`,
        );
    }
  }

  private async getClientFromCustomerSystem(
    clientId: string,
  ): Promise<CustomerSystemResponse> {
    const response = await this.fetchWithRetry(clientId);

    if (response.status === 401) {
      throw new CustomerAuthenticationError();
    }

    if (response.status === 403) {
      throw new CustomerAuthorizationError();
    }

    if (response.status === 404) {
      throw new CustomerNotFoundError(clientId);
    }

    if (!response.ok) {
      throw new CustomerSystemUnavailableError();
    }

    let payload: unknown;

    try {
      payload = await response.json();
    } catch {
      throw new InvalidCustomerResponseError(
        "Customer system returned invalid JSON",
      );
    }

    return parseCustomerSystemResponse(payload);
  }

  private async fetchWithRetry(clientId: string): Promise<Response> {
    const url =
      `${this.baseUrl}/clients/${encodeURIComponent(clientId)}`;

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        this.timeoutMs,
      );

      try {
        const response = await fetch(url, {
          headers: this.accessToken
            ? {
                Authorization: `Bearer ${this.accessToken}`,
              }
            : undefined,
          signal: controller.signal,
        });

        if (!this.isRetryableStatus(response.status)) {
          return response;
        }

        if (attempt === this.maxRetries) {
          throw new CustomerSystemUnavailableError();
        }
      } catch (error) {
        if (
          error instanceof CustomerSystemUnavailableError ||
          attempt === this.maxRetries
        ) {
          throw new CustomerSystemUnavailableError();
        }
      } finally {
        clearTimeout(timeout);
      }

      await this.sleep(
        this.retryBaseDelayMs * 2 ** attempt,
      );
    }

    throw new CustomerSystemUnavailableError();
  }

  private isRetryableStatus(status: number): boolean {
    return (
      status === 429 ||
      status === 500 ||
      status === 502 ||
      status === 503 ||
      status === 504
    );
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
