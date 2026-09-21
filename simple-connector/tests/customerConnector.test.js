const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");

const { CustomerConnector } = require("../dist/connector/customerConnector");
const {
  CustomerNotFoundError,
  CustomerSystemUnavailableError,
  InvalidCustomerResponseError,
} = require("../dist/connector/errors");
const {
  startFakeCustomerApi,
} = require("../fake-customer-api/server");

let server;
let baseUrl;

before(async () => {
  const started = await startFakeCustomerApi();
  server = started.server;
  baseUrl = started.baseUrl;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
});

test("maps a customer-system response to Client", async () => {
  const connector = new CustomerConnector(baseUrl);

  const client = await connector.getClient("8123");

  assert.deepStrictEqual(client, {
    id: "8123",
    name: "Anna Nowak",
    email: "anna@example.com",
    status: "active",
  });
});

test("normalizes missing contact to null email", async () => {
  const connector = new CustomerConnector(baseUrl);

  const client = await connector.getClient("no-contact");

  assert.equal(client.email, null);
});

test("rejects an unknown customer status", async () => {
  const connector = new CustomerConnector(baseUrl);

  await assert.rejects(
    () => connector.getClient("unknown-status"),
    InvalidCustomerResponseError,
  );
});

test("reports a missing customer", async () => {
  const connector = new CustomerConnector(baseUrl);

  await assert.rejects(
    () => connector.getClient("missing"),
    CustomerNotFoundError,
  );
});

test("reports customer-system unavailability", async () => {
  const connector = new CustomerConnector(baseUrl);

  await assert.rejects(
    () => connector.getClient("system-down"),
    CustomerSystemUnavailableError,
  );
});
