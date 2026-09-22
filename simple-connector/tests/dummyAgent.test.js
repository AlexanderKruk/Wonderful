const test = require("node:test");
const assert = require("node:assert/strict");

const {
  DummyAgent,
} = require("../dist/agent/dummyAgent");

test("dummy agent selects getClient tool", async () => {
  let receivedInput;

  const agent = new DummyAgent({
    async getClient(input) {
      receivedInput = input;
      return {
        success: true,
        client: {
          id: "8123",
          name: "Anna Nowak",
          email: "anna@example.com",
          status: "active",
        },
      };
    },
    async createClientNote() {
      throw new Error("wrong tool");
    },
  });

  const result = await agent.run({
    message: "get client 8123",
    requestId: "req-get-1",
  });

  assert.deepStrictEqual(receivedInput, {
    clientId: "8123",
  });
  assert.equal(result.success, true);
  assert.equal(result.tool, "getClient");
});

test("dummy agent selects createClientNote tool and forwards request id", async () => {
  let receivedInput;

  const agent = new DummyAgent({
    async getClient() {
      throw new Error("wrong tool");
    },
    async createClientNote(input) {
      receivedInput = input;
      return {
        success: true,
        note: {
          id: "note_1",
          clientId: "8123",
          text: "Called customer",
        },
      };
    },
  });

  const result = await agent.run({
    message: "add note 8123: Called customer",
    requestId: "agent-operation-1",
  });

  assert.deepStrictEqual(receivedInput, {
    clientId: "8123",
    text: "Called customer",
    requestId: "agent-operation-1",
  });
  assert.equal(result.success, true);
  assert.equal(result.tool, "createClientNote");
});

test("dummy agent returns tool failure as an agent result", async () => {
  const agent = new DummyAgent({
    async getClient() {
      return {
        success: false,
        code: "CLIENT_NOT_FOUND",
      };
    },
    async createClientNote() {
      throw new Error("wrong tool");
    },
  });

  const result = await agent.run({
    message: "get client missing",
    requestId: "req-missing",
  });

  assert.deepStrictEqual(result, {
    success: false,
    reply: "getClient failed: CLIENT_NOT_FOUND",
    tool: "getClient",
    result: {
      success: false,
      code: "CLIENT_NOT_FOUND",
    },
  });
});

test("dummy agent does not call tools for unknown requests", async () => {
  let calls = 0;

  const agent = new DummyAgent({
    async getClient() {
      calls += 1;
      throw new Error("should not be called");
    },
    async createClientNote() {
      calls += 1;
      throw new Error("should not be called");
    },
  });

  const result = await agent.run({
    message: "send an email",
    requestId: "req-unknown",
  });

  assert.equal(result.success, false);
  assert.equal(calls, 0);
});
