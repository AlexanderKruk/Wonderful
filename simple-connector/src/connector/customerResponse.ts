import { InvalidCustomerResponseError } from "./errors";

export type CustomerSystemResponse = {
  client_no: string;
  full_name: string;
  contact: {
    email_address?: string;
  } | null;
  status_code: string;
};

export function parseCustomerSystemResponse(
  value: unknown,
): CustomerSystemResponse {
  if (!isRecord(value)) {
    throw new InvalidCustomerResponseError(
      "Customer system returned a non-object response",
    );
  }

  if (typeof value.client_no !== "string") {
    throw new InvalidCustomerResponseError(
      "Customer response field client_no must be a string",
    );
  }

  if (typeof value.full_name !== "string") {
    throw new InvalidCustomerResponseError(
      "Customer response field full_name must be a string",
    );
  }

  if (typeof value.status_code !== "string") {
    throw new InvalidCustomerResponseError(
      "Customer response field status_code must be a string",
    );
  }

  let contact: CustomerSystemResponse["contact"];

  if (value.contact === null) {
    contact = null;
  } else {
    if (!isRecord(value.contact)) {
      throw new InvalidCustomerResponseError(
        "Customer response field contact must be an object or null",
      );
    }

    const emailAddress = value.contact.email_address;

    if (
      emailAddress !== undefined &&
      typeof emailAddress !== "string"
    ) {
      throw new InvalidCustomerResponseError(
        "Customer response field contact.email_address must be a string",
      );
    }

    contact =
      emailAddress === undefined
        ? {}
        : { email_address: emailAddress };
  }

  return {
    client_no: value.client_no,
    full_name: value.full_name,
    contact,
    status_code: value.status_code,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}
