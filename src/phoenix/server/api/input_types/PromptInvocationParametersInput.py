from enum import Enum
from typing import Literal, Optional

import strawberry
from strawberry import UNSET
from typing_extensions import assert_never

import phoenix.db.types.prompts as orm
from phoenix.db.types.db_helper_types import UNDEFINED
from phoenix.server.api.exceptions import BadRequest

# --- OpenAI family ---


class OpenAIReasoningEffort(str, Enum):
    NONE = "none"
    MINIMAL = "minimal"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    XHIGH = "xhigh"


@strawberry.input
class PromptOpenAIInvocationParametersInput:
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    max_completion_tokens: Optional[int] = None
    frequency_penalty: Optional[float] = None
    presence_penalty: Optional[float] = None
    top_p: Optional[float] = None
    seed: Optional[int] = None
    reasoning_effort: Optional[OpenAIReasoningEffort] = None

    def to_orm(self) -> orm.PromptOpenAIInvocationParameters:
        reasoning_effort: Literal["none", "minimal", "low", "medium", "high", "xhigh"] = UNDEFINED
        if self.reasoning_effort:
            if self.reasoning_effort is OpenAIReasoningEffort.NONE:
                reasoning_effort = "none"
            elif self.reasoning_effort is OpenAIReasoningEffort.MINIMAL:
                reasoning_effort = "minimal"
            elif self.reasoning_effort is OpenAIReasoningEffort.LOW:
                reasoning_effort = "low"
            elif self.reasoning_effort is OpenAIReasoningEffort.MEDIUM:
                reasoning_effort = "medium"
            elif self.reasoning_effort is OpenAIReasoningEffort.HIGH:
                reasoning_effort = "high"
            elif self.reasoning_effort is OpenAIReasoningEffort.XHIGH:
                reasoning_effort = "xhigh"
            else:
                assert_never(self.reasoning_effort)
        return orm.PromptOpenAIInvocationParameters(
            type="openai",
            openai=orm.PromptOpenAIInvocationParametersContent(
                temperature=self.temperature if self.temperature is not None else UNDEFINED,
                max_tokens=self.max_tokens if self.max_tokens is not None else UNDEFINED,
                max_completion_tokens=self.max_completion_tokens
                if self.max_completion_tokens is not None
                else UNDEFINED,
                frequency_penalty=self.frequency_penalty
                if self.frequency_penalty is not None
                else UNDEFINED,
                presence_penalty=self.presence_penalty
                if self.presence_penalty is not None
                else UNDEFINED,
                top_p=self.top_p if self.top_p is not None else UNDEFINED,
                seed=self.seed if self.seed is not None else UNDEFINED,
                reasoning_effort=reasoning_effort,
            ),
        )


# --- Anthropic ---


@strawberry.input
class AnthropicThinkingDisabledMarkerInput:
    """Set this branch (empty object) for disabled extended thinking."""

    disabled: bool = True


@strawberry.input
class AnthropicThinkingEnabledInput:
    budget_tokens: int

    def to_orm(self) -> orm.PromptAnthropicThinkingConfigEnabled:
        return orm.PromptAnthropicThinkingConfigEnabled(
            type="enabled",
            budget_tokens=self.budget_tokens,
        )


@strawberry.input(one_of=True)
class PromptAnthropicThinkingConfigInput:
    disabled: Optional[AnthropicThinkingDisabledMarkerInput] = UNSET
    enabled: Optional[AnthropicThinkingEnabledInput] = UNSET

    def to_orm(
        self,
    ) -> orm.PromptAnthropicThinkingConfigDisabled | orm.PromptAnthropicThinkingConfigEnabled:
        if self.disabled:
            return orm.PromptAnthropicThinkingConfigDisabled(type="disabled")
        if self.enabled:
            return self.enabled.to_orm()
        raise BadRequest("No thinking config branch is set")


@strawberry.input
class PromptAnthropicInvocationParametersInput:
    max_tokens: int
    temperature: Optional[float] = None
    top_p: Optional[float] = None
    stop_sequences: Optional[list[str]] = None
    thinking: Optional[PromptAnthropicThinkingConfigInput] = None

    def to_orm(self) -> orm.PromptAnthropicInvocationParameters:
        return orm.PromptAnthropicInvocationParameters(
            type="anthropic",
            anthropic=orm.PromptAnthropicInvocationParametersContent(
                max_tokens=self.max_tokens,
                temperature=self.temperature if self.temperature is not None else UNDEFINED,
                top_p=self.top_p if self.top_p is not None else UNDEFINED,
                stop_sequences=self.stop_sequences
                if self.stop_sequences is not None
                else UNDEFINED,
                thinking=self.thinking.to_orm() if self.thinking is not None else UNDEFINED,
            ),
        )


# --- Google ---


@strawberry.input
class PromptGoogleInvocationParametersInput:
    temperature: Optional[float] = None
    max_output_tokens: Optional[int] = None
    stop_sequences: Optional[list[str]] = None
    presence_penalty: Optional[float] = None
    frequency_penalty: Optional[float] = None
    top_p: Optional[float] = None
    top_k: Optional[int] = None

    def to_orm(self) -> orm.PromptGoogleInvocationParameters:
        return orm.PromptGoogleInvocationParameters(
            type="google",
            google=orm.PromptGoogleInvocationParametersContent(
                temperature=self.temperature if self.temperature is not None else UNDEFINED,
                max_output_tokens=self.max_output_tokens
                if self.max_output_tokens is not None
                else UNDEFINED,
                stop_sequences=self.stop_sequences
                if self.stop_sequences is not None
                else UNDEFINED,
                presence_penalty=self.presence_penalty
                if self.presence_penalty is not None
                else UNDEFINED,
                frequency_penalty=self.frequency_penalty
                if self.frequency_penalty is not None
                else UNDEFINED,
                top_p=self.top_p if self.top_p is not None else UNDEFINED,
                top_k=self.top_k if self.top_k is not None else UNDEFINED,
            ),
        )


# --- AWS ---


@strawberry.input
class PromptAwsInvocationParametersInput:
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None
    top_p: Optional[float] = None

    def to_orm(self) -> orm.PromptAwsInvocationParameters:
        return orm.PromptAwsInvocationParameters(
            type="aws",
            aws=orm.PromptAwsInvocationParametersContent(
                max_tokens=self.max_tokens if self.max_tokens is not None else UNDEFINED,
                temperature=self.temperature if self.temperature is not None else UNDEFINED,
                top_p=self.top_p if self.top_p is not None else UNDEFINED,
            ),
        )


# --- Root one_of ---


@strawberry.input(one_of=True)
class PromptInvocationParametersInput:
    openai: Optional[PromptOpenAIInvocationParametersInput] = UNSET
    anthropic: Optional[PromptAnthropicInvocationParametersInput] = UNSET
    google: Optional[PromptGoogleInvocationParametersInput] = UNSET
    aws: Optional[PromptAwsInvocationParametersInput] = UNSET

    def to_orm(self) -> orm.PromptInvocationParameters:
        if self.openai:
            return self.openai.to_orm()
        if self.anthropic:
            return self.anthropic.to_orm()
        if self.google:
            return self.google.to_orm()
        if self.aws:
            return self.aws.to_orm()
        raise BadRequest("No invocation parameters variant is set")
