/**
 * Reverse translators: recorded span attributes (`llm.invocation_parameters`) → canonical
 * flat dict / form inputs. Pairs with backend `get_raw_invocation_parameters` + SDK kwargs
 * builders in `playground_clients.py` / `invocation_translators.py`.
 */

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

/**
 * Best-effort OpenAI API classification from recorded invocation parameter keys.
 *
 * When the parameter bag contains no API-distinguishing signals (generic keys only,
 * unparseable payload, or empty), defaults to `RESPONSES` — the newer API surface
 * Phoenix targets by default. Users can flip the API type in the playground after replay.
 */
export function inferOpenAIApiTypeFromAttributes(
  invocationParameters: unknown
): OpenAIApiType {
  const ambiguousDefault: OpenAIApiType = "RESPONSES";
  let raw: Record<string, unknown> | null = null;
  if (typeof invocationParameters === "string") {
    try {
      raw = JSON.parse(invocationParameters) as Record<string, unknown>;
    } catch {
      return ambiguousDefault;
    }
  } else if (isPlainObject(invocationParameters)) {
    raw = invocationParameters;
  }
  if (!raw) {
    return ambiguousDefault;
  }
  const keys = new Set(Object.keys(raw));

  const responsesSignals =
    keys.has("max_output_tokens") ||
    keys.has("instructions") ||
    keys.has("previous_response_id") ||
    (isPlainObject(raw.reasoning) && !keys.has("reasoning_effort"));

  if (responsesSignals) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug("[inferOpenAIApiTypeFromAttributes]", {
        keys: [...keys],
        chosen: "RESPONSES",
        rule: "responses-leaning",
      });
    }
    return "RESPONSES";
  }

  const chatSignals =
    keys.has("max_completion_tokens") ||
    keys.has("stop") ||
    keys.has("frequency_penalty") ||
    keys.has("presence_penalty");

  if (chatSignals) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug("[inferOpenAIApiTypeFromAttributes]", {
        keys: [...keys],
        chosen: "CHAT_COMPLETIONS",
        rule: "chat-leaning",
      });
    }
    return "CHAT_COMPLETIONS";
  }

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[inferOpenAIApiTypeFromAttributes]", {
      keys: [...keys],
      chosen: ambiguousDefault,
      rule: "default",
    });
  }
  return ambiguousDefault;
}
