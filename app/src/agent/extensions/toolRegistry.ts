import type { Chat } from "@ai-sdk/react";
import type { UIMessage } from "ai";

import {
  bashToolDefinition,
  getBashToolInput,
} from "@phoenix/agent/tools/bash";
import type { BashToolInput } from "@phoenix/agent/tools/bash";
/**
 * For the workflow to add, edit, or remove a frontend tool, see
 * `.agents/skills/phoenix-pxi/rules/extending-frontend-tool-registry.md`.
 */
import { handleBashToolCall } from "@phoenix/agent/tools/bash/handleBashToolCall";
import {
  elicitToolDefinition,
  parseElicitToolInput,
} from "@phoenix/agent/tools/elicit";
import type { ElicitToolInput } from "@phoenix/agent/tools/elicit";
import type { FrontendToolDefinition } from "@phoenix/agent/tools/types";
import type { AgentStore } from "@phoenix/store/agentStore";

import {
  getAgentCapabilityDefinition,
  type AgentCapabilities,
  type AgentCapabilityKey,
} from "./capabilities";

type AddToolOutput = Chat<UIMessage>["addToolOutput"];

/** Minimal tool-call shape produced by the AI SDK runtime. */
export type AgentToolCall = {
  toolCallId: string;
  toolName: string;
  input: unknown;
};

/** Shared execution context passed to each registered tool handler. */
type AgentToolHandlerContext<TInput> = {
  toolCall: AgentToolCall;
  input: TInput;
  sessionId: string | null;
  addToolOutput: AddToolOutput;
  agentStore: AgentStore;
  capabilities: AgentCapabilities;
};

/**
 * One frontend tool entry: schema exposed to the model, parser for raw input,
 * optional capability gates, and the implementation that handles the call.
 *
 * `isServerAdvertised` marks tools whose `ToolDefinition` is supplied by the
 * server (gated on resolved chat context) rather than sent in the chat
 * request body. The client still owns execution; only the advertisement
 * channel differs. These entries are excluded from `agentToolDefinitions`.
 */
type RegisteredAgentTool<TInput> = {
  definition: FrontendToolDefinition;
  parseInput: (input: unknown) => TInput | null;
  invalidInputErrorText: string;
  requiredCapabilities?: AgentCapabilityKey[];
  isServerAdvertised?: boolean;
  execute: (context: AgentToolHandlerContext<TInput>) => Promise<void>;
};

/** Helps TypeScript preserve the input type for each tool definition. */
function createRegisteredAgentTool<TInput>(
  tool: RegisteredAgentTool<TInput>
): RegisteredAgentTool<TInput> {
  return tool;
}

/** Bash runs in the browser sandbox and is gated by runtime capabilities. */
const bashAgentTool = createRegisteredAgentTool<BashToolInput>({
  definition: bashToolDefinition,
  parseInput: getBashToolInput,
  invalidInputErrorText: "Invalid bash tool input",
  execute: async ({
    toolCall,
    input,
    sessionId,
    addToolOutput,
    capabilities,
  }) => {
    await handleBashToolCall({
      toolCallId: toolCall.toolCallId,
      input,
      sessionId,
      addToolOutput,
      capabilities,
    });
  },
});

/** ask_user pauses tool execution until the user answers in the UI. */
const askUserAgentTool = createRegisteredAgentTool<ElicitToolInput>({
  definition: elicitToolDefinition,
  parseInput: parseElicitToolInput,
  invalidInputErrorText:
    "Invalid ask_user tool input. Expected { questions: ElicitationQuestion[] }.",
  execute: async ({
    toolCall,
    input,
    sessionId,
    addToolOutput,
    agentStore,
  }) => {
    if (!sessionId) {
      await addToolOutput({
        state: "output-error",
        tool: "ask_user",
        toolCallId: toolCall.toolCallId,
        errorText: "Cannot ask user questions without an active session.",
      });
      return;
    }

    agentStore.getState().setPendingElicitation(sessionId, {
      toolCallId: toolCall.toolCallId,
      questions: input.questions,
    });
  },
});

/**
 * Server-advertised, client-executed: the server owns the canonical schema
 * and description (see chat_tools/apply_span_filter_condition.py); this name
 * is the single source of truth for routing the call to the matching client
 * action registered by SpanFilterConditionField.
 */
export const APPLY_SPAN_FILTER_CONDITION_TOOL_NAME =
  "apply_span_filter_condition";

/**
 * Server-advertised, client-executed name for the spans-table root-vs-all
 * toggle. The server (see agents/tools/set_root_spans_only.py) owns the
 * canonical schema and gates advertisement on the `root_spans_only` UI
 * context being present; the matching client action is registered by
 * SpansTable while it is mounted.
 */
export const SET_ROOT_SPANS_ONLY_TOOL_NAME = "set_root_spans_only";

type ApplySpanFilterConditionInput = {
  condition: string;
};

// Mirrors the server-side schema in chat_tools/apply_span_filter_condition.py.
// The server is the source of truth advertised to the model; this copy exists
// so the description still reads correctly if it ever surfaces in synthesis,
// session summaries, or developer tooling.
const applySpanFilterConditionToolDefinition: FrontendToolDefinition = {
  name: APPLY_SPAN_FILTER_CONDITION_TOOL_NAME,
  description:
    "Apply a Phoenix span filter to the project span list to narrow the spans visible in the UI. " +
    "Examples: `span_kind == 'LLM'`, `status_code == 'ERROR' and latency_ms >= 5000`, " +
    "`'agent' in input.value`, `annotations['Hallucination'].label == 'hallucinated'`. " +
    "Pass an empty string to clear the filter. " +
    "This filter applies on top of the current root-vs-all-spans selection: " +
    "if you are looking for non-root spans (tool calls, retriever spans, " +
    "nested LLM calls, etc.), call `set_root_spans_only` with `false` first " +
    "so the filter has every span to match against.",
  parameters: {
    type: "object",
    properties: {
      condition: {
        type: "string",
        description:
          "The span filter DSL expression to apply. Pass an empty string to clear the filter.",
      },
    },
    required: ["condition"],
    additionalProperties: false,
  },
};

function parseApplySpanFilterConditionInput(
  input: unknown
): ApplySpanFilterConditionInput | null {
  if (typeof input !== "object" || input === null) return null;
  const candidate = input as { condition?: unknown };
  if (typeof candidate.condition !== "string") return null;
  return { condition: candidate.condition };
}

const applySpanFilterConditionAgentTool =
  createRegisteredAgentTool<ApplySpanFilterConditionInput>({
    definition: applySpanFilterConditionToolDefinition,
    parseInput: parseApplySpanFilterConditionInput,
    invalidInputErrorText: `Invalid ${APPLY_SPAN_FILTER_CONDITION_TOOL_NAME} input. Expected { condition: string }.`,
    isServerAdvertised: true,
    execute: async ({ toolCall, input, addToolOutput, agentStore }) => {
      const action =
        agentStore.getState().registeredClientActions[
          APPLY_SPAN_FILTER_CONDITION_TOOL_NAME
        ];
      if (!action) {
        await addToolOutput({
          state: "output-error",
          tool: APPLY_SPAN_FILTER_CONDITION_TOOL_NAME,
          toolCallId: toolCall.toolCallId,
          errorText:
            "The span filter field is not mounted on this page; cannot apply a filter.",
        });
        return;
      }
      const result = await action(input);
      if (result.ok) {
        await addToolOutput({
          state: "output-available",
          tool: APPLY_SPAN_FILTER_CONDITION_TOOL_NAME,
          toolCallId: toolCall.toolCallId,
          output: result.output ?? "Filter applied.",
        });
      } else {
        await addToolOutput({
          state: "output-error",
          tool: APPLY_SPAN_FILTER_CONDITION_TOOL_NAME,
          toolCallId: toolCall.toolCallId,
          errorText: result.error,
        });
      }
    },
  });

type SetRootSpansOnlyInput = {
  rootSpansOnly: boolean;
};

// Mirrors the server-side schema in agents/tools/set_root_spans_only.py. The
// server is the source of truth advertised to the model; this copy exists so
// the description still reads correctly if it ever surfaces in synthesis,
// session summaries, or developer tooling.
const setRootSpansOnlyToolDefinition: FrontendToolDefinition = {
  name: SET_ROOT_SPANS_ONLY_TOOL_NAME,
  description:
    "Toggle the spans table between root spans only and all spans. " +
    "Pass `true` to show only the top-level (root) span of each trace, or " +
    "`false` to show every span — set this to `false` when looking for spans " +
    "that are not roots (e.g. tool calls, retriever spans, or nested LLM " +
    "calls), since `apply_span_filter_condition` only filters within the " +
    "current root/all selection.",
  parameters: {
    type: "object",
    properties: {
      rootSpansOnly: {
        type: "boolean",
        description:
          "Whether the spans table should restrict to root spans (true) or include every span (false).",
      },
    },
    required: ["rootSpansOnly"],
    additionalProperties: false,
  },
};

function parseSetRootSpansOnlyInput(
  input: unknown
): SetRootSpansOnlyInput | null {
  if (typeof input !== "object" || input === null) return null;
  const candidate = input as { rootSpansOnly?: unknown };
  if (typeof candidate.rootSpansOnly !== "boolean") return null;
  return { rootSpansOnly: candidate.rootSpansOnly };
}

const setRootSpansOnlyAgentTool =
  createRegisteredAgentTool<SetRootSpansOnlyInput>({
    definition: setRootSpansOnlyToolDefinition,
    parseInput: parseSetRootSpansOnlyInput,
    invalidInputErrorText: `Invalid ${SET_ROOT_SPANS_ONLY_TOOL_NAME} input. Expected { rootSpansOnly: boolean }.`,
    isServerAdvertised: true,
    execute: async ({ toolCall, input, addToolOutput, agentStore }) => {
      const action =
        agentStore.getState().registeredClientActions[
          SET_ROOT_SPANS_ONLY_TOOL_NAME
        ];
      if (!action) {
        await addToolOutput({
          state: "output-error",
          tool: SET_ROOT_SPANS_ONLY_TOOL_NAME,
          toolCallId: toolCall.toolCallId,
          errorText:
            "The spans table is not mounted on this page; cannot toggle root vs all spans.",
        });
        return;
      }
      const result = await action(input);
      if (result.ok) {
        await addToolOutput({
          state: "output-available",
          tool: SET_ROOT_SPANS_ONLY_TOOL_NAME,
          toolCallId: toolCall.toolCallId,
          output:
            result.output ??
            (input.rootSpansOnly
              ? "Showing root spans only."
              : "Showing all spans."),
        });
      } else {
        await addToolOutput({
          state: "output-error",
          tool: SET_ROOT_SPANS_ONLY_TOOL_NAME,
          toolCallId: toolCall.toolCallId,
          errorText: result.error,
        });
      }
    },
  });

/** Ordered registry of all frontend-executable tools. */
const agentToolRegistry: RegisteredAgentTool<unknown>[] = [
  bashAgentTool as RegisteredAgentTool<unknown>,
  askUserAgentTool as RegisteredAgentTool<unknown>,
  applySpanFilterConditionAgentTool as RegisteredAgentTool<unknown>,
  setRootSpansOnlyAgentTool as RegisteredAgentTool<unknown>,
];

/** Fast lookup map for runtime tool dispatch by name. */
const agentToolRegistryByName = new Map<string, RegisteredAgentTool<unknown>>(
  agentToolRegistry.map((tool) => [tool.definition.name, tool])
);

function getMissingCapabilities({
  registeredTool,
  capabilities,
}: {
  registeredTool: RegisteredAgentTool<unknown>;
  capabilities: AgentCapabilities;
}): AgentCapabilityKey[] {
  return (
    registeredTool.requiredCapabilities?.filter(
      (capabilityKey: AgentCapabilityKey) => !capabilities[capabilityKey]
    ) ?? []
  );
}

function buildMissingCapabilitiesErrorText(
  missingCapabilities: AgentCapabilityKey[]
): string {
  return [
    "This tool call requires capabilities that are currently disabled:",
    ...missingCapabilities.map(
      (capabilityKey) =>
        `- ${getAgentCapabilityDefinition(capabilityKey).label}`
    ),
  ].join("\n");
}

/**
 * Tool schemas sent with every chat request. Server-advertised tools are
 * excluded — the server inserts their definitions itself based on resolved
 * chat context, and including them here would duplicate names.
 */
export const agentToolDefinitions = agentToolRegistry
  .filter((tool) => !tool.isServerAdvertised)
  .map((tool) => tool.definition);

/**
 * Validates and dispatches one tool call from the AI SDK runtime to the
 * matching frontend tool implementation.
 */
export async function handleRegisteredAgentToolCall({
  toolCall,
  sessionId,
  addToolOutput,
  agentStore,
}: {
  toolCall: AgentToolCall;
  sessionId: string | null;
  addToolOutput: AddToolOutput;
  agentStore: AgentStore;
}) {
  const registeredTool = agentToolRegistryByName.get(toolCall.toolName);

  if (!registeredTool) {
    await addToolOutput({
      state: "output-error",
      tool: toolCall.toolName,
      toolCallId: toolCall.toolCallId,
      errorText: `Unknown tool: ${toolCall.toolName}`,
    });
    return;
  }

  const input = registeredTool.parseInput(toolCall.input);

  if (input == null) {
    await addToolOutput({
      state: "output-error",
      tool: toolCall.toolName,
      toolCallId: toolCall.toolCallId,
      errorText: registeredTool.invalidInputErrorText,
    });
    return;
  }

  const capabilities = agentStore.getState().capabilities;
  const missingCapabilities = getMissingCapabilities({
    registeredTool,
    capabilities,
  });

  if (missingCapabilities.length > 0) {
    await addToolOutput({
      state: "output-error",
      tool: toolCall.toolName,
      toolCallId: toolCall.toolCallId,
      errorText: buildMissingCapabilitiesErrorText(missingCapabilities),
    });
    return;
  }

  await registeredTool.execute({
    toolCall,
    input,
    sessionId,
    addToolOutput,
    agentStore,
    capabilities,
  });
}
