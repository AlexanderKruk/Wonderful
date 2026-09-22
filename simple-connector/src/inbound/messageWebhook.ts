import type {
  DummyAgent,
  DummyAgentResult,
} from "../agent/dummyAgent";

type AgentRunner = Pick<DummyAgent, "run">;

export type MessageWebhookResult =
  | {
      status: 200;
      body: DummyAgentResult;
    }
  | {
      status: 400;
      body: {
        error: "INVALID_WEBHOOK";
      };
    };

export async function handleMessageWebhook(
  agent: AgentRunner,
  payload: unknown,
): Promise<MessageWebhookResult> {
  if (!isRecord(payload)) {
    return invalidWebhook();
  }

  const eventId = payload.eventId;
  const message = payload.message;

  if (
    typeof eventId !== "string" ||
    eventId.trim() === "" ||
    typeof message !== "string" ||
    message.trim() === ""
  ) {
    return invalidWebhook();
  }

  const result = await agent.run({
    message,
    requestId: eventId,
  });

  return {
    status: 200,
    body: result,
  };
}

function invalidWebhook(): MessageWebhookResult {
  return {
    status: 400,
    body: {
      error: "INVALID_WEBHOOK",
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}
