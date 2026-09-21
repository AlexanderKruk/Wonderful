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
      status: rawClient.status_code === "A" ? "active" : "inactive",
    };
  }

  private async getClientFromCustomerSystem(
    clientId: string,
  ): Promise<CustomerSystemResponse> {
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
