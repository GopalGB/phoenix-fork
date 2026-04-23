import type { ModelConfig } from "@phoenix/store/playground";

import { canonicalizeFlatInvocationParameters } from "./invocationParameterCanonicalization";
import type { ParamSpec } from "./invocationParameterSpecs";
import {
  getActiveSpecsForPlayground,
  getInvocationFamilyForProvider,
  invocationValueKeyForSpec,
  INVOCATION_PARAMETERS,
} from "./invocationParameterSpecs";

// These types are no longer generated from GraphQL (since neither ChatCompletionInput
// nor ChatCompletionOverDatasetInput exposes invocationParameters as a list anymore).
// They are defined here as the canonical source for the frontend.
export type CanonicalParameterName =
  | "ANTHROPIC_EXTENDED_THINKING"
  | "MAX_COMPLETION_TOKENS"
  | "RANDOM_SEED"
  | "REASONING_EFFORT"
  | "RESPONSE_FORMAT"
  | "STOP_SEQUENCES"
  | "TEMPERATURE"
  | "TOP_P";

export type InvocationParameterInput = {
  canonicalName?: CanonicalParameterName | null;
  invocationName: string;
  valueBool?: boolean | null;
  valueBoolean?: boolean | null;
  valueFloat?: number | null;
  valueInt?: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  valueJson?: any | null;
  valueString?: string | null;
  valueStringList?: ReadonlyArray<string> | null;
};

export type ChatCompletionMessageRole = "AI" | "SYSTEM" | "TOOL" | "USER";

function paramName(
  p: InvocationParameterInput | ParamSpec
): string | undefined {
  if ("invocationName" in p && p.invocationName) {
    return p.invocationName;
  }
  return "name" in p && p.name ? p.name : undefined;
}

/**
 * Check if two invocation parameters are equal by comparing their invocation name and canonical name
 */
export function areInvocationParamsEqual(
  paramA: InvocationParameterInput | ParamSpec,
  paramB: InvocationParameterInput | ParamSpec
) {
  const nameA = paramName(paramA);
  const nameB = paramName(paramB);
  return (
    (nameA != null && nameA === nameB) ||
    // loose null comparison to catch undefined and null
    (paramA.canonicalName != null &&
      paramB.canonicalName != null &&
      paramA.canonicalName === paramB.canonicalName)
  );
}

/**
 * Keep only invocation parameter inputs that match a static {@link ParamSpec} name
 * (frontend-owned spec table).
 */
export const constrainInvocationParameterInputsToSpecs = (
  invocationParameterInputs: InvocationParameterInput[],
  specs: readonly ParamSpec[]
): InvocationParameterInput[] => {
  const names = new Set(specs.map((s) => s.name));
  return invocationParameterInputs.filter(
    (ip) => ip.invocationName != null && names.has(ip.invocationName)
  );
};

/**
 * Converts a flat invocation-parameters dict (prompt/span canonical keys) into
 * form-store {@link InvocationParameterInput} rows using the static spec table.
 */
export function objectToInvocationParameters(
  invocationParameters: Record<string, unknown>,
  provider: ModelProvider,
  options?: {
    openaiApiType?: OpenAIApiType | null;
  }
): InvocationParameterInput[] {
  const family = getInvocationFamilyForProvider(provider);
  const canonical = canonicalizeFlatInvocationParameters({
    provider,
    invocationParameters,
    openaiApiType: options?.openaiApiType ?? null,
  });
  const specs = INVOCATION_PARAMETERS[family];
  const specByName = Object.fromEntries(specs.map((s) => [s.name, s]));
  return Object.entries(canonical).map(([key, value]) => {
    const spec = specByName[key];
    if (!spec) {
      return { invocationName: key, valueJson: value };
    }
    const vk = invocationValueKeyForSpec(spec);
    return {
      invocationName: spec.name,
      ...(spec.canonicalName ? { canonicalName: spec.canonicalName } : {}),
      [vk]: value,
    } as InvocationParameterInput;
  });
}

/**
 * Merge defaults from {@link ParamSpec} entries (replaces GraphQL-sourced defaults).
 */
export function mergeInvocationParametersWithSpecDefaults(
  invocationParameters: InvocationParameterInput[],
  specs: readonly ParamSpec[]
): InvocationParameterInput[] {
  const current = new Map(
    invocationParameters.map((p) => [p.invocationName, p])
  );
  for (const spec of specs) {
    if (!("defaultValue" in spec) || spec.defaultValue === undefined) {
      continue;
    }
    const existing = current.get(spec.name);
    const field = invocationValueKeyForSpec(spec);
    if (
      existing?.[field] != null ||
      existing?.valueJson != null ||
      existing?.valueStringList != null
    ) {
      continue;
    }
    current.set(spec.name, {
      invocationName: spec.name,
      ...(spec.canonicalName ? { canonicalName: spec.canonicalName } : {}),
      [field]: spec.defaultValue,
    } as InvocationParameterInput);
  }
  return Array.from(current.values());
}

function extractInvocationParameterInputValue(
  p: InvocationParameterInput
): unknown {
  return (
    p.valueFloat ??
    p.valueInt ??
    p.valueBool ??
    p.valueBoolean ??
    p.valueString ??
    p.valueJson ??
    p.valueStringList ??
    null
  );
}

/**
 * Flatten form-store invocation parameters to a dict keyed by wire/Pydantic field name.
 */
export function invocationParametersToObject(
  invocationParameters: InvocationParameterInput[],
  model: Pick<ModelConfig, "provider" | "openaiApiType">
): Record<string, unknown> {
  const specs = getActiveSpecsForPlayground(model);
  const specByName = new Map(specs.map((s) => [s.name, s]));
  const acc: Record<string, unknown> = {};
  for (const curr of invocationParameters) {
    if (!curr.invocationName) {
      continue;
    }
    const spec = specByName.get(curr.invocationName);
    if (spec) {
      const field = invocationValueKeyForSpec(spec);
      const v = curr[field];
      if (v !== null && v !== undefined) {
        acc[curr.invocationName] = v;
      }
    } else {
      const v = extractInvocationParameterInputValue(curr);
      if (v !== null && v !== undefined) {
        acc[curr.invocationName] = v;
      }
    }
  }
  return acc;
}
