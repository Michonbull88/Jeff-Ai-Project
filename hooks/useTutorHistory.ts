"use client";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  cached: z.boolean().optional(),
  sources: z
    .array(z.object({ id: z.string(), title: z.string(), url: z.string() }))
    .optional(),
});
export type TutorMessage = z.infer<typeof messageSchema>;

export function useTutorHistory(scope: string, enabled: boolean) {
  const key = `jeff-tutor-history-v1:${scope}`;
  const [state, setState] = useState<{ key: string; messages: TutorMessage[] }>(
    { key: "", messages: [] },
  );
  const [error, setError] = useState("");
  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => {
      try {
        const raw = localStorage.getItem(key);
        const messages = raw
          ? z.array(messageSchema).parse(JSON.parse(raw))
          : [];
        setState({ key, messages });
        setError("");
      } catch {
        setState({ key, messages: [] });
        setError(
          "Saved conversation could not be loaded. New questions will remain visible in this tab.",
        );
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [key, enabled]);
  const setMessages = useCallback(
    (messages: TutorMessage[]) => {
      setState({ key, messages });
      try {
        localStorage.setItem(key, JSON.stringify(messages));
        setError("");
      } catch {
        setError(
          "Browser conversation storage is full or unavailable. Keep this tab open to retain the visible conversation.",
        );
      }
    },
    [key],
  );
  return {
    messages: state.key === key ? state.messages : [],
    ready: enabled && state.key === key,
    setMessages,
    error,
  };
}
