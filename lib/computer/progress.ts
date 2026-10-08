import { computerLessons, type WindowsVersion } from "./course";

export const computerProgressKey = "jeff-computer-basics-v1";
export type ComputerProgress = {
  current: string;
  version: WindowsVersion;
  completed: string[];
  notes: Record<string, string>;
  spoken: boolean;
};

export function readComputerProgress(raw: string | null): ComputerProgress {
  const defaults: ComputerProgress = {
    current: computerLessons[0].id,
    version: "11",
    completed: [],
    notes: {},
    spoken: true,
  };
  try {
    const value = JSON.parse(raw || "null");
    if (!value || typeof value !== "object") return defaults;
    const ids = new Set(computerLessons.map((lesson) => lesson.id));
    const notes: Record<string, string> = {};
    for (const lesson of computerLessons) {
      const note = value.notes?.[lesson.id];
      if (typeof note === "string" && note.length <= 20000)
        notes[lesson.id] = note;
    }
    return {
      current: ids.has(value.current) ? value.current : defaults.current,
      version: value.version === "10" ? "10" : "11",
      completed: Array.isArray(value.completed)
        ? [
            ...new Set<string>(
              value.completed.filter(
                (id: unknown) => typeof id === "string" && ids.has(id),
              ),
            ),
          ]
        : [],
      notes,
      spoken: value.spoken !== false,
    };
  } catch {
    return defaults;
  }
}
