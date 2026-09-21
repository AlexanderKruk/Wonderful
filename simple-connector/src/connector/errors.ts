export class InvalidCustomerResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCustomerResponseError";
  }
}

export class CustomerNotFoundError extends Error {
  constructor(clientId: string) {
    super(`Customer not found: ${clientId}`);
    this.name = "CustomerNotFoundError";
  }
}

export class CustomerSystemUnavailableError extends Error {
  constructor() {
    super("Customer system is unavailable");
    this.name = "CustomerSystemUnavailableError";
  }
}
