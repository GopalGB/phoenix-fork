import type {
  ChatPromptVersionInput,
  OpenAIReasoningEffort,
  PromptAnthropicThinkingConfigInput,
} from "@phoenix/pages/playground/__generated__/UpsertPromptFromTemplateDialogCreateMutation.graphql";
import {
  getInvocationFamilyForProvider,
  InvocationFamily,
} from "@phoenix/pages/playground/invocationParameterSpecs";
import {
  parseOpenAIReasoningEffort,
  toOpenAIReasoningEffortFormValue,
} from "@phoenix/pages/playground/openAIReasoningEffort";

type FlatInvocationParameters = Record<string, unknown>;

export type PromptInvocationParametersReadableData = {
  readonly __typename: string;
  readonly temperature?: number | null;
  readonly openaiMaxTokens?: number | null;
  readonly maxCompletionTokens?: number | null;
  readonly frequencyPenalty?: number | null;
  readonly presencePenalty?: number | null;
  readonly topP?: number | null;
  readonly seed?: number | null;
  readonly reasoningEffort?: OpenAIReasoningEffort | null;
  readonly anthropicMaxTokens?: number | null;
  readonly stopSequences?: readonly string[] | null;
  readonly thinking?:
    | {
        readonly __typename: "PromptAnthropicThinkingDisabled";
        readonly disabled: boolean;
      }
    | {
        readonly __typename: "PromptAnthropicThinkingEnabled";
        readonly budgetTokens: number;
      }
    | null;
  readonly maxOutputTokens?: number | null;
  readonly awsMaxTokens?: number | null;
  readonly topK?: number | null;
};

type PromptInvocationUnionTypename =
  | "PromptOpenAIInvocationParameters"
  | "PromptAnthropicInvocationParameters"
  | "PromptGoogleInvocationParameters"
  | "PromptAwsInvocationParameters";

function pickNumber(
  flat: FlatInvocationParameters,
  ...keys: string[]
): number | undefined {
  for (const key of keys) {
    const value = flat[key];
    if (typeof value === "number") {
      return value;
    }
  }
  return undefined;
}

function pickString(
  flat: FlatInvocationParameters,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = flat[key];
    if (typeof value === "string") {
      return value;
    }
  }
  return undefined;
}

function pickStringList(
  flat: FlatInvocationParameters,
  ...keys: string[]
): string[] | undefined {
  for (const key of keys) {
    const value = flat[key];
    if (
      Array.isArray(value) &&
      value.every((entry) => typeof entry === "string")
    ) {
      return value as string[];
    }
  }
  return undefined;
}

function pickRecord(
  flat: FlatInvocationParameters,
  ...keys: string[]
): Record<string, unknown> | undefined {
  for (const key of keys) {
    const value = flat[key];
    if (value != null && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }
  return undefined;
}

function pickOpenAIReasoningEffort(
  flat: FlatInvocationParameters,
  ...keys: string[]
): OpenAIReasoningEffort | undefined {
  const value = pickString(flat, ...keys);
  if (value == null) {
    return undefined;
  }
  return parseOpenAIReasoningEffort(value);
}

function readOpenAIReasoningEffort(value: unknown): string | undefined {
  return toOpenAIReasoningEffortFormValue(value);
}

function writeOpenAIInvocationParameters(
  flat: FlatInvocationParameters
): ChatPromptVersionInput["invocationParameters"] {
  return {
    openai: {
      temperature: pickNumber(flat, "temperature"),
      maxTokens: pickNumber(flat, "max_tokens", "maxTokens"),
      maxCompletionTokens: pickNumber(
        flat,
        "max_completion_tokens",
        "maxCompletionTokens"
      ),
      frequencyPenalty: pickNumber(
        flat,
        "frequency_penalty",
        "frequencyPenalty"
      ),
      presencePenalty: pickNumber(flat, "presence_penalty", "presencePenalty"),
      topP: pickNumber(flat, "top_p", "topP"),
      seed: pickNumber(flat, "seed"),
      reasoningEffort: pickOpenAIReasoningEffort(
        flat,
        "reasoning_effort",
        "reasoningEffort"
      ),
    },
  };
}

function writeAnthropicInvocationParameters(
  flat: FlatInvocationParameters
): ChatPromptVersionInput["invocationParameters"] {
  const maxTokens = pickNumber(flat, "max_tokens", "maxTokens");
  if (maxTokens == null) {
    throw new Error("Anthropic invocation parameters require max_tokens");
  }
  const thinkingRaw = pickRecord(flat, "thinking");
  let thinking: PromptAnthropicThinkingConfigInput | undefined;
  if (thinkingRaw) {
    const thinkingType = pickString(thinkingRaw, "type");
    if (thinkingType === "disabled") {
      thinking = { disabled: { disabled: true } };
    } else if (thinkingType === "enabled") {
      const budgetTokens = pickNumber(
        thinkingRaw,
        "budget_tokens",
        "budgetTokens"
      );
      if (budgetTokens == null) {
        throw new Error("enabled thinking requires budget_tokens");
      }
      thinking = {
        enabled: {
          budgetTokens,
        },
      };
    }
  }
  return {
    anthropic: {
      maxTokens,
      temperature: pickNumber(flat, "temperature"),
      topP: pickNumber(flat, "top_p", "topP"),
      stopSequences: pickStringList(flat, "stop_sequences", "stopSequences"),
      thinking,
    },
  };
}

function writeGoogleInvocationParameters(
  flat: FlatInvocationParameters
): ChatPromptVersionInput["invocationParameters"] {
  return {
    google: {
      temperature: pickNumber(flat, "temperature"),
      maxOutputTokens: pickNumber(flat, "max_output_tokens", "maxOutputTokens"),
      stopSequences: pickStringList(flat, "stop_sequences", "stopSequences"),
      presencePenalty: pickNumber(flat, "presence_penalty", "presencePenalty"),
      frequencyPenalty: pickNumber(
        flat,
        "frequency_penalty",
        "frequencyPenalty"
      ),
      topP: pickNumber(flat, "top_p", "topP"),
      topK: pickNumber(flat, "top_k", "topK"),
    },
  };
}

function writeAwsInvocationParameters(
  flat: FlatInvocationParameters
): ChatPromptVersionInput["invocationParameters"] {
  return {
    aws: {
      maxTokens: pickNumber(flat, "max_tokens", "maxTokens"),
      temperature: pickNumber(flat, "temperature"),
      topP: pickNumber(flat, "top_p", "topP"),
    },
  };
}

const WRITE_CODEC_BY_INVOCATION_FAMILY: Record<
  InvocationFamily,
  (
    flat: FlatInvocationParameters
  ) => ChatPromptVersionInput["invocationParameters"]
> = {
  [InvocationFamily.OPENAI]: writeOpenAIInvocationParameters,
  [InvocationFamily.ANTHROPIC]: writeAnthropicInvocationParameters,
  [InvocationFamily.GOOGLE_GENAI]: writeGoogleInvocationParameters,
  [InvocationFamily.AWS_BEDROCK]: writeAwsInvocationParameters,
};

type PromptInvocationReadCodec = (
  data: PromptInvocationParametersReadableData
) => FlatInvocationParameters;

const READ_CODEC_BY_TYPENAME: Record<
  PromptInvocationUnionTypename,
  PromptInvocationReadCodec
> = {
  PromptOpenAIInvocationParameters: (data) => {
    const out: FlatInvocationParameters = {};
    if (data.temperature != null) {
      out.temperature = data.temperature;
    }
    if (data.openaiMaxTokens != null) {
      out.max_tokens = data.openaiMaxTokens;
    }
    if (data.maxCompletionTokens != null) {
      out.max_completion_tokens = data.maxCompletionTokens;
    }
    if (data.frequencyPenalty != null) {
      out.frequency_penalty = data.frequencyPenalty;
    }
    if (data.presencePenalty != null) {
      out.presence_penalty = data.presencePenalty;
    }
    if (data.topP != null) {
      out.top_p = data.topP;
    }
    if (data.seed != null) {
      out.seed = data.seed;
    }
    const reasoningEffort = readOpenAIReasoningEffort(data.reasoningEffort);
    if (reasoningEffort != null) {
      out.reasoning_effort = reasoningEffort;
    }
    return out;
  },
  PromptAnthropicInvocationParameters: (data) => {
    const out: FlatInvocationParameters = {};
    if (data.anthropicMaxTokens != null) {
      out.max_tokens = data.anthropicMaxTokens;
    }
    if (data.temperature != null) {
      out.temperature = data.temperature;
    }
    if (data.topP != null) {
      out.top_p = data.topP;
    }
    if (data.stopSequences != null) {
      out.stop_sequences = [...data.stopSequences];
    }
    if (data.thinking) {
      if (data.thinking.__typename === "PromptAnthropicThinkingDisabled") {
        out.thinking = { type: "disabled" };
      } else if (
        data.thinking.__typename === "PromptAnthropicThinkingEnabled"
      ) {
        out.thinking = {
          type: "enabled",
          budget_tokens: data.thinking.budgetTokens,
        };
      }
    }
    return out;
  },
  PromptGoogleInvocationParameters: (data) => {
    const out: FlatInvocationParameters = {};
    if (data.temperature != null) {
      out.temperature = data.temperature;
    }
    if (data.maxOutputTokens != null) {
      out.max_output_tokens = data.maxOutputTokens;
    }
    if (data.stopSequences != null) {
      out.stop_sequences = [...data.stopSequences];
    }
    if (data.presencePenalty != null) {
      out.presence_penalty = data.presencePenalty;
    }
    if (data.frequencyPenalty != null) {
      out.frequency_penalty = data.frequencyPenalty;
    }
    if (data.topP != null) {
      out.top_p = data.topP;
    }
    if (data.topK != null) {
      out.top_k = data.topK;
    }
    return out;
  },
  PromptAwsInvocationParameters: (data) => {
    const out: FlatInvocationParameters = {};
    if (data.awsMaxTokens != null) {
      out.max_tokens = data.awsMaxTokens;
    }
    if (data.temperature != null) {
      out.temperature = data.temperature;
    }
    if (data.topP != null) {
      out.top_p = data.topP;
    }
    return out;
  },
};

function isKnownPromptInvocationTypename(
  typename: string
): typename is PromptInvocationUnionTypename {
  return typename in READ_CODEC_BY_TYPENAME;
}

export function readPromptInvocationParametersUnion(
  data: PromptInvocationParametersReadableData
): FlatInvocationParameters {
  if (!isKnownPromptInvocationTypename(data.__typename)) {
    throw new Error(
      `Unsupported prompt invocation parameters typename: ${data.__typename}`
    );
  }
  return READ_CODEC_BY_TYPENAME[data.__typename](data);
}

export function writePromptInvocationParametersMutationInput(
  flat: FlatInvocationParameters,
  provider: ModelProvider
): ChatPromptVersionInput["invocationParameters"] {
  const family = getInvocationFamilyForProvider(provider);
  return WRITE_CODEC_BY_INVOCATION_FAMILY[family](flat);
}
