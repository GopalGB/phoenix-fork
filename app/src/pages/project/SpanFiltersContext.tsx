import type { PropsWithChildren } from "react";
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useState,
} from "react";

/**
 * Combined state for the on-screen span filters: the freeform filter
 * condition expression and the root-vs-all-spans toggle. These two pieces of
 * state are surfaced together in the spans page UI and are jointly advertised
 * to the PXI agent so it can drive both via tool calls.
 */
export type SpanFiltersContextType = {
  filterCondition: string;
  setFilterCondition: (condition: string) => void;
  appendFilterCondition: (condition: string) => void;
  rootSpansOnly: boolean;
  setRootSpansOnly: (rootSpansOnly: boolean) => void;
};

export const SpanFiltersContext = createContext<SpanFiltersContextType | null>(
  null
);

export function useSpanFilters() {
  const context = useContext(SpanFiltersContext);
  if (context === null) {
    throw new Error("useSpanFilters must be used within a SpanFiltersProvider");
  }
  return context;
}

export function SpanFiltersProvider(props: PropsWithChildren) {
  const [filterCondition, _setFilterCondition] = useState<string>("");
  const [rootSpansOnly, _setRootSpansOnly] = useState<boolean>(true);

  const setFilterCondition = useCallback((condition: string) => {
    startTransition(() => {
      _setFilterCondition(condition);
    });
  }, []);
  const appendFilterCondition = useCallback(
    (condition: string) => {
      startTransition(() => {
        if (filterCondition.length > 0) {
          _setFilterCondition(filterCondition + " and " + condition);
        } else {
          _setFilterCondition(condition);
        }
      });
    },
    [filterCondition]
  );
  const setRootSpansOnly = useCallback((rootSpansOnly: boolean) => {
    startTransition(() => {
      _setRootSpansOnly(rootSpansOnly);
    });
  }, []);

  return (
    <SpanFiltersContext.Provider
      value={{
        filterCondition,
        setFilterCondition,
        appendFilterCondition,
        rootSpansOnly,
        setRootSpansOnly,
      }}
    >
      {props.children}
    </SpanFiltersContext.Provider>
  );
}
