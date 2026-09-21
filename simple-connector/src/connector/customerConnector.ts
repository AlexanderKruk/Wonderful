import type { Client } from "../domain/client";

type CustomerSystemResponse = {
  client_no: string;
  full_name: string;
  contact: {
    email_address?: string;
  } | null;
  status_code: string;
};

export class CustomerConnector {
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
        throw new Error(`Unknown customer status: ${statusCode}`);
    }
  }

  private async getClientFromCustomerSystem(
    clientId: string,
  ): Promise<CustomerSystemResponse> {
    if (clientId === "no-contact") {
      return {
        client_no: clientId,
        full_name: "Jan Kowalski",
        contact: null,
        status_code: "A",
      };
    }

    if (clientId === "unknown-status") {
      return {
        client_no: clientId,
        full_name: "Marta Zielinska",
        contact: {
          email_address: "marta@example.com",
        },
        status_code: "X",
      };
    }

    return {
      client_no: clientId,
      full_name: "Anna Nowak",
      contact: {
        email_address: "anna@example.com",
      },
      status_code: "A",
    };
  }
}
