import type { ClientNote } from "../domain/clientNote";
import type { CustomerConnector } from "../connector/customerConnector";
import {
  CustomerAuthenticationError,
  CustomerAuthorizationError,
  CustomerIdempotencyConflictError,
  CustomerNotFoundError,
  CustomerSystemUnavailableError,
  InvalidCustomerResponseError,
} from "../connector/errors";

export type CreateClientNoteToolInput = {
  clientId: string;
  text: string;
  requestId: string;
};

export type CreateClientNoteToolResult =
  | {
      success: true;
      note: ClientNote;
    }
  | {
      success: false;
      code:
        | "INVALID_INPUT"
        | "CLIENT_NOT_FOUND"
        | "AUTHENTICATION_FAILED"
        | "ACCESS_FORBIDDEN"
        | "IDEMPOTENCY_CONFLICT"
        | "CUSTOMER_SYSTEM_UNAVAILABLE"
        | "INVALID_CUSTOMER_DATA";
    };

type ClientNoteWriter = Pick<CustomerConnector, "createClientNote">;

export function createClientNoteTool(connector: ClientNoteWriter) {
  return async function runCreateClientNoteTool(
    input: CreateClientNoteToolInput,
  ): Promise<CreateClientNoteToolResult> {
    if (
      typeof input.clientId !== "string" ||
      input.clientId.trim() === "" ||
      typeof input.text !== "string" ||
      input.text.trim() === "" ||
      typeof input.requestId !== "string" ||
      input.requestId.trim() === ""
    ) {
      return {
        success: false,
        code: "INVALID_INPUT",
      };
    }

    try {
      const note = await connector.createClientNote(
        input.clientId,
        input.text,
        input.requestId,
      );

      return {
        success: true,
        note,
      };
    } catch (error) {
      if (error instanceof CustomerNotFoundError) {
        return {
          success: false,
          code: "CLIENT_NOT_FOUND",
        };
      }

      if (error instanceof CustomerAuthenticationError) {
        return {
          success: false,
          code: "AUTHENTICATION_FAILED",
        };
      }

      if (error instanceof CustomerAuthorizationError) {
        return {
          success: false,
          code: "ACCESS_FORBIDDEN",
        };
      }

      if (error instanceof CustomerIdempotencyConflictError) {
        return {
          success: false,
          code: "IDEMPOTENCY_CONFLICT",
        };
      }

      if (error instanceof CustomerSystemUnavailableError) {
        return {
          success: false,
          code: "CUSTOMER_SYSTEM_UNAVAILABLE",
        };
      }

      if (error instanceof InvalidCustomerResponseError) {
        return {
          success: false,
          code: "INVALID_CUSTOMER_DATA",
        };
      }

      throw error;
    }
  };
}
