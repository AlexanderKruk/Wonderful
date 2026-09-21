import { CustomerConnector } from "./connector/customerConnector";
import { createClientNoteTool } from "./tools/createClientNoteTool";
import { createGetClientTool } from "./tools/getClientTool";

async function main(): Promise<void> {
  const connector = new CustomerConnector(
    "http://127.0.0.1:3001",
    {
      accessToken: "secret-token",
    },
  );

  const getClientTool = createGetClientTool(connector);
  const createNoteTool = createClientNoteTool(connector);

  console.log(
    "get client:",
    await getClientTool({ clientId: "8123" }),
  );

  console.log(
    "create note:",
    await createNoteTool({
      clientId: "8123",
      text: "Called customer",
      requestId: "demo-request-1",
    }),
  );

  console.log(
    "same request again:",
    await createNoteTool({
      clientId: "8123",
      text: "Called customer",
      requestId: "demo-request-1",
    }),
  );
}

main();
