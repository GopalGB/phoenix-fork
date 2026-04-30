from phoenix.server.agents.context import ProjectContext, ResolvedContexts, ToolExecutionEnv
from phoenix.server.agents.tools import resolve_contextual_tools
from phoenix.server.types import DbSessionFactory


class TestResolveContextualTools:
    def test_no_tools_when_span_filter_missing(self, db: DbSessionFactory) -> None:
        defs, dispatch = resolve_contextual_tools(
            ResolvedContexts(), ToolExecutionEnv(user=None, db=db)
        )
        assert defs == []
        assert dispatch == {}

    def test_no_tools_when_project_lacks_span_filter(self, db: DbSessionFactory) -> None:
        resolved = ResolvedContexts(
            project=ProjectContext(type="project", project_node_id="UHJvamVjdDox")
        )
        defs, dispatch = resolve_contextual_tools(resolved, ToolExecutionEnv(user=None, db=db))
        assert defs == []
        assert dispatch == {}

    def test_apply_span_filter_condition_advertised_when_project_carries_span_filter(
        self, db: DbSessionFactory
    ) -> None:
        resolved = ResolvedContexts(
            project=ProjectContext(
                type="project",
                project_node_id="UHJvamVjdDox",
                span_filter="",
            )
        )
        defs, dispatch = resolve_contextual_tools(resolved, ToolExecutionEnv(user=None, db=db))

        names = [tool.name for tool in defs]
        assert "apply_span_filter_condition" in names
        assert dispatch == {}

    def test_apply_span_filter_condition_schema_requires_condition(
        self, db: DbSessionFactory
    ) -> None:
        resolved = ResolvedContexts(
            project=ProjectContext(
                type="project",
                project_node_id="UHJvamVjdDox",
                span_filter="span_kind == 'LLM'",
            )
        )
        defs, _ = resolve_contextual_tools(resolved, ToolExecutionEnv(user=None, db=db))
        tool = next(t for t in defs if t.name == "apply_span_filter_condition")
        schema = tool.parameters_json_schema
        assert schema.get("required") == ["condition"]
        assert "condition" in schema.get("properties", {})

    def test_set_root_spans_only_not_advertised_without_toggle(self, db: DbSessionFactory) -> None:
        resolved = ResolvedContexts(
            project=ProjectContext(
                type="project",
                project_node_id="UHJvamVjdDox",
                span_filter="",
            )
        )
        defs, _ = resolve_contextual_tools(resolved, ToolExecutionEnv(user=None, db=db))
        names = [tool.name for tool in defs]
        assert "set_root_spans_only" not in names

    def test_set_root_spans_only_advertised_when_toggle_present(self, db: DbSessionFactory) -> None:
        resolved = ResolvedContexts(
            project=ProjectContext(
                type="project",
                project_node_id="UHJvamVjdDox",
                root_spans_only=True,
            )
        )
        defs, dispatch = resolve_contextual_tools(resolved, ToolExecutionEnv(user=None, db=db))
        names = [tool.name for tool in defs]
        assert "set_root_spans_only" in names
        assert dispatch == {}

    def test_set_root_spans_only_schema_requires_root_spans_only(
        self, db: DbSessionFactory
    ) -> None:
        resolved = ResolvedContexts(
            project=ProjectContext(
                type="project",
                project_node_id="UHJvamVjdDox",
                root_spans_only=False,
            )
        )
        defs, _ = resolve_contextual_tools(resolved, ToolExecutionEnv(user=None, db=db))
        tool = next(t for t in defs if t.name == "set_root_spans_only")
        schema = tool.parameters_json_schema
        assert schema.get("required") == ["rootSpansOnly"]
        assert "rootSpansOnly" in schema.get("properties", {})
