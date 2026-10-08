import { z } from "zod";
import { weatherTool } from "@/lib/weather/tool";
import { openAIErrorMessage } from "@/lib/openai/errors";
import {
  guard,
  jsonBody,
  apiError,
  HttpError,
  requireOpenAIKey,
} from "@/lib/server";
import { personality, voices } from "@/lib/openai/personality";
import { excelTutorInstructions } from "@/lib/openai/excelTutor";
const schema = z.object({
  sdp: z.string().min(10).max(60000).startsWith("v=0"),
  voice: z.enum(voices).default("cedar"),
});
export const runtime = "nodejs";
export const maxDuration = 30;
export async function POST(req: Request) {
  try {
    await guard(req, "realtime", 8);
    requireOpenAIKey();
    const { sdp, voice } = schema.parse(await jsonBody(req, 70000));
    const body = new FormData();
    body.set("sdp", sdp);
    body.set(
      "session",
      JSON.stringify({
        type: "realtime",
        model: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",
        instructions: `${personality}\n${excelTutorInstructions}\nUse get_weather for weather and search_web for other current information. Make the query self-contained, using the conversation context. For Johannesburg, pass country_code ZA. Today is ${new Date().toISOString().slice(0, 10)}.`,
        audio: {
          input: {
            transcription: { model: "gpt-4o-mini-transcribe" },
            turn_detection: {
              type: "semantic_vad",
              eagerness: "auto",
              create_response: true,
              interrupt_response: true,
            },
          },
          output: { voice },
        },
        tools: [
          weatherTool,
          {
            type: "function",
            name: "search_web",
            description:
              "Search the live web for current facts. Use for news, weather, prices, versions, current people and other time-sensitive information.",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "A self-contained search question with context",
                },
              },
              required: ["query"],
              additionalProperties: false,
            },
          },
        ],
        tool_choice: "auto",
        max_output_tokens: 1800,
      }),
    );
    const response = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body,
      signal: AbortSignal.any([req.signal, AbortSignal.timeout(25000)]),
    });
    if (!response.ok) {
      const failure = await response.json().catch(() => null);
      const code =
        typeof failure?.error?.code === "string"
          ? failure.error.code
          : undefined;
      throw new HttpError(
        response.status === 429 ? 429 : 502,
        openAIErrorMessage(
          response.status,
          code,
          typeof failure?.error?.type === "string"
            ? failure.error.type
            : undefined,
        ),
      );
    }
    const answer = await response.text();
    if (!answer.startsWith("v=0")) throw new Error("Invalid SDP answer");
    return new Response(answer, {
      headers: {
        "Content-Type": "application/sdp",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
