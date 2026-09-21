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
  const server = http.createServer((req, res) => {
    if (req.method !== "GET" || !req.url?.startsWith("/clients/")) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "not_found" }));
      return;
    }

    const clientId = decodeURIComponent(req.url.slice("/clients/".length));

    if (clientId === "missing") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "client_not_found" }));
      return;
    }

    if (clientId === "system-down") {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "service_unavailable" }));
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
