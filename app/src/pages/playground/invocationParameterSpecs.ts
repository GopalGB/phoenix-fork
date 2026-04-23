/**
 * Frontend-owned invocation parameter metadata (labels, bounds, widget kinds).
 *
 * Architecture (four layers): **form-store** (this module + `InvocationParametersFormFields`)
 * holds flat `InvocationParameterInput` rows keyed by `name`. **GraphQL wire** uses
 * `toPromptInvocationParametersMutationInput` / `flattenPromptInvocationParametersRead`.
 * **Pydantic** persistence lives in `src/phoenix/db/types/prompts.py`. **SDK kwargs**
 * are built in `src/phoenix/server/api/helpers/playground_clients.py` (Phase 5:
 * `invocation_translators.py`). Boundaries are related by small translators, not
 * structural identity — see `.scratch/plans/invocation-parameters-overhaul.md`.
 */

import { DEFAULT_OPENAI_API_TYPE } from "@phoenix/constants/generativeConstants";
import type { ModelConfig } from "@phoenix/store/playground";
import { assertUnreachable } from "@phoenix/typeUtils";

import type { CanonicalParameterName } from "./invocationParameterUtils";

export const InvocationFamily = {
  OPENAI: "openai",
  ANTHROPIC: "anthropic",
  GOOGLE_GENAI: "google_genai",
  AWS_BEDROCK: "aws_bedrock",
} as const;
export type InvocationFamily =
  (typeof InvocationFamily)[keyof typeof InvocationFamily];

export function getInvocationFamilyForProvider(
  provider: ModelProvider
): InvocationFamily {
  switch (provider) {
    case "OPENAI":
    case "AZURE_OPENAI":
    case "DEEPSEEK":
    case "XAI":
    case "OLLAMA":
    case "CEREBRAS":
    case "FIREWORKS":
    case "GROQ":
    case "MOONSHOT":
    case "PERPLEXITY":
    case "TOGETHER":
      return InvocationFamily.OPENAI;
    case "ANTHROPIC":
      return InvocationFamily.ANTHROPIC;
    case "GOOGLE":
      return InvocationFamily.GOOGLE_GENAI;
    case "AWS":
      return InvocationFamily.AWS_BEDROCK;
  }
  return assertUnreachable(provider);
}

type CommonSpec = {
  name: string;
  wirePath?: string;
  label: string;
  required?: boolean;
  ui?: "anthropic_thinking";
  applicableOpenAIApiTypes?: readonly ("CHAT_COMPLETIONS" | "RESPONSES")[];
  /** Optional default merged when syncing specs (server defaults formerly came from GraphQL). */
  defaultValue?: unknown;
  canonicalName?: CanonicalParameterName;
};

export type ParamSpec =
  | (CommonSpec & { type: "int"; min?: number; max?: number })
  | (CommonSpec & {
      type: "float" | "bounded_float";
      min?: number;
      max?: number;
    })
  | (CommonSpec & { type: "string" })
  | (CommonSpec & { type: "bool" })
  | (CommonSpec & { type: "string_list" })
  | (CommonSpec & { type: "json" })
  | (CommonSpec & {
      type: "enum";
      values: readonly string[];
      labels?: Readonly<Record<string, string>>;
    });

export const OPENAI_INVOCATION_PARAMETERS = [
  {
    name: "temperature",
    type: "bounded_float",
    min: 0,
    max: 2,
    label: "Temperature",
    canonicalName: "TEMPERATURE",
  },
  {
    name: "top_p",
    type: "bounded_float",
    min: 0,
    max: 1,
    label: "Top P",
    canonicalName: "TOP_P",
  },
  {
    name: "max_completion_tokens",
    type: "int",
    label: "Max Completion Tokens",
    canonicalName: "MAX_COMPLETION_TOKENS",
  },
  {
    name: "frequency_penalty",
    type: "bounded_float",
    min: -2,
    max: 2,
    label: "Frequency Penalty",
    defaultValue: 0,
    applicableOpenAIApiTypes: ["CHAT_COMPLETIONS"] as const,
  },
  {
    name: "presence_penalty",
    type: "bounded_float",
    min: -2,
    max: 2,
    label: "Presence Penalty",
    defaultValue: 0,
    applicableOpenAIApiTypes: ["CHAT_COMPLETIONS"] as const,
  },
  {
    name: "reasoning_effort",
    type: "enum",
    values: ["none", "minimal", "low", "medium", "high", "xhigh"] as const,
    label: "Reasoning Effort",
    canonicalName: "REASONING_EFFORT",
  },
  {
    name: "seed",
    type: "int",
    label: "Seed",
    canonicalName: "RANDOM_SEED",
  },
] as const satisfies readonly ParamSpec[];

export const ANTHROPIC_INVOCATION_PARAMETERS = [
  {
    name: "max_tokens",
    type: "int",
    label: "Max Tokens",
    required: true,
    defaultValue: 1024,
    canonicalName: "MAX_COMPLETION_TOKENS",
  },
  {
    name: "temperature",
    type: "bounded_float",
    min: 0,
    max: 1,
    label: "Temperature",
    defaultValue: 1,
    canonicalName: "TEMPERATURE",
  },
  {
    name: "stop_sequences",
    type: "string_list",
    label: "Stop Sequences",
    canonicalName: "STOP_SEQUENCES",
  },
  {
    name: "top_p",
    type: "bounded_float",
    min: 0,
    max: 1,
    label: "Top P",
    canonicalName: "TOP_P",
  },
  {
    name: "thinking",
    type: "json",
    label: "Thinking",
    ui: "anthropic_thinking",
    canonicalName: "ANTHROPIC_EXTENDED_THINKING",
  },
] as const satisfies readonly ParamSpec[];

export const GOOGLE_INVOCATION_PARAMETERS = [
  {
    name: "temperature",
    type: "bounded_float",
    min: 0,
    max: 2,
    label: "Temperature",
    defaultValue: 1,
    canonicalName: "TEMPERATURE",
  },
  {
    name: "max_output_tokens",
    type: "int",
    label: "Max Output Tokens",
    canonicalName: "MAX_COMPLETION_TOKENS",
  },
  {
    name: "stop_sequences",
    type: "string_list",
    label: "Stop Sequences",
    canonicalName: "STOP_SEQUENCES",
  },
  {
    name: "presence_penalty",
    type: "float",
    label: "Presence Penalty",
    defaultValue: 0,
  },
  {
    name: "frequency_penalty",
    type: "float",
    label: "Frequency Penalty",
    defaultValue: 0,
  },
  {
    name: "top_p",
    type: "bounded_float",
    min: 0,
    max: 1,
    label: "Top P",
    canonicalName: "TOP_P",
  },
  {
    name: "top_k",
    type: "int",
    label: "Top K",
  },
] as const satisfies readonly ParamSpec[];

export const AWS_INVOCATION_PARAMETERS = [
  {
    name: "max_tokens",
    type: "int",
    label: "Max Tokens",
    defaultValue: 1024,
    canonicalName: "MAX_COMPLETION_TOKENS",
  },
  {
    name: "temperature",
    type: "bounded_float",
    min: 0,
    max: 1,
    label: "Temperature",
    defaultValue: 1,
    canonicalName: "TEMPERATURE",
  },
  {
    name: "top_p",
    type: "bounded_float",
    min: 0,
    max: 1,
    label: "Top P",
    canonicalName: "TOP_P",
  },
] as const satisfies readonly ParamSpec[];

export const INVOCATION_PARAMETERS: Record<
  InvocationFamily,
  readonly ParamSpec[]
> = {
  [InvocationFamily.OPENAI]: OPENAI_INVOCATION_PARAMETERS,
  [InvocationFamily.ANTHROPIC]: ANTHROPIC_INVOCATION_PARAMETERS,
  [InvocationFamily.GOOGLE_GENAI]: GOOGLE_INVOCATION_PARAMETERS,
  [InvocationFamily.AWS_BEDROCK]: AWS_INVOCATION_PARAMETERS,
};

export function getSpecsForFamily<F extends InvocationFamily>(
  family: F
): (typeof INVOCATION_PARAMETERS)[F] {
  return INVOCATION_PARAMETERS[family];
}

/**
 * Specs applicable to the current playground model (filters OpenAI family by API type).
 */
export function getActiveSpecsForPlayground(
  model: Pick<ModelConfig, "provider" | "openaiApiType">
): readonly ParamSpec[] {
  const family = getInvocationFamilyForProvider(model.provider);
  const specs = [...INVOCATION_PARAMETERS[family]];
  if (family !== InvocationFamily.OPENAI) {
    return specs;
  }
  const api = model.openaiApiType ?? DEFAULT_OPENAI_API_TYPE;
  return specs.filter((s) => {
    if (!("applicableOpenAIApiTypes" in s) || !s.applicableOpenAIApiTypes) {
      return true;
    }
    return s.applicableOpenAIApiTypes.includes(api);
  });
}

/** Map wire / persisted nested keys onto flat spec `name` keys for object hydration. */
export function expandNestedInvocationKeys(
  family: InvocationFamily,
  flat: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...flat };
  if (family === InvocationFamily.AWS_BEDROCK) {
    const ic = flat.inferenceConfig;
    if (ic && typeof ic === "object" && !Array.isArray(ic)) {
      const i = ic as Record<string, unknown>;
      if (i.maxTokens !== undefined && out.max_tokens === undefined) {
        out.max_tokens = i.maxTokens;
      }
      if (i.temperature !== undefined && out.temperature === undefined) {
        out.temperature = i.temperature;
      }
      if (i.topP !== undefined && out.top_p === undefined) {
        out.top_p = i.topP;
      }
      if (i.stopSequences !== undefined && out.stop_sequences === undefined) {
        out.stop_sequences = i.stopSequences;
      }
    }
  }
  return out;
}

export function invocationValueKeyForSpec(
  spec: ParamSpec
):
  | "valueBool"
  | "valueBoolean"
  | "valueFloat"
  | "valueInt"
  | "valueJson"
  | "valueString"
  | "valueStringList" {
  switch (spec.type) {
    case "int":
      return "valueInt";
    case "float":
    case "bounded_float":
      return "valueFloat";
    case "string":
    case "enum":
      return "valueString";
    case "bool":
      return "valueBool";
    case "string_list":
      return "valueStringList";
    case "json":
      return "valueJson";
  }
}
