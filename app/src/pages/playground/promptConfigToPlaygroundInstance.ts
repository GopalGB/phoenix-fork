import { objectToInvocationParameters } from "@phoenix/pages/playground/invocationParameterUtils";
import { getChatRole } from "@phoenix/pages/playground/playgroundUtils";
import { readPromptInvocationParameters } from "@phoenix/pages/playground/PromptInvocationParametersReadableFragment";
import { fromPromptToolCallPart } from "@phoenix/schemas/toolCallSchemas";
import { generateMessageId, generateToolId } from "@phoenix/store/playground";
import type {
  ModelConfig,
  PlaygroundInstance,
} from "@phoenix/store/playground";
import { safelyStringifyJSON } from "@phoenix/utils/jsonUtils";
import {
  asTextPart,
  asToolCallPart,
  asToolResultPart,
} from "@phoenix/utils/promptUtils";

type PromptTemplateMessageLike = {
  role: string;
  content: readonly unknown[];
};

type PromptTemplateLike = {
  __typename: string;
  messages?: readonly PromptTemplateMessageLike[] | null;
};

type PromptToolChoiceLike = {
  type: "NONE" | "ZERO_OR_MORE" | "ONE_OR_MORE" | "SPECIFIC_FUNCTION";
  functionName?: string | null;
};

type PromptToolsLike = {
  tools: ReadonlyArray<{
    function: {
      name: string;
      description?: string | null;
      parameters?: unknown;
      strict?: boolean | null;
    };
  }>;
  toolChoice?: PromptToolChoiceLike | null;
} | null;

type PromptResponseFormatLike = {
  jsonSchema: {
    name: string;
    description?: string | null;
    schema?: unknown;
    strict?: boolean | null;
  };
} | null;

type PlaygroundChatTemplate = Extract<
  PlaygroundInstance["template"],
  { __type: "chat" }
>;

type PlaygroundInstanceFieldsFromPromptConfig = {
  model: PlaygroundInstance["model"];
  template: PlaygroundChatTemplate;
  tools: PlaygroundInstance["tools"];
  toolChoice: PlaygroundInstance["toolChoice"];
};

function promptToolChoiceToCanonicalToolChoice(
  rawToolChoice: PromptToolChoiceLike | null | undefined
): PlaygroundInstance["toolChoice"] {
  if (!rawToolChoice) {
    return undefined;
  }
  return {
    type: rawToolChoice.type,
    ...(rawToolChoice.functionName != null && {
      functionName: rawToolChoice.functionName,
    }),
  };
}

function promptToolsToPlaygroundTools(
  tools: PromptToolsLike
): PlaygroundInstance["tools"] {
  return (tools?.tools ?? []).map((tool) => ({
    id: generateToolId(),
    editorType: "json",
    definition: {
      name: tool.function.name,
      description: tool.function.description ?? null,
      parameters: tool.function.parameters,
      strict: tool.function.strict ?? null,
    },
  }));
}

function promptTemplateToPlaygroundMessages({
  template,
  provider,
}: {
  template: PromptTemplateLike;
  provider: ModelProvider;
}): PlaygroundChatTemplate["messages"] {
  const promptMessages = template.messages;
  if (!promptMessages) {
    return [];
  }
  return promptMessages.map((message) => {
    const textContent = message.content
      .map(asTextPart)
      .filter((part): part is NonNullable<typeof part> => part != null)
      .map((part) => part.text.text)
      .join("");
    const toolCallParts = message.content
      .map(asToolCallPart)
      .filter((part): part is NonNullable<typeof part> => part != null);
    const toolResultParts = message.content
      .map(asToolResultPart)
      .filter((part): part is NonNullable<typeof part> => part != null);
    const firstToolResultPart = toolResultParts.at(0);
    const role = getChatRole(message.role);

    if (role === "tool" && firstToolResultPart) {
      return {
        id: generateMessageId(),
        role,
        content:
          typeof firstToolResultPart.toolResult.result === "string"
            ? firstToolResultPart.toolResult.result
            : safelyStringifyJSON(
                firstToolResultPart.toolResult.result,
                null,
                2
              ).json || "",
        toolCallId: firstToolResultPart.toolResult.toolCallId,
      };
    }

    if (role === "ai" && toolCallParts.length > 0) {
      return {
        id: generateMessageId(),
        role,
        toolCalls: toolCallParts.map((toolCallPart) =>
          fromPromptToolCallPart(toolCallPart, provider)
        ),
      };
    }

    return {
      id: generateMessageId(),
      role,
      content: textContent,
    };
  });
}

export function buildPlaygroundInstanceFieldsFromPromptConfig({
  provider,
  modelName,
  template,
  tools,
  invocationParametersRef,
  responseFormat,
  customProvider = null,
  connectionFields = {},
}: {
  provider: ModelProvider;
  modelName: string;
  template: PromptTemplateLike;
  tools: PromptToolsLike;
  invocationParametersRef: Parameters<typeof readPromptInvocationParameters>[0];
  responseFormat: PromptResponseFormatLike;
  customProvider?: ModelConfig["customProvider"];
  connectionFields?: Partial<
    Pick<ModelConfig, "baseUrl" | "endpoint" | "region" | "openaiApiType">
  >;
}): PlaygroundInstanceFieldsFromPromptConfig {
  const rawInvocationParameters = readPromptInvocationParameters(
    invocationParametersRef
  );
  const invocationParameters = objectToInvocationParameters(
    rawInvocationParameters,
    provider
  );

  return {
    model: {
      modelName,
      provider,
      customProvider,
      responseFormat: responseFormat
        ? {
            type: "json_schema",
            jsonSchema: responseFormat.jsonSchema,
          }
        : null,
      invocationParameters,
      ...connectionFields,
    },
    template: {
      __type: "chat",
      messages: promptTemplateToPlaygroundMessages({ template, provider }),
    },
    tools: promptToolsToPlaygroundTools(tools),
    toolChoice: promptToolChoiceToCanonicalToolChoice(tools?.toolChoice),
  };
}
