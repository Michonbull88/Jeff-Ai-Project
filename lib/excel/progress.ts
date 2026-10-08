import { lessons, type ExcelVersion } from "./course";
export const progressKey = "jeff-excel-progress-v1";
export type Progress = {
  current: string;
  completed: string[];
  version: ExcelVersion;
};
export const initialProgress: Progress = {
  current: lessons[0].id,
  completed: [],
  version: "modern",
};
export function parseProgress(raw: string | null): Progress {
  try {
    const value = JSON.parse(raw || "null");
    if (!value || typeof value !== "object") return initialProgress;
    const ids = new Set(lessons.map((l) => l.id));
    return {
      current: ids.has(value.current) ? value.current : lessons[0].id,
      completed: Array.isArray(value.completed)
        ? [
            ...new Set<string>(
              value.completed.filter(
                (id: unknown) => typeof id === "string" && ids.has(id),
              ),
            ),
          ]
        : [],
      version: value.version === "legacy" ? "legacy" : "modern",
    };
  } catch {
    return initialProgress;
  }
}
