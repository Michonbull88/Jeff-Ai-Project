import { z } from "zod";
import { guard, jsonBody, apiError, HttpError } from "@/lib/server";
import { respondLocal } from "@/lib/local/ollama";
import { lessons, lessonForVersion, practiceRows } from "@/lib/excel/course";
export const runtime = "nodejs";
export const maxDuration = 120;
const schema = z.object({
  lessonId: z.string().max(40),
  version: z.enum(["modern", "legacy"]),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2000),
      }),
    )
    .min(1)
    .max(8),
});
export async function POST(req: Request) {
  try {
    await guard(req, "tutor", 15);
    const data = schema.parse(await jsonBody(req, 20000));
    const base = lessons.find((lesson) => lesson.id === data.lessonId);
    if (!base) throw new HttpError(400, "Choose a lesson first.");
    if (data.messages.at(-1)?.role !== "user")
      throw new HttpError(400, "Please ask a question.");
    const lesson = lessonForVersion(base, data.version);
    const context = [
      "You are JEFF, a patient Excel tutor running locally. Answer in at most 80 words. Be concise; finish your explanation within that limit. Teach one small step at a time. Do not claim to see or edit the user's workbook. You have no internet or external tools. Focus on Excel. Ask for clarification when necessary. Give a hint before an exercise solution unless the user asks for the solution. Never claim an answer has been checked in Excel.",
      `Excel version: ${data.version === "modern" ? "Microsoft 365 / Excel 2021 or later" : "Excel 2016/2019; no XLOOKUP or dynamic arrays"}. Use English function names and explain semicolon separators when relevant.`,
      `Practice sheet begins at A1:\n${practiceRows.map((row) => row.join(" | ")).join("\n")}`,
      `Current lesson: ${lesson.title}\n${lesson.steps.join("\n")}\nExample: ${lesson.example}\nExercise: ${lesson.task}\nHint: ${lesson.hint}\nAnswer: ${lesson.answer}\nExplanation: ${lesson.explanation}`,
    ].join("\n\n");
    return Response.json(
      await respondLocal(data.messages, req.signal, context),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
