import { guard, jsonBody, apiError } from "@/lib/server";
import { chatSchema } from "@/lib/validation";
import { answerNameQuestion } from "@/lib/openai/identity";
import { answerJohannesburgWeather } from "@/lib/weather/answer";
import { respondLocal } from "@/lib/local/ollama";
import { performDesktopAction } from "@/lib/local/desktopActions";
export const runtime = "nodejs";
export const maxDuration = 120;
export async function POST(req: Request) {
  try {
    await guard(req, "chat");
    const { messages } = chatSchema.parse(await jsonBody(req));
    const desktopAction = await performDesktopAction(messages, req);
    if (desktopAction)
      return Response.json(desktopAction, {
        headers: { "Cache-Control": "no-store" },
      });
    const nameAnswer = answerNameQuestion(messages);
    const answer =
      nameAnswer ||
      (await answerJohannesburgWeather(messages, req.signal)) ||
      (await respondLocal(messages, req.signal));
    return Response.json(answer, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return apiError(e);
  }
}
