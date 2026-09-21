import { CustomerConnector } from "./connector/customerConnector";

async function main(): Promise<void> {
  const connector = new CustomerConnector();
  const client = await connector.getClient("8123");

  console.log(client);
}

main();
