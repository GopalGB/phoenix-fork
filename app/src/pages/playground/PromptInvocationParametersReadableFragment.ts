/**
 * Shared `@inline` fragment for the PromptInvocationParameters union (read path).
 * Consumers spread `...PromptInvocationParametersReadableFragment` in their
 * query and call {@link readPromptInvocationParameters} on the returned fragment
 * reference to get a flat record keyed by canonical Pydantic field names.
 */
import { graphql, readInlineData } from "react-relay";

import type { PromptInvocationParametersReadableFragment$key } from "./__generated__/PromptInvocationParametersReadableFragment.graphql";
import { flattenPromptInvocationParametersRead } from "./flattenPromptInvocationParameters";

const fragment = graphql`
  fragment PromptInvocationParametersReadableFragment on PromptInvocationParameters
  @inline {
    __typename
    ... on PromptOpenAIInvocationParameters {
      temperature
      openaiMaxTokens: maxTokens
      maxCompletionTokens
      frequencyPenalty
      presencePenalty
      topP
      seed
      reasoningEffort
    }
    ... on PromptAnthropicInvocationParameters {
      anthropicMaxTokens: maxTokens
      temperature
      topP
      stopSequences
      thinking {
        __typename
        ... on PromptAnthropicThinkingDisabled {
          disabled
        }
        ... on PromptAnthropicThinkingEnabled {
          budgetTokens
        }
      }
    }
    ... on PromptGoogleInvocationParameters {
      temperature
      maxOutputTokens
      stopSequences
      presencePenalty
      frequencyPenalty
      topP
      topK
    }
    ... on PromptAwsInvocationParameters {
      awsMaxTokens: maxTokens
      temperature
      topP
    }
  }
`;

export function readPromptInvocationParameters(
  ref: PromptInvocationParametersReadableFragment$key | null | undefined
): Record<string, unknown> {
  if (ref == null) {
    return {};
  }
  const data = readInlineData(fragment, ref);
  return flattenPromptInvocationParametersRead(
    data as unknown as Parameters<
      typeof flattenPromptInvocationParametersRead
    >[0]
  );
}
