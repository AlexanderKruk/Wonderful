const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");

const {
  CustomerConnector,
} = require("../dist/connector/customerConnector");
const {
  CustomerIdempotencyConflictError,
} = require("../dist/connector/errors");
const {
  VALID_TOKEN,
  startFakeCustomerApi,
} = require("../fake-customer-api/server");

let server;
let baseUrl;
let getRequestCount;
let getNoteCount;

before(async () => {
  const started = await startFakeCustomerApi();
  server = started.server;
  baseUrl = started.baseUrl;
  getRequestCount = started.getRequestCount;
  getNoteCount = started.getNoteCount;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
});

function createConnector(options = {}) {
  return new CustomerConnector(baseUrl, {
    accessToken: VALID_TOKEN,
    maxRetries: 1,
    retryBaseDelayMs: 5,
    ...options,
  });
}

test("creates a client note", async () => {
  const connector = createConnector();

  const note = await connector.createClientNote(
    "write-basic",
    "Called customer",
    "req-basic",
  );

  assert.deepStrictEqual(note, {
    id: "note_1",
    clientId: "write-basic",
    text: "Called customer",
  });
  assert.equal(getNoteCount("write-basic"), 1);
});

test("same idempotency key does not create a duplicate", async () => {
  const connector = createConnector();

  const first = await connector.createClientNote(
    "write-duplicate",
    "Same operation",
    "req-duplicate",
  );
  const second = await connector.createClientNote(
    "write-duplicate",
    "Same operation",
    "req-duplicate",
  );

  assert.deepStrictEqual(second, first);
  assert.equal(getNoteCount("write-duplicate"), 1);
  assert.equal(getRequestCount("write-duplicate"), 2);
});

test("retry after committed write and lost response stays idempotent", async () => {
  const connector = createConnector();

  const note = await connector.createClientNote(
    "write-lost-response",
    "commit-then-drop",
    "req-lost-response",
  );

  assert.equal(note.clientId, "write-lost-response");
  assert.equal(note.text, "commit-then-drop");
  assert.equal(getRequestCount("write-lost-response"), 2);
  assert.equal(getNoteCount("write-lost-response"), 1);
});

test("reusing an idempotency key for a different payload is a conflict", async () => {
  const connector = createConnector();

  await connector.createClientNote(
    "write-conflict",
    "First value",
    "req-conflict",
  );

  await assert.rejects(
    () =>
      connector.createClientNote(
        "write-conflict",
        "Different value",
        "req-conflict",
      ),
    CustomerIdempotencyConflictError,
  );

  assert.equal(getNoteCount("write-conflict"), 1);
});
