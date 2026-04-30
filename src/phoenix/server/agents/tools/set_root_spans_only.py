from __future__ import annotations

from typing import Any

from phoenix.server.agents.tools.registry import ContextualTool

SET_ROOT_SPANS_ONLY_NAME = "set_root_spans_only"

SET_ROOT_SPANS_ONLY_DESCRIPTION = (
    "Toggle the spans table between root spans only and all spans. "
    "Pass `true` to show only the top-level (root) span of each trace, or "
    "`false` to show every span. Set this to `false` when looking for spans "
    "that are not roots (e.g. tool calls, retriever spans, or nested LLM "
    "calls), since `apply_span_filter_condition` only filters within the "
    "currently selected root/all scope."
)

SET_ROOT_SPANS_ONLY_PARAMETERS: dict[str, Any] = {
    "type": "object",
    "properties": {
        "rootSpansOnly": {
            "type": "boolean",
            "description": (
                "Whether the spans table should restrict to root spans (true) or "
                "include every span (false)."
            ),
        },
    },
    "required": ["rootSpansOnly"],
    "additionalProperties": False,
}


def build_set_root_spans_only_tool() -> ContextualTool:
    return ContextualTool(
        name=SET_ROOT_SPANS_ONLY_NAME,
        description=SET_ROOT_SPANS_ONLY_DESCRIPTION,
        parameters_json_schema=SET_ROOT_SPANS_ONLY_PARAMETERS,
        required_contexts=frozenset({"root_spans_only"}),
        executes_on="client",
        build_callable=None,
    )
