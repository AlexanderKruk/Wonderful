const test = require("node:test");
const assert = require("node:assert/strict");

const {
  handleMessageWebhook,
} = require("../dist/inbound/messageWebhook");

test("webhook forwards message and event id to agent", async () => {
  let received;

  const result = await handleMessageWebhook(
    {
      async run(input) {
        received = input;
        return {
          success: true,
          reply: "ok",
        };
      },
    },
    {
      eventId: "evt-123",
      message: "get client 8123",
    },
  );

  assert.deepStrictEqual(received, {
    message: "get client 8123",
    requestId: "evt-123",
  });

  assert.equal(result.status, 200);
});

test("webhook rejects invalid payload", async () => {
  const result = await handleMessageWebhook(
    {
      async run() {
        throw new Error("should not be called");
      },
    },
    {
      eventId: "",
      message: "get client 8123",
    },
  );

  assert.deepStrictEqual(result, {
    status: 400,
    body: {
      error: "INVALID_WEBHOOK",
    },
  });
});
