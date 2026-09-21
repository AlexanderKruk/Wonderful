import { CustomerConnector } from "./connector/customerConnector";

async function showClient(
  connector: CustomerConnector,
  clientId: string,
): Promise<void> {
  try {
    const client = await connector.getClient(clientId);
    console.log(`${clientId}:`, client);
  } catch (error) {
    console.error(
      `${clientId}:`,
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : error,
    );
  }
}

async function main(): Promise<void> {
  const connector = new CustomerConnector("http://127.0.0.1:3001");

  await showClient(connector, "8123");
  await showClient(connector, "no-contact");
  await showClient(connector, "unknown-status");
  await showClient(connector, "missing");
  await showClient(connector, "system-down");
}

main();
