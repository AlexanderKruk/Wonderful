const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");

const {
  startFakeCustomerApi,
} = require("../fake-customer-api/server");
const {
  startWebhookServer,
} = require("../webhook-gateway/server");

let customerServer;
let webhookServer;
let webhookBaseUrl;
let getNoteCount;

before(async () => {
  const customer = await startFakeCustomerApi();
  customerServer = customer.server;
  getNoteCount = customer.getNoteCount;

  const webhook = await startWebhookServer({
    customerBaseUrl: customer.baseUrl,
  });

  webhookServer = webhook.server;
  webhookBaseUrl = webhook.baseUrl;
});

after(async () => {
  await Promise.all([
    closeServer(webhookServer),
    closeServer(customerServer),
  ]);
});

test("webhook reaches agent, tool, connector and customer API", async () => {
  const response = await postWebhook({
    eventId: "evt-get-1",
    message: "get client 8123",
  });

  assert.equal(response.status, 200);

  const body = await response.json();

  assert.equal(body.success, true);
  assert.equal(body.tool, "getClient");
  assert.equal(body.result.client.id, "8123");
});

test("duplicate write webhook event remains idempotent", async () => {
  const payload = {
    eventId: "evt-write-1",
    message: "add note 8123: Called customer",
  };

  const first = await postWebhook(payload);
  const second = await postWebhook(payload);

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);

  const firstBody = await first.json();
  const secondBody = await second.json();

  assert.equal(firstBody.success, true);
  assert.equal(secondBody.success, true);
  assert.equal(
    firstBody.result.note.id,
    secondBody.result.note.id,
  );
  assert.equal(getNoteCount("8123"), 1);
});

async function postWebhook(payload) {
  return fetch(`${webhookBaseUrl}/webhooks/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

async function closeServer(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
