const http = require("node:http");

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

function startFakeCustomerApi(port = 0) {
  const requestCounts = new Map();

  const server = http.createServer((req, res) => {
    if (req.method !== "GET" || !req.url?.startsWith("/clients/")) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "not_found" }));
      return;
    }

    const clientId = decodeURIComponent(req.url.slice("/clients/".length));
    requestCounts.set(clientId, (requestCounts.get(clientId) ?? 0) + 1);

    if (clientId === "missing") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "client_not_found" }));
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
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "internal_error" }));
      return;
    }

    if (clientId === "system-down") {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "service_unavailable" }));
      return;
    }

    if (clientId === "flaky") {
      const count = requestCounts.get(clientId);

      if (count <= 2) {
        res.writeHead(503, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "temporary_failure" }));
        return;
      }
    }

    if (clientId === "slow") {
      setTimeout(() => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(buildClient(clientId)));
      }, 200);
      return;
    }

    if (clientId === "malformed-json") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end('{"client_no":"malformed-json"');
      return;
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(buildClient(clientId)));
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
      });
    });
  });
}

module.exports = { startFakeCustomerApi };

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
