const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createClientNoteTool,
} = require("../dist/tools/createClientNoteTool");
const {
  CustomerIdempotencyConflictError,
  CustomerNotFoundError,
  CustomerSystemUnavailableError,
} = require("../dist/connector/errors");

function connectorReturning(value) {
  return {
    async createClientNote() {
      return value;
    },
  };
}

function connectorThrowing(error) {
  return {
    async createClientNote() {
      throw error;
    },
  };
}

test("returns a structured success result", async () => {
  const tool = createClientNoteTool(
    connectorReturning({
      id: "note_1",
      clientId: "8123",
      text: "Called customer",
    }),
  );

  const result = await tool({
    clientId: "8123",
    text: "Called customer",
    requestId: "req_1",
  });

  assert.deepStrictEqual(result, {
    success: true,
    note: {
      id: "note_1",
      clientId: "8123",
      text: "Called customer",
    },
  });
});

test("rejects missing request id before calling connector", async () => {
  let calls = 0;

  const tool = createClientNoteTool({
    async createClientNote() {
      calls += 1;
      throw new Error("should not be called");
    },
  });

  const result = await tool({
    clientId: "8123",
    text: "Called customer",
    requestId: "",
  });

  assert.deepStrictEqual(result, {
    success: false,
    code: "INVALID_INPUT",
  });
  assert.equal(calls, 0);
});

test("maps not found to tool code", async () => {
  const tool = createClientNoteTool(
    connectorThrowing(new CustomerNotFoundError("missing")),
  );

  assert.deepStrictEqual(
    await tool({
      clientId: "missing",
      text: "x",
      requestId: "req_2",
    }),
    {
      success: false,
      code: "CLIENT_NOT_FOUND",
    },
  );
});

test("maps idempotency conflict to tool code", async () => {
  const tool = createClientNoteTool(
    connectorThrowing(
      new CustomerIdempotencyConflictError(),
    ),
  );

  assert.deepStrictEqual(
    await tool({
      clientId: "8123",
      text: "different",
      requestId: "req_3",
    }),
    {
      success: false,
      code: "IDEMPOTENCY_CONFLICT",
    },
  );
});

test("maps transient system failure to tool code", async () => {
  const tool = createClientNoteTool(
    connectorThrowing(
      new CustomerSystemUnavailableError(),
    ),
  );

  assert.deepStrictEqual(
    await tool({
      clientId: "8123",
      text: "x",
      requestId: "req_4",
    }),
    {
      success: false,
      code: "CUSTOMER_SYSTEM_UNAVAILABLE",
    },
  );
});
