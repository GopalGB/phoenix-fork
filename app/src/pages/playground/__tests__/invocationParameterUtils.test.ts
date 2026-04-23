import { objectToInvocationParameters } from "../invocationParameterUtils";

describe("objectToInvocationParameters", () => {
  it("normalizes legacy OpenAI max_tokens to max_completion_tokens", () => {
    expect(objectToInvocationParameters({ max_tokens: 512 }, "OPENAI")).toEqual(
      [
        {
          invocationName: "max_completion_tokens",
          canonicalName: "MAX_COMPLETION_TOKENS",
          valueInt: 512,
        },
      ]
    );
  });

  it("prefers canonical max_completion_tokens over legacy max_tokens", () => {
    expect(
      objectToInvocationParameters(
        {
          max_tokens: 128,
          max_completion_tokens: 256,
        },
        "OPENAI"
      )
    ).toEqual([
      {
        invocationName: "max_completion_tokens",
        canonicalName: "MAX_COMPLETION_TOKENS",
        valueInt: 256,
      },
    ]);
  });

  it("does not rewrite max_tokens for Anthropic", () => {
    expect(
      objectToInvocationParameters({ max_tokens: 1024 }, "ANTHROPIC")
    ).toEqual([
      {
        invocationName: "max_tokens",
        canonicalName: "MAX_COMPLETION_TOKENS",
        valueInt: 1024,
      },
    ]);
  });
});
