import type { WebLesson } from "./types";
import { starter, type Playground } from "./preview";
export const webProgressKey = "jeff-web-development-v1";
export type WebProgress = {
  current: string;
  completed: string[];
  level: "beginner" | "intermediate" | "advanced";
  spoken: boolean;
  code: Playground;
};
export function readWebProgress(
  raw: string | null,
  lessons: WebLesson[],
): WebProgress {
  const defaults: WebProgress = {
    current: lessons[0].id,
    completed: [],
    level: "beginner",
    spoken: true,
    code: { ...starter },
  };
  try {
    const value = JSON.parse(raw || "null");
    if (!value || typeof value !== "object") return defaults;
    const ids = new Set(lessons.map((lesson) => lesson.id));
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
      level: ["intermediate", "advanced"].includes(value.level)
        ? value.level
        : "beginner",
      spoken: value.spoken !== false,
      code: Object.fromEntries(
        Object.entries(starter).map(([key, fallback]) => [
          key,
          typeof value.code?.[key] === "string" &&
          value.code[key].length <= 20000
            ? value.code[key]
            : fallback,
        ]),
      ) as Playground,
    };
  } catch {
    return defaults;
  }
}
