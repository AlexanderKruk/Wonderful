import type {
  GetClientToolInput,
  GetClientToolResult,
} from "../tools/getClientTool";
import type {
  CreateClientNoteToolInput,
  CreateClientNoteToolResult,
} from "../tools/createClientNoteTool";

type GetClientTool = (
  input: GetClientToolInput,
) => Promise<GetClientToolResult>;

type CreateClientNoteTool = (
  input: CreateClientNoteToolInput,
) => Promise<CreateClientNoteToolResult>;

type DummyAgentTools = {
  getClient: GetClientTool;
  createClientNote: CreateClientNoteTool;
};

export type DummyAgentInput = {
  message: string;
  requestId: string;
};

export type DummyAgentResult =
  | {
      success: true;
      reply: string;
      tool: "getClient" | "createClientNote";
      result: GetClientToolResult | CreateClientNoteToolResult;
    }
  | {
      success: false;
      reply: string;
      tool?: "getClient" | "createClientNote";
      result?: GetClientToolResult | CreateClientNoteToolResult;
    };

type Decision =
  | {
      tool: "getClient";
      input: GetClientToolInput;
    }
  | {
      tool: "createClientNote";
      input: Omit<CreateClientNoteToolInput, "requestId">;
    }
  | {
      tool: "none";
    };

export class DummyAgent {
  constructor(private readonly tools: DummyAgentTools) {}

  async run(input: DummyAgentInput): Promise<DummyAgentResult> {
    const decision = this.decide(input.message);

    if (decision.tool === "none") {
      return {
        success: false,
        reply:
          "Dummy agent only understands: " +
          "'get client <id>' or 'add note <id>: <text>'.",
      };
    }

    if (decision.tool === "getClient") {
      const result = await this.tools.getClient(decision.input);

      return {
        success: result.success,
        reply: result.success
          ? `Found client ${result.client.name}.`
          : `getClient failed: ${result.code}`,
        tool: "getClient",
        result,
      };
    }

    const result = await this.tools.createClientNote({
      ...decision.input,
      requestId: input.requestId,
    });

    return {
      success: result.success,
      reply: result.success
        ? `Created note ${result.note.id}.`
        : `createClientNote failed: ${result.code}`,
      tool: "createClientNote",
      result,
    };
  }

  private decide(message: string): Decision {
    const trimmed = message.trim();

    const getClientMatch = trimmed.match(
      /^get\s+client\s+(\S+)$/i,
    );

    if (getClientMatch) {
      return {
        tool: "getClient",
        input: {
          clientId: getClientMatch[1],
        },
      };
    }

    const addNoteMatch = trimmed.match(
      /^add\s+note\s+(\S+)\s*:\s*(.+)$/i,
    );

    if (addNoteMatch) {
      return {
        tool: "createClientNote",
        input: {
          clientId: addNoteMatch[1],
          text: addNoteMatch[2],
        },
      };
    }

    return {
      tool: "none",
    };
  }
}
