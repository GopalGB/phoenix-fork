import {
  readPromptInvocationParametersUnion,
  type PromptInvocationParametersReadableData,
} from "./promptInvocationParameterCodecs";

/**
 * Convert PromptInvocationParameters GraphQL union (readable fragment shape)
 * into a flat JSON-like record compatible with legacy playground helpers
 * (same key conventions as Pydantic model_dump for invocation content).
 */
export function flattenPromptInvocationParametersRead(
  data: PromptInvocationParametersReadableData
): Record<string, unknown> {
  return readPromptInvocationParametersUnion(data);
}
