import { CustomerConnector } from "./connector/customerConnector";
import { createGetClientTool } from "./tools/getClientTool";

async function main(): Promise<void> {
  const connector = new CustomerConnector(
    "http://127.0.0.1:3001",
    {
      accessToken: "secret-token",
    },
  );

  const getClientTool = createGetClientTool(connector);

  console.log(
    "8123:",
    await getClientTool({ clientId: "8123" }),
  );

  console.log(
    "missing:",
    await getClientTool({ clientId: "missing" }),
  );

  console.log(
    "unknown-status:",
    await getClientTool({ clientId: "unknown-status" }),
  );
}

main();
