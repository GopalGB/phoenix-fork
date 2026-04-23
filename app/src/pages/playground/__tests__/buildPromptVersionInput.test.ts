import type { PlaygroundInstance } from "@phoenix/store/playground";

import type { ChatPromptVersionInput } from "../__generated__/UpsertPromptFromTemplateDialogCreateMutation.graphql";
import type { InvocationParameterInput } from "../invocationParameterUtils";
import { buildPromptVersionInput } from "../playgroundUtils";

describe("buildPromptVersionInput", () => {
  it("builds an OpenAI prompt version payload from canonical instance state", () => {
    const instance = {
      model: {
        provider: "OPENAI",
        openaiApiType: "CHAT_COMPLETIONS",
        modelName: "gpt-4o-mini",
        customProvider: {
          id: "custom-provider-id",
          name: "custom-provider-name",
        },
        responseFormat: {
          type: "json_schema",
          jsonSchema: {
            name: "response",
            schema: {
              type: "object",
              properties: {
                answer: { type: "string" },
              },
            },
            strict: true,
          },
        },
        invocationParameters: [],
      },
      tools: [
        {
          id: 1,
          editorType: "json",
          definition: {
            name: "lookup",
            description: "Lookup an answer",
            parameters: { type: "object" },
            strict: true,
          },
        },
      ],
      toolChoice: {
        type: "SPECIFIC_FUNCTION",
        functionName: "lookup",
      },
    } satisfies Pick<PlaygroundInstance, "model" | "tools" | "toolChoice">;
    const promptMessages = [
      {
        role: "USER",
        content: [{ text: { text: "hello" } }],
      },
    ] as ChatPromptVersionInput["template"]["messages"];
    const invocationParameters: InvocationParameterInput[] = [
      { invocationName: "temperature", valueFloat: 0.25 },
      { invocationName: "max_tokens", valueInt: 128 },
      { invocationName: "top_p", valueFloat: 0.9 },
    ];

    const result = buildPromptVersionInput({
      instance,
      modelName: "gpt-4o-mini",
      templateFormat: "MUSTACHE",
      promptMessages,
      invocationParameters,
    });

    expect(result).toEqual({
      templateFormat: "MUSTACHE",
      template: {
        messages: promptMessages,
      },
      modelProvider: "OPENAI",
      modelName: "gpt-4o-mini",
      customProviderId: "custom-provider-id",
      invocationParameters: {
        openai: {
          temperature: 0.25,
          maxTokens: 128,
          maxCompletionTokens: undefined,
          frequencyPenalty: undefined,
          presencePenalty: undefined,
          topP: 0.9,
          seed: undefined,
          reasoningEffort: undefined,
        },
      },
      tools: {
        tools: [
          {
            function: {
              name: "lookup",
              description: "Lookup an answer",
              parameters: { type: "object" },
              strict: true,
            },
          },
        ],
        toolChoice: {
          functionName: "lookup",
        },
      },
      responseFormat: {
        type: "json_schema",
        jsonSchema: {
          name: "response",
          schema: {
            type: "object",
            properties: {
              answer: { type: "string" },
            },
          },
          strict: true,
        },
      },
    });
  });

  it("uses max_completion_tokens for OpenAI Responses API models", () => {
    const instance = {
      model: {
        provider: "OPENAI",
        openaiApiType: "RESPONSES",
        modelName: "gpt-5",
        customProvider: null,
        responseFormat: null,
        invocationParameters: [],
      },
      tools: [],
      toolChoice: null,
    } satisfies Pick<PlaygroundInstance, "model" | "tools" | "toolChoice">;
    const promptMessages = [
      {
        role: "SYSTEM",
        content: [{ text: { text: "You are helpful." } }],
      },
    ] as ChatPromptVersionInput["template"]["messages"];
    const invocationParameters: InvocationParameterInput[] = [
      { invocationName: "max_completion_tokens", valueInt: 777 },
    ];

    const result = buildPromptVersionInput({
      instance,
      modelName: "gpt-5",
      templateFormat: "NONE",
      promptMessages,
      invocationParameters,
    });

    expect(result.invocationParameters).toEqual({
      openai: {
        temperature: undefined,
        maxTokens: undefined,
        maxCompletionTokens: 777,
        frequencyPenalty: undefined,
        presencePenalty: undefined,
        topP: undefined,
        seed: undefined,
        reasoningEffort: undefined,
      },
    });
    expect(result.tools).toBeNull();
    expect(result.responseFormat).toBeNull();
    expect(result.customProviderId).toBeNull();
  });
});
