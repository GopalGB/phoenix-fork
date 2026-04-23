import type { ChatPromptVersionInput } from "@phoenix/pages/playground/__generated__/UpsertPromptFromTemplateDialogCreateMutation.graphql";
import { writePromptInvocationParametersMutationInput } from "@phoenix/pages/playground/promptInvocationParameterCodecs";

/**
 * Build GraphQL `PromptInvocationParametersInput` @oneOf from a flat dict
 * (same shape as `flattenPromptInvocationParametersRead` / legacy JSON).
 */
export function toPromptInvocationParametersMutationInput(
  flat: Record<string, unknown>,
  provider: ModelProvider
): ChatPromptVersionInput["invocationParameters"] {
  return writePromptInvocationParametersMutationInput(flat, provider);
}
