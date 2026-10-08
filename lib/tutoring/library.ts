import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { WebLesson } from "./types";
import { createSearchIndex, type SearchIndex } from "./retrieval";

export const libraryDirectory = path.join(
  process.cwd(),
  "knowledge",
  "web-development",
);
const text = z.string().min(1).max(6000);
const schema = z
  .object({
    id: z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .max(60),
    order: z.number().int().positive(),
    title: text,
    group: text,
    keywords: z.array(text).min(1).max(30),
    goal: text,
    explanation: z.array(text).min(1).max(12),
    code: z.string().max(12000),
    language: text,
    exercise: text,
    hint: text,
    quiz: z.object({
      question: text,
      options: z.array(text).min(2).max(6),
      correct: z.number().int().nonnegative(),
      explanation: text,
    }),
    reference: z.object({
      title: text,
      url: z.url().refine((value) => new URL(value).protocol === "https:"),
    }),
  })
  .refine(
    (lesson) => lesson.quiz.correct < lesson.quiz.options.length,
    "Quiz answer is outside the available choices",
  );
export async function loadWebLibrary(): Promise<{
  lessons: WebLesson[];
  fingerprint: string;
}> {
  const files = (await readdir(libraryDirectory))
    .filter((file) => /^\d+-[a-z0-9-]+\.json$/.test(file))
    .sort();
  if (!files.length)
    throw new Error("The local web-development course library is empty.");
  const raw = await Promise.all(
    files.map((file) => readFile(path.join(libraryDirectory, file), "utf8")),
  );
  const lessons = raw
    .map((contents, i) => {
      const parsed = schema.safeParse(JSON.parse(contents));
      if (!parsed.success) throw new Error(`Invalid course file: ${files[i]}`);
      return parsed.data;
    })
    .sort((a, b) => a.order - b.order);
  if (new Set(lessons.map((lesson) => lesson.id)).size !== lessons.length)
    throw new Error("Duplicate course lesson ids.");
  return {
    lessons,
    fingerprint: createHash("sha256").update(raw.join("\n")).digest("hex"),
  };
}
let cached: SearchIndex | undefined;
export async function webSearchIndex(
  lessons: WebLesson[],
  fingerprint: string,
) {
  if (cached?.fingerprint === fingerprint) return cached;
  // Index is an optimisation only. Course files are the source of truth.
  // Validate a saved index against a rebuilt one, so edits cannot leave stale retrieval.
  const rebuilt = createSearchIndex(lessons, fingerprint);
  try {
    const saved = JSON.parse(
      await readFile(path.join(libraryDirectory, "search-index.json"), "utf8"),
    );
    cached =
      JSON.stringify(saved) === JSON.stringify(rebuilt) ? saved : rebuilt;
  } catch {
    cached = rebuilt;
  }
  return cached!;
}
