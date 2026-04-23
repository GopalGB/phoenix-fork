/**
 * @generated SignedSource<<441aaf7edfc2cb4eecd6dee859f80d0f>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderInlineDataFragment } from 'relay-runtime';
export type OpenAIReasoningEffort = "HIGH" | "LOW" | "MEDIUM" | "MINIMAL" | "NONE" | "XHIGH";
import { FragmentRefs } from "relay-runtime";
export type PromptInvocationParametersReadableFragment$data = {
  readonly __typename: "PromptAnthropicInvocationParameters";
  readonly anthropicMaxTokens: number;
  readonly stopSequences: ReadonlyArray<string> | null;
  readonly temperature: number | null;
  readonly thinking: {
    readonly __typename: "PromptAnthropicThinkingDisabled";
    readonly disabled: boolean;
  } | {
    readonly __typename: "PromptAnthropicThinkingEnabled";
    readonly budgetTokens: number;
  } | {
    // This will never be '%other', but we need some
    // value in case none of the concrete values match.
    readonly __typename: "%other";
  } | null;
  readonly topP: number | null;
  readonly " $fragmentType": "PromptInvocationParametersReadableFragment";
} | {
  readonly __typename: "PromptAwsInvocationParameters";
  readonly awsMaxTokens: number | null;
  readonly temperature: number | null;
  readonly topP: number | null;
  readonly " $fragmentType": "PromptInvocationParametersReadableFragment";
} | {
  readonly __typename: "PromptGoogleInvocationParameters";
  readonly frequencyPenalty: number | null;
  readonly maxOutputTokens: number | null;
  readonly presencePenalty: number | null;
  readonly stopSequences: ReadonlyArray<string> | null;
  readonly temperature: number | null;
  readonly topK: number | null;
  readonly topP: number | null;
  readonly " $fragmentType": "PromptInvocationParametersReadableFragment";
} | {
  readonly __typename: "PromptOpenAIInvocationParameters";
  readonly frequencyPenalty: number | null;
  readonly maxCompletionTokens: number | null;
  readonly openaiMaxTokens: number | null;
  readonly presencePenalty: number | null;
  readonly reasoningEffort: OpenAIReasoningEffort | null;
  readonly seed: number | null;
  readonly temperature: number | null;
  readonly topP: number | null;
  readonly " $fragmentType": "PromptInvocationParametersReadableFragment";
} | {
  // This will never be '%other', but we need some
  // value in case none of the concrete values match.
  readonly __typename: "%other";
  readonly " $fragmentType": "PromptInvocationParametersReadableFragment";
};
export type PromptInvocationParametersReadableFragment$key = {
  readonly " $data"?: PromptInvocationParametersReadableFragment$data;
  readonly " $fragmentSpreads": FragmentRefs<"PromptInvocationParametersReadableFragment">;
};

const node: ReaderInlineDataFragment = {
  "kind": "InlineDataFragment",
  "name": "PromptInvocationParametersReadableFragment"
};

(node as any).hash = "cf39d71b771a7a9dc03323945c40e20d";

export default node;
