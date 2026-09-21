import type { Client } from "../domain/client";
import {
  CustomerNotFoundError,
  CustomerSystemUnavailableError,
  InvalidCustomerResponseError,
} from "./errors";

type CustomerSystemResponse = {
  client_no: string;
  full_name: string;
  contact: {
    email_address?: string;
  } | null;
  status_code: string;
};

export class CustomerConnector {
  constructor(private readonly baseUrl: string) {}

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
    let response: Response;

    try {
      response = await fetch(
        `${this.baseUrl}/clients/${encodeURIComponent(clientId)}`,
      );
    } catch {
      throw new CustomerSystemUnavailableError();
    }

    if (response.status === 404) {
      throw new CustomerNotFoundError(clientId);
    }

    if (!response.ok) {
      throw new CustomerSystemUnavailableError();
    }

    return (await response.json()) as CustomerSystemResponse;
  }
}
