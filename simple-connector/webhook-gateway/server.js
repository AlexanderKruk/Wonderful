const http = require("node:http");

const {
  DummyAgent,
} = require("../dist/agent/dummyAgent");
const {
  CustomerConnector,
} = require("../dist/connector/customerConnector");
const {
  handleMessageWebhook,
} = require("../dist/inbound/messageWebhook");
const {
  createClientNoteTool,
} = require("../dist/tools/createClientNoteTool");
const {
  createGetClientTool,
} = require("../dist/tools/getClientTool");

async function readJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const text = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(text);
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
  });
  res.end(JSON.stringify(body));
}

function createAgent(customerBaseUrl) {
  const connector = new CustomerConnector(customerBaseUrl, {
    accessToken: "secret-token",
  });

  return new DummyAgent({
    getClient: createGetClientTool(connector),
    createClientNote: createClientNoteTool(connector),
  });
}

function startWebhookServer({
  port = 0,
  customerBaseUrl = "http://127.0.0.1:3001",
} = {}) {
  const agent = createAgent(customerBaseUrl);

  const server = http.createServer(async (req, res) => {
    if (
      req.method !== "POST" ||
      req.url !== "/webhooks/messages"
    ) {
      sendJson(res, 404, {
        error: "not_found",
      });
      return;
    }

    let payload;

    try {
      payload = await readJsonBody(req);
    } catch {
      sendJson(res, 400, {
        error: "INVALID_JSON",
      });
      return;
    }

    const result = await handleMessageWebhook(
      agent,
      payload,
    );

    sendJson(res, result.status, result.body);
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);

    server.listen(port, "127.0.0.1", () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        reject(
          new Error("Could not determine webhook server port"),
        );
        return;
      }

      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`,
      });
    });
  });
}

module.exports = {
  startWebhookServer,
};

if (require.main === module) {
  startWebhookServer({
    port: 3000,
  })
    .then(({ baseUrl }) => {
      console.log(
        `Webhook gateway listening on ${baseUrl}/webhooks/messages`,
      );
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
