"""
GraphQL object types for persisted prompt invocation parameters (four families on the wire).
"""

from __future__ import annotations

from typing import Annotated, Optional, Union

import strawberry
from typing_extensions import assert_never

import phoenix.db.types.prompts as orm
from phoenix.db.types.db_helper_types import UNDEFINED
from phoenix.db.types.prompts import openai_family_content_from_invocation_parameters
from phoenix.server.api.input_types.PromptInvocationParametersInput import OpenAIReasoningEffort


@strawberry.type
class PromptOpenAIInvocationParameters:
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    max_completion_tokens: Optional[int] = None
    frequency_penalty: Optional[float] = None
    presence_penalty: Optional[float] = None
    top_p: Optional[float] = None
    seed: Optional[int] = None
    reasoning_effort: Optional[OpenAIReasoningEffort] = None

    @classmethod
    def from_orm(
        cls, obj: orm.PromptOpenAIInvocationParameters
    ) -> "PromptOpenAIInvocationParameters":
        c = obj.openai
        reasoning_effort: OpenAIReasoningEffort | None = None
        if c.reasoning_effort:
            if c.reasoning_effort == "none":
                reasoning_effort = OpenAIReasoningEffort.NONE
            elif c.reasoning_effort == "minimal":
                reasoning_effort = OpenAIReasoningEffort.MINIMAL
            elif c.reasoning_effort == "low":
                reasoning_effort = OpenAIReasoningEffort.LOW
            elif c.reasoning_effort == "medium":
                reasoning_effort = OpenAIReasoningEffort.MEDIUM
            elif c.reasoning_effort == "high":
                reasoning_effort = OpenAIReasoningEffort.HIGH
            elif c.reasoning_effort == "xhigh":
                reasoning_effort = OpenAIReasoningEffort.XHIGH
            else:
                assert_never(c.reasoning_effort)
        return cls(
            temperature=c.temperature if isinstance(c.temperature, float) else None,
            max_tokens=c.max_tokens if isinstance(c.max_tokens, int) else None,
            max_completion_tokens=c.max_completion_tokens
            if isinstance(c.max_completion_tokens, int)
            else None,
            frequency_penalty=c.frequency_penalty
            if isinstance(c.frequency_penalty, float)
            else None,
            presence_penalty=c.presence_penalty if isinstance(c.presence_penalty, float) else None,
            top_p=c.top_p if isinstance(c.top_p, float) else None,
            seed=c.seed if isinstance(c.seed, int) else None,
            reasoning_effort=reasoning_effort,
        )


@strawberry.type
class PromptAnthropicThinkingDisabled:
    disabled: bool = True


@strawberry.type
class PromptAnthropicThinkingEnabled:
    budget_tokens: int


PromptAnthropicThinkingConfig = Annotated[
    Union[PromptAnthropicThinkingDisabled, PromptAnthropicThinkingEnabled],
    strawberry.union("PromptAnthropicThinkingConfig"),
]


def _thinking_from_orm(
    t: orm.PromptAnthropicThinkingConfigDisabled | orm.PromptAnthropicThinkingConfigEnabled,
) -> PromptAnthropicThinkingConfig:
    if t.type == "disabled":
        return PromptAnthropicThinkingDisabled()
    if t.type == "enabled":
        return PromptAnthropicThinkingEnabled(budget_tokens=t.budget_tokens)
    assert_never(t)


@strawberry.type
class PromptAnthropicInvocationParameters:
    max_tokens: int
    temperature: Optional[float] = None
    top_p: Optional[float] = None
    stop_sequences: Optional[list[str]] = None
    thinking: Optional[PromptAnthropicThinkingConfig] = None

    @classmethod
    def from_orm(
        cls, obj: orm.PromptAnthropicInvocationParameters
    ) -> "PromptAnthropicInvocationParameters":
        c = obj.anthropic
        thinking: PromptAnthropicThinkingConfig | None = None
        if c.thinking is not UNDEFINED and c.thinking is not None:
            thinking = _thinking_from_orm(c.thinking)
        return cls(
            max_tokens=c.max_tokens,
            temperature=c.temperature if isinstance(c.temperature, float) else None,
            top_p=c.top_p if isinstance(c.top_p, float) else None,
            stop_sequences=c.stop_sequences if c.stop_sequences else None,
            thinking=thinking,
        )


@strawberry.type
class PromptGoogleInvocationParameters:
    temperature: Optional[float] = None
    max_output_tokens: Optional[int] = None
    stop_sequences: Optional[list[str]] = None
    presence_penalty: Optional[float] = None
    frequency_penalty: Optional[float] = None
    top_p: Optional[float] = None
    top_k: Optional[int] = None

    @classmethod
    def from_orm(
        cls, obj: orm.PromptGoogleInvocationParameters
    ) -> "PromptGoogleInvocationParameters":
        c = obj.google
        return cls(
            temperature=c.temperature if isinstance(c.temperature, float) else None,
            max_output_tokens=c.max_output_tokens if isinstance(c.max_output_tokens, int) else None,
            stop_sequences=c.stop_sequences if c.stop_sequences else None,
            presence_penalty=c.presence_penalty if isinstance(c.presence_penalty, float) else None,
            frequency_penalty=c.frequency_penalty
            if isinstance(c.frequency_penalty, float)
            else None,
            top_p=c.top_p if isinstance(c.top_p, float) else None,
            top_k=c.top_k if isinstance(c.top_k, int) else None,
        )


@strawberry.type
class PromptAwsInvocationParameters:
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None
    top_p: Optional[float] = None

    @classmethod
    def from_orm(cls, obj: orm.PromptAwsInvocationParameters) -> "PromptAwsInvocationParameters":
        c = obj.aws
        return cls(
            max_tokens=c.max_tokens if isinstance(c.max_tokens, int) else None,
            temperature=c.temperature if isinstance(c.temperature, float) else None,
            top_p=c.top_p if isinstance(c.top_p, float) else None,
        )


PromptInvocationParameters = Annotated[
    Union[
        PromptOpenAIInvocationParameters,
        PromptAnthropicInvocationParameters,
        PromptGoogleInvocationParameters,
        PromptAwsInvocationParameters,
    ],
    strawberry.union("PromptInvocationParameters"),
]


def gql_prompt_invocation_parameters_from_orm(
    obj: orm.PromptInvocationParameters,
) -> PromptInvocationParameters:
    openai_content = openai_family_content_from_invocation_parameters(obj)
    if openai_content is not None:
        return PromptOpenAIInvocationParameters.from_orm(
            orm.PromptOpenAIInvocationParameters(
                type="openai",
                openai=openai_content,
            )
        )
    if isinstance(obj, orm.PromptAnthropicInvocationParameters):
        return PromptAnthropicInvocationParameters.from_orm(obj)
    if isinstance(obj, orm.PromptGoogleInvocationParameters):
        return PromptGoogleInvocationParameters.from_orm(obj)
    if isinstance(obj, orm.PromptAwsInvocationParameters):
        return PromptAwsInvocationParameters.from_orm(obj)
    raise AssertionError(f"unexpected invocation parameters: {type(obj).__name__}")
