import { flattenPromptInvocationParametersRead } from "../flattenPromptInvocationParameters";
import { toPromptInvocationParametersMutationInput } from "../toPromptInvocationParametersMutationInput";

type FlattenInput = Parameters<typeof flattenPromptInvocationParametersRead>[0];

describe("prompt invocation parameter codecs", () => {
  it("reads OpenAI prompt invocation parameters to flat keys", () => {
    const input: FlattenInput = {
      __typename: "PromptOpenAIInvocationParameters",
      temperature: 0.4,
      openaiMaxTokens: 64,
      maxCompletionTokens: 128,
      frequencyPenalty: 0.2,
      presencePenalty: 0.1,
      topP: 0.9,
      seed: 7,
      reasoningEffort: "LOW",
    };
    expect(flattenPromptInvocationParametersRead(input)).toEqual({
      temperature: 0.4,
      max_tokens: 64,
      max_completion_tokens: 128,
      frequency_penalty: 0.2,
      presence_penalty: 0.1,
      top_p: 0.9,
      seed: 7,
      reasoning_effort: "low",
    });
  });

  it("reads Anthropic thinking config to flat shape", () => {
    const input: FlattenInput = {
      __typename: "PromptAnthropicInvocationParameters",
      anthropicMaxTokens: 1024,
      temperature: 0.7,
      topP: 0.95,
      stopSequences: ["STOP"],
      thinking: {
        __typename: "PromptAnthropicThinkingEnabled",
        budgetTokens: 256,
      },
    };
    expect(flattenPromptInvocationParametersRead(input)).toEqual({
      max_tokens: 1024,
      temperature: 0.7,
      top_p: 0.95,
      stop_sequences: ["STOP"],
      thinking: {
        type: "enabled",
        budget_tokens: 256,
      },
    });
  });

  it("throws for unknown invocation union typename", () => {
    const input: FlattenInput = {
      __typename: "PromptUnknownInvocationParameters",
    };
    expect(() => flattenPromptInvocationParametersRead(input)).toThrow(
      "Unsupported prompt invocation parameters typename: PromptUnknownInvocationParameters"
    );
  });

  it("writes OpenAI-family providers through openai branch", () => {
    const result = toPromptInvocationParametersMutationInput(
      {
        temperature: 0.3,
        max_completion_tokens: 222,
        top_p: 0.8,
      },
      "XAI"
    );
    expect(result).toEqual({
      openai: {
        temperature: 0.3,
        maxTokens: undefined,
        maxCompletionTokens: 222,
        frequencyPenalty: undefined,
        presencePenalty: undefined,
        topP: 0.8,
        seed: undefined,
        reasoningEffort: undefined,
      },
    });
  });

  it("writes lowercase OpenAI reasoning effort to GraphQL enum values", () => {
    const result = toPromptInvocationParametersMutationInput(
      {
        reasoning_effort: "high",
      },
      "OPENAI"
    );
    expect(result).toEqual({
      openai: {
        temperature: undefined,
        maxTokens: undefined,
        maxCompletionTokens: undefined,
        frequencyPenalty: undefined,
        presencePenalty: undefined,
        topP: undefined,
        seed: undefined,
        reasoningEffort: "HIGH",
      },
    });
  });

  it("omits invalid OpenAI reasoning effort values", () => {
    const result = toPromptInvocationParametersMutationInput(
      {
        reasoning_effort: "ultra",
      },
      "OPENAI"
    );
    expect(result).toEqual({
      openai: {
        temperature: undefined,
        maxTokens: undefined,
        maxCompletionTokens: undefined,
        frequencyPenalty: undefined,
        presencePenalty: undefined,
        topP: undefined,
        seed: undefined,
        reasoningEffort: undefined,
      },
    });
  });

  it("writes Anthropic thinking config to oneOf input", () => {
    const result = toPromptInvocationParametersMutationInput(
      {
        max_tokens: 2048,
        temperature: 0.5,
        thinking: {
          type: "disabled",
        },
      },
      "ANTHROPIC"
    );
    expect(result).toEqual({
      anthropic: {
        maxTokens: 2048,
        temperature: 0.5,
        topP: undefined,
        stopSequences: undefined,
        thinking: {
          disabled: {
            disabled: true,
          },
        },
      },
    });
  });

  it("throws for Anthropic writes without max_tokens", () => {
    expect(() =>
      toPromptInvocationParametersMutationInput(
        {
          temperature: 0.5,
        },
        "ANTHROPIC"
      )
    ).toThrow("Anthropic invocation parameters require max_tokens");
  });

  it("throws for unsupported providers", () => {
    expect(() =>
      toPromptInvocationParametersMutationInput(
        {},
        "UNSUPPORTED_PROVIDER" as ModelProvider
      )
    ).toThrow("Unreachable");
  });
});
