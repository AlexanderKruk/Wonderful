import { CustomerConnector } from "./connector/customerConnector";

async function main(): Promise<void> {
  const connector = new CustomerConnector();

  const normalClient = await connector.getClient("8123");
  console.log("normal:", normalClient);

  const clientWithoutContact = await connector.getClient("no-contact");
  console.log("no-contact:", clientWithoutContact);

  try {
    await connector.getClient("unknown-status");
  } catch (error) {
    console.error(
      "unknown-status:",
      error instanceof Error ? error.message : error,
    );
  }
}

main();
