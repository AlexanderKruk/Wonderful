import type { Client } from "../domain/client";
import type { CustomerConnector } from "../connector/customerConnector";
import {
  CustomerAuthenticationError,
  CustomerAuthorizationError,
  CustomerNotFoundError,
  CustomerSystemUnavailableError,
  InvalidCustomerResponseError,
} from "../connector/errors";

export type GetClientToolInput = {
  clientId: string;
};

export type GetClientToolResult =
  | {
      success: true;
      client: Client;
    }
  | {
      success: false;
      code:
        | "INVALID_INPUT"
        | "CLIENT_NOT_FOUND"
        | "AUTHENTICATION_FAILED"
        | "ACCESS_FORBIDDEN"
        | "CUSTOMER_SYSTEM_UNAVAILABLE"
        | "INVALID_CUSTOMER_DATA";
    };

type ClientReader = Pick<CustomerConnector, "getClient">;

export function createGetClientTool(connector: ClientReader) {
  return async function getClientTool(
    input: GetClientToolInput,
  ): Promise<GetClientToolResult> {
    if (
      typeof input.clientId !== "string" ||
      input.clientId.trim() === ""
    ) {
      return {
        success: false,
        code: "INVALID_INPUT",
      };
    }

    try {
      const client = await connector.getClient(input.clientId);

      return {
        success: true,
        client,
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
