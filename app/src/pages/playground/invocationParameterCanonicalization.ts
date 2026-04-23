import {
  expandNestedInvocationKeys,
  getInvocationFamilyForProvider,
  InvocationFamily,
} from "./invocationParameterSpecs";

type CanonicalizeFlatInvocationParametersParams = {
  provider: ModelProvider;
  invocationParameters: Record<string, unknown>;
  openaiApiType?: OpenAIApiType | null;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Canonicalizes provider-specific invocation-parameter payloads into the flat key
 * shape expected by the playground form-store hydration path.
 */
export function canonicalizeFlatInvocationParameters({
  provider,
  invocationParameters,
  openaiApiType = null,
}: CanonicalizeFlatInvocationParametersParams): Record<string, unknown> {
  const family = getInvocationFamilyForProvider(provider);
  const canonical: Record<string, unknown> = { ...invocationParameters };

  if (family === InvocationFamily.OPENAI) {
    const legacyMaxTokens =
      canonical.max_tokens ?? canonical.maxTokens ?? undefined;
    if (
      legacyMaxTokens !== undefined &&
      canonical.max_completion_tokens === undefined
    ) {
      canonical.max_completion_tokens = legacyMaxTokens;
    }
    delete canonical.max_tokens;
    delete canonical.maxTokens;

    if (openaiApiType === "RESPONSES") {
      if (
        typeof canonical.max_output_tokens === "number" &&
        canonical.max_completion_tokens === undefined
      ) {
        canonical.max_completion_tokens = canonical.max_output_tokens;
      }
      delete canonical.max_output_tokens;

      if (isPlainObject(canonical.reasoning)) {
        const effort = (canonical.reasoning as { effort?: unknown }).effort;
        if (
          typeof effort === "string" &&
          canonical.reasoning_effort === undefined
        ) {
          canonical.reasoning_effort = effort;
        }
      }
      delete canonical.reasoning;
    }
  }

  return expandNestedInvocationKeys(family, canonical);
}
