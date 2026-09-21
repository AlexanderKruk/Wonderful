const test = require("node:test");
const assert = require("node:assert/strict");

const { CustomerConnector } = require("../dist/connector/customerConnector");
const {
  CustomerNotFoundError,
  CustomerSystemUnavailableError,
  InvalidCustomerResponseError,
} = require("../dist/connector/errors");

test("maps a customer-system response to Client", async () => {
  const connector = new CustomerConnector();

  const client = await connector.getClient("8123");

  assert.deepStrictEqual(client, {
    id: "8123",
    name: "Anna Nowak",
    email: "anna@example.com",
    status: "active",
  });
});

test("normalizes missing contact to null email", async () => {
  const connector = new CustomerConnector();

  const client = await connector.getClient("no-contact");

  assert.equal(client.email, null);
});

test("rejects an unknown customer status", async () => {
  const connector = new CustomerConnector();

  await assert.rejects(
    () => connector.getClient("unknown-status"),
    InvalidCustomerResponseError,
  );
});

test("reports a missing customer", async () => {
  const connector = new CustomerConnector();

  await assert.rejects(
    () => connector.getClient("missing"),
    CustomerNotFoundError,
  );
});

test("reports customer-system unavailability", async () => {
  const connector = new CustomerConnector();

  await assert.rejects(
    () => connector.getClient("system-down"),
    CustomerSystemUnavailableError,
  );
});
