const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");

const { CustomerConnector } = require("../dist/connector/customerConnector");
const {
  CustomerAuthenticationError,
  CustomerAuthorizationError,
  CustomerNotFoundError,
  CustomerSystemUnavailableError,
  InvalidCustomerResponseError,
} = require("../dist/connector/errors");
const {
  FORBIDDEN_TOKEN,
  VALID_TOKEN,
  startFakeCustomerApi,
} = require("../fake-customer-api/server");

let server;
let baseUrl;
let getRequestCount;

function createConnector(options = {}) {
  return new CustomerConnector(baseUrl, {
    accessToken: VALID_TOKEN,
    ...options,
  });
}

before(async () => {
  const started = await startFakeCustomerApi();
  server = started.server;
  baseUrl = started.baseUrl;
  getRequestCount = started.getRequestCount;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
});

test("authenticates with a valid bearer token", async () => {
  const connector = createConnector();

  const client = await connector.getClient("8123");

  assert.equal(client.id, "8123");
});

test("maps missing or invalid token to authentication error without retry", async () => {
  const connector = new CustomerConnector(baseUrl, {
    accessToken: "wrong-token",
  });

  await assert.rejects(
    () => connector.getClient("auth-failure"),
    CustomerAuthenticationError,
  );

  assert.equal(getRequestCount("auth-failure"), 1);
});

test("maps valid token without permission to authorization error without retry", async () => {
  const connector = new CustomerConnector(baseUrl, {
    accessToken: FORBIDDEN_TOKEN,
  });

  await assert.rejects(
    () => connector.getClient("forbidden"),
    CustomerAuthorizationError,
  );

  assert.equal(getRequestCount("forbidden"), 1);
});

test("maps a customer-system response to Client", async () => {
  const connector = createConnector();

  const client = await connector.getClient("8123");

  assert.deepStrictEqual(client, {
    id: "8123",
    name: "Anna Nowak",
    email: "anna@example.com",
    status: "active",
  });
});

test("normalizes missing contact to null email", async () => {
  const connector = createConnector();

  const client = await connector.getClient("no-contact");

  assert.equal(client.email, null);
});

test("rejects an unknown customer status", async () => {
  const connector = createConnector();

  await assert.rejects(
    () => connector.getClient("unknown-status"),
    InvalidCustomerResponseError,
  );
});

test("reports a missing customer without retrying", async () => {
  const connector = createConnector();

  await assert.rejects(
    () => connector.getClient("missing"),
    CustomerNotFoundError,
  );

  assert.equal(getRequestCount("missing"), 1);
});

test("maps HTTP 429 to customer-system unavailability", async () => {
  const connector = createConnector();

  await assert.rejects(
    () => connector.getClient("rate-limited"),
    CustomerSystemUnavailableError,
  );
});

test("maps HTTP 500 to customer-system unavailability", async () => {
  const connector = createConnector();

  await assert.rejects(
    () => connector.getClient("server-error"),
    CustomerSystemUnavailableError,
  );
});

test("maps HTTP 503 to customer-system unavailability", async () => {
  const connector = createConnector();

  await assert.rejects(
    () => connector.getClient("system-down"),
    CustomerSystemUnavailableError,
  );
});

test("retries transient failures and eventually succeeds", async () => {
  const connector = createConnector({
    maxRetries: 2,
    retryBaseDelayMs: 5,
  });

  const client = await connector.getClient("flaky");

  assert.equal(client.id, "flaky");
  assert.equal(getRequestCount("flaky"), 3);
});

test("times out slow requests and retries only up to the limit", async () => {
  const connector = createConnector({
    timeoutMs: 30,
    maxRetries: 1,
    retryBaseDelayMs: 5,
  });

  await assert.rejects(
    () => connector.getClient("slow"),
    CustomerSystemUnavailableError,
  );

  assert.equal(getRequestCount("slow"), 2);
});

test("rejects malformed JSON from the customer system", async () => {
  const connector = createConnector();

  await assert.rejects(
    () => connector.getClient("malformed-json"),
    InvalidCustomerResponseError,
  );
});

test("rejects valid JSON with an invalid response shape", async () => {
  const connector = createConnector();

  await assert.rejects(
    () => connector.getClient("invalid-shape"),
    InvalidCustomerResponseError,
  );

  assert.equal(getRequestCount("invalid-shape"), 1);
});

test("maps network failures to customer-system unavailability", async () => {
  const connector = new CustomerConnector("http://127.0.0.1:65534", {
    accessToken: VALID_TOKEN,
    maxRetries: 1,
    retryBaseDelayMs: 5,
  });

  await assert.rejects(
    () => connector.getClient("8123"),
    CustomerSystemUnavailableError,
  );
});
