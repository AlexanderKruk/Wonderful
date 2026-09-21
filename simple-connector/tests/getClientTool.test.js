const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createGetClientTool,
} = require("../dist/tools/getClientTool");
const {
  CustomerAuthenticationError,
  CustomerAuthorizationError,
  CustomerNotFoundError,
  CustomerSystemUnavailableError,
  InvalidCustomerResponseError,
} = require("../dist/connector/errors");

function connectorReturning(value) {
  return {
    async getClient() {
      return value;
    },
  };
}

function connectorThrowing(error) {
  return {
    async getClient() {
      throw error;
    },
  };
}

test("returns a structured success result", async () => {
  const tool = createGetClientTool(
    connectorReturning({
      id: "8123",
      name: "Anna Nowak",
      email: "anna@example.com",
      status: "active",
    }),
  );

  const result = await tool({ clientId: "8123" });

  assert.deepStrictEqual(result, {
    success: true,
    client: {
      id: "8123",
      name: "Anna Nowak",
      email: "anna@example.com",
      status: "active",
    },
  });
});

test("rejects empty client id before calling the connector", async () => {
  let calls = 0;
  const tool = createGetClientTool({
    async getClient() {
      calls += 1;
      throw new Error("should not be called");
    },
  });

  const result = await tool({ clientId: "   " });

  assert.deepStrictEqual(result, {
    success: false,
    code: "INVALID_INPUT",
  });
  assert.equal(calls, 0);
});

const errorCases = [
  [
    new CustomerNotFoundError("missing"),
    "CLIENT_NOT_FOUND",
  ],
  [
    new CustomerAuthenticationError(),
    "AUTHENTICATION_FAILED",
  ],
  [
    new CustomerAuthorizationError(),
    "ACCESS_FORBIDDEN",
  ],
  [
    new CustomerSystemUnavailableError(),
    "CUSTOMER_SYSTEM_UNAVAILABLE",
  ],
  [
    new InvalidCustomerResponseError("bad payload"),
    "INVALID_CUSTOMER_DATA",
  ],
];

for (const [error, expectedCode] of errorCases) {
  test(`maps ${error.name} to ${expectedCode}`, async () => {
    const tool = createGetClientTool(
      connectorThrowing(error),
    );

    const result = await tool({ clientId: "8123" });

    assert.deepStrictEqual(result, {
      success: false,
      code: expectedCode,
    });
  });
}

test("does not hide unexpected programming errors", async () => {
  const unexpected = new Error("bug");
  const tool = createGetClientTool(
    connectorThrowing(unexpected),
  );

  await assert.rejects(
    () => tool({ clientId: "8123" }),
    unexpected,
  );
});
