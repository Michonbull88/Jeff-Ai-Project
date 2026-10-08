import { misunderstandingMessage } from "@/lib/assistantFallback";
import { z } from "zod";
import { guard, jsonBody, apiError, HttpError } from "@/lib/server";
import { respondLocal } from "@/lib/local/ollama";
import { loadWebLibrary, webSearchIndex } from "@/lib/tutoring/library";
import { searchLessons } from "@/lib/tutoring/retrieval";
import { knowledgeSource, webTutorContext } from "@/lib/tutoring/context";
export const runtime = "nodejs";
export const maxDuration = 120;
const schema = z.object({
  lessonId: z.string().max(60),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(3000),
      }),
    )
    .min(1)
    .max(6),
});
export async function POST(req: Request) {
  try {
    await guard(req, "web-tutor", 15);
    const data = schema.parse(await jsonBody(req, 22000));
    const question = data.messages.at(-1);
    if (question?.role !== "user")
      throw new HttpError(400, "Please ask a question.");
    const { lessons, fingerprint } = await loadWebLibrary();
    const current = lessons.find((lesson) => lesson.id === data.lessonId);
    if (!current)
      throw new HttpError(400, "Choose a web-development lesson first.");
    const index = await webSearchIndex(lessons, fingerprint);
    let found = searchLessons(index, lessons, question.content);
    // Short follow-ups can rely on the current lesson; unrelated substantive questions cannot.
    const followUp =
      /^(?:why|how so|what next|another example|explain (?:this|that|it)|show (?:me )?(?:an? )?example|help(?: me)?(?: with)? (?:this|the exercise)|give (?:me )?a hint)[?.!\s]*$/i.test(
        question.content.trim(),
      );
    if (followUp)
      found = [{ lesson: current, score: 1 }];
    if (!found.length)
      return Response.json(
        {
          content: misunderstandingMessage,
          sources: [],
          grounded: false,
          live: false,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    const selected = found.map((result) => result.lesson);
    const history: typeof data.messages = [];
    let characters = 0;
    for (const message of [...data.messages].reverse()) {
      if (characters + message.content.length > 4000) break;
      history.unshift(message);
      characters += message.content.length;
    }
    const result = await respondLocal(
      history,
      req.signal,
      webTutorContext(selected, current, data.level),
    );
    const understood = result.content !== misunderstandingMessage;
    return Response.json(
      { ...result, sources: understood ? selected.map(knowledgeSource) : [], grounded: understood },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
