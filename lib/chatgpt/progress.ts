import { chatgptLessons } from "./course";

export const chatgptProgressKey = "jeff-chatgpt-basics-v1";
export type LessonDraft = { prompt: string; notes: string };
export type ChatGPTProgress = {
  current: string;
  completed: string[];
  drafts: Record<string, LessonDraft>;
  spoken: boolean;
};

export function readChatGPTProgress(raw: string | null): ChatGPTProgress {
  const defaults: ChatGPTProgress = {
    current: chatgptLessons[0].id,
    completed: [],
    drafts: {},
    spoken: true,
  };
  try {
    const value = JSON.parse(raw || "null");
    if (!value || typeof value !== "object") return defaults;
    const ids = new Set(chatgptLessons.map((lesson) => lesson.id));
    const drafts: Record<string, LessonDraft> = {};
    for (const lesson of chatgptLessons) {
      const draft = value.drafts?.[lesson.id];
      if (draft && typeof draft === "object") {
        drafts[lesson.id] = {
          prompt:
            typeof draft.prompt === "string" && draft.prompt.length <= 12000
              ? draft.prompt
              : lesson.prompt,
          notes:
            typeof draft.notes === "string" && draft.notes.length <= 20000
              ? draft.notes
              : "",
        };
      }
    }
    return {
      current: ids.has(value.current) ? value.current : defaults.current,
      completed: Array.isArray(value.completed)
        ? [
            ...new Set<string>(
              value.completed.filter(
                (id: unknown) => typeof id === "string" && ids.has(id),
              ),
            ),
          ]
        : [],
      drafts,
      spoken: value.spoken !== false,
    };
  } catch {
    return defaults;
  }
}
