import { DummyAgent } from "./agent/dummyAgent";
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

  const agent = new DummyAgent({
    getClient: getClientTool,
    createClientNote: createNoteTool,
  });

  console.log(
    "agent get:",
    await agent.run({
      message: "get client 8123",
      requestId: "demo-get-1",
    }),
  );

  console.log(
    "agent write:",
    await agent.run({
      message: "add note 8123: Called customer",
      requestId: "demo-write-1",
    }),
  );

  console.log(
    "agent same write again:",
    await agent.run({
      message: "add note 8123: Called customer",
      requestId: "demo-write-1",
    }),
  );
}

main();
