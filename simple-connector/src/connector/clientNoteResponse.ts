import type { ClientNote } from "../domain/clientNote";
import { InvalidCustomerResponseError } from "./errors";

export function parseClientNoteResponse(value: unknown): ClientNote {
  if (!isRecord(value)) {
    throw new InvalidCustomerResponseError(
      "Customer system returned a non-object note response",
    );
  }

  if (typeof value.note_id !== "string") {
    throw new InvalidCustomerResponseError(
      "Customer note field note_id must be a string",
    );
  }

  if (typeof value.client_no !== "string") {
    throw new InvalidCustomerResponseError(
      "Customer note field client_no must be a string",
    );
  }

  if (typeof value.text !== "string") {
    throw new InvalidCustomerResponseError(
      "Customer note field text must be a string",
    );
  }

  return {
    id: value.note_id,
    clientId: value.client_no,
    text: value.text,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}
