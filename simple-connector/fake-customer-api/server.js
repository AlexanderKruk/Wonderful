const http = require("node:http");

const VALID_TOKEN = "secret-token";
const FORBIDDEN_TOKEN = "forbidden-token";

function buildClient(clientId) {
  if (clientId === "no-contact") {
    return {
      client_no: clientId,
      full_name: "Jan Kowalski",
      contact: null,
      status_code: "A",
    };
  }

  if (clientId === "unknown-status") {
    return {
      client_no: clientId,
      full_name: "Marta Zielinska",
      contact: {
        email_address: "marta@example.com",
      },
      status_code: "X",
    };
  }

  return {
    client_no: clientId,
    full_name: "Anna Nowak",
    contact: {
      email_address: "anna@example.com",
    },
    status_code: "A",
  };
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
  });
  res.end(JSON.stringify(body));
}

function isAuthorized(req, res) {
  const authorization = req.headers.authorization;

  if (!authorization || authorization === "Bearer wrong-token") {
    sendJson(res, 401, { error: "unauthorized" });
    return false;
  }

  if (authorization === `Bearer ${FORBIDDEN_TOKEN}`) {
    sendJson(res, 403, { error: "forbidden" });
    return false;
  }

  if (authorization !== `Bearer ${VALID_TOKEN}`) {
    sendJson(res, 401, { error: "unauthorized" });
    return false;
  }

  return true;
}

async function readJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const text = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(text);
}

function startFakeCustomerApi(port = 0) {
  const requestCounts = new Map();
  const notesByClient = new Map();
  const idempotencyRecords = new Map();
  let nextNoteId = 1;

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const getClientMatch = url.pathname.match(/^\/clients\/([^/]+)$/);
    const createNoteMatch = url.pathname.match(
      /^\/clients\/([^/]+)\/notes$/,
    );

    if (
      !(
        (req.method === "GET" && getClientMatch) ||
        (req.method === "POST" && createNoteMatch)
      )
    ) {
      sendJson(res, 404, { error: "not_found" });
      return;
    }

    const rawClientId =
      req.method === "GET"
        ? getClientMatch[1]
        : createNoteMatch[1];
    const clientId = decodeURIComponent(rawClientId);

    requestCounts.set(
      clientId,
      (requestCounts.get(clientId) ?? 0) + 1,
    );

    if (!isAuthorized(req, res)) {
      return;
    }

    if (req.method === "GET") {
      if (clientId === "missing") {
        sendJson(res, 404, { error: "client_not_found" });
        return;
      }

      if (clientId === "rate-limited") {
        res.writeHead(429, {
          "Content-Type": "application/json",
          "Retry-After": "2",
        });
        res.end(JSON.stringify({ error: "rate_limited" }));
        return;
      }

      if (clientId === "server-error") {
        sendJson(res, 500, { error: "internal_error" });
        return;
      }

      if (clientId === "system-down") {
        sendJson(res, 503, { error: "service_unavailable" });
        return;
      }

      if (clientId === "flaky") {
        const count = requestCounts.get(clientId);

        if (count <= 2) {
          sendJson(res, 503, { error: "temporary_failure" });
          return;
        }
      }

      if (clientId === "slow") {
        setTimeout(() => {
          sendJson(res, 200, buildClient(clientId));
        }, 200);
        return;
      }

      if (clientId === "malformed-json") {
        res.writeHead(200, {
          "Content-Type": "application/json",
        });
        res.end('{"client_no":"malformed-json"');
        return;
      }

      if (clientId === "invalid-shape") {
        sendJson(res, 200, {
          client_no: 123,
          full_name: null,
          contact: {
            email_address: 456,
          },
          status_code: "A",
        });
        return;
      }

      sendJson(res, 200, buildClient(clientId));
      return;
    }

    if (clientId === "missing") {
      sendJson(res, 404, { error: "client_not_found" });
      return;
    }

    const idempotencyKey = req.headers["idempotency-key"];

    if (
      typeof idempotencyKey !== "string" ||
      idempotencyKey.trim() === ""
    ) {
      sendJson(res, 400, {
        error: "idempotency_key_required",
      });
      return;
    }

    let body;

    try {
      body = await readJsonBody(req);
    } catch {
      sendJson(res, 400, { error: "invalid_json" });
      return;
    }

    if (
      !body ||
      typeof body !== "object" ||
      typeof body.text !== "string" ||
      body.text.trim() === ""
    ) {
      sendJson(res, 400, { error: "invalid_note" });
      return;
    }

    if (clientId === "write-malformed-json") {
      res.writeHead(201, {
        "Content-Type": "application/json",
      });
      res.end('{"note_id":"broken"');
      return;
    }

    if (clientId === "write-invalid-shape") {
      sendJson(res, 201, {
        note_id: 123,
        client_no: null,
        text: false,
      });
      return;
    }

    const existing = idempotencyRecords.get(idempotencyKey);

    if (existing) {
      if (
        existing.clientId !== clientId ||
        existing.text !== body.text
      ) {
        sendJson(res, 409, {
          error: "idempotency_conflict",
        });
        return;
      }

      sendJson(res, 201, existing.response);
      return;
    }

    const response = {
      note_id: `note_${nextNoteId}`,
      client_no: clientId,
      text: body.text,
    };
    nextNoteId += 1;

    const notes = notesByClient.get(clientId) ?? [];
    notes.push(response);
    notesByClient.set(clientId, notes);

    idempotencyRecords.set(idempotencyKey, {
      clientId,
      text: body.text,
      response,
    });

    if (body.text === "commit-then-drop") {
      req.socket.destroy();
      return;
    }

    sendJson(res, 201, response);
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        reject(new Error("Could not determine fake API port"));
        return;
      }

      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`,
        getRequestCount(clientId) {
          return requestCounts.get(clientId) ?? 0;
        },
        getNoteCount(clientId) {
          return (notesByClient.get(clientId) ?? []).length;
        },
      });
    });
  });
}

module.exports = {
  FORBIDDEN_TOKEN,
  VALID_TOKEN,
  startFakeCustomerApi,
};

if (require.main === module) {
  startFakeCustomerApi(3001)
    .then(({ baseUrl }) => {
      console.log(`Fake customer API listening on ${baseUrl}`);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
