import { z } from "zod";
import { guard, jsonBody, apiError, HttpError } from "@/lib/server";
import { respondLocal } from "@/lib/local/ollama";
import {
  computerLessons,
  computerReviewed,
  computerSteps,
} from "@/lib/computer/course";

export const runtime = "nodejs";
export const maxDuration = 120;
const schema = z.object({
  lessonId: z.string().max(60),
  version: z.enum(["11", "10"]),
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

export async function POST(request: Request) {
  try {
    await guard(request, "computer-tutor", 15);
    const data = schema.parse(await jsonBody(request, 22000));
    const lesson = computerLessons.find((item) => item.id === data.lessonId);
    if (!lesson)
      throw new HttpError(400, "Choose a PC and Windows lesson first.");
    if (data.messages.at(-1)?.role !== "user")
      throw new HttpError(400, "Please ask a question.");
    const messages: typeof data.messages = [];
    let characters = 0;
    for (const message of [...data.messages].reverse()) {
      if (characters + message.content.length > 4500) break;
      messages.unshift(message);
      characters += message.content.length;
    }
    const context = [
      "You are JEFF, a patient beginner PC and Windows tutor running locally. Reply in at most 40 words with one or two useful next steps. Use plain English; do not repeat the question. Use the supplied lesson. If the screen or device is unclear, ask one short clarifying question. Give a hint before an exercise solution unless asked for the solution.",
      "You cannot see the learner's screen, control their computer or open their files. Never claim you performed an action. Only explain steps supported by the lesson; if information is missing, say so and direct them to its Microsoft reference. Do not guess buttons or recommend commands, registry edits, disabling security, resetting Windows, deleting system files or unknown repair downloads. Never ask for passwords, PINs or verification codes. For unrelated topics, guide the learner back to this course.",
      `Learner selected Windows ${data.version}; follow this version, not the OS hosting JEFF. Reference review: ${computerReviewed}. Lesson: ${lesson.title}. Goal: ${lesson.goal}.`,
      data.version === "10"
        ? "Standard Windows 10 support ended 14 October 2025. ESU and specialised editions have separate terms; do not claim all Windows 10 installations still receive regular security fixes."
        : "",
      computerSteps(lesson, data.version).join("\n"),
      `Practice: ${lesson.exercise}\nHint: ${lesson.hint}`,
      `Official reference: ${lesson.reference.url}`,
    ]
      .filter(Boolean)
      .join("\n\n");
    const answer = await respondLocal(messages, request.signal, context);
    return Response.json(
      {
        ...answer,
        sources: [
          {
            id: lesson.id,
            title: lesson.title,
            url: `/computer-basics?lesson=${lesson.id}`,
          },
        ],
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
