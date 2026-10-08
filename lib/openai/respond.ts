import "server-only";
import OpenAI from "openai";
import { personality } from "./personality";
import { answerNameQuestion } from "./identity";
import { excelTutorInstructions, isExcelConversation } from "./excelTutor";
import { safeUrl } from "@/lib/validation";
import { answerJohannesburgWeather } from "@/lib/weather/answer";
import { weatherTool } from "@/lib/weather/tool";
import { getWeather } from "@/lib/weather/forecast";
import type { Source } from "@/types";
export async function respond(
  messages: { role: "user" | "assistant"; content: string }[],
  search = false,
  signal?: AbortSignal,
) {
  if (!search) {
    const nameAnswer = answerNameQuestion(messages);
    if (nameAnswer) return nameAnswer;
    const weatherAnswer = await answerJohannesburgWeather(messages, signal);
    if (weatherAnswer) return weatherAnswer;
  }
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 55000,
    maxRetries: 1,
  });
  const input: OpenAI.Responses.ResponseInput = [...messages];
  const excelInstructions = isExcelConversation(messages)
    ? `\n${excelTutorInstructions}`
    : "";
  const sources: Source[] = [];
  let live = false;
  const addSource = (source: Source) => {
    const url = safeUrl(source.url);
    if (url && !sources.some((s) => s.url === url))
      sources.push({ ...source, url });
  };
  // Bound tool rounds so failed or repeated lookups cannot loop indefinitely.
  for (let round = 0; round < 3; round++) {
    const result = await client.responses.create(
      {
        model: process.env.OPENAI_TEXT_MODEL || "gpt-4.1",
        instructions: `${personality}${excelInstructions}\nToday's UTC date is ${new Date().toISOString().slice(0, 10)}. Cite weather tool data with its supplied source URL.`,
        input,
        tools: search
          ? [{ type: "web_search" }]
          : [{ type: "web_search" }, { ...weatherTool, strict: true }],
        tool_choice:
          round === 2 ? "none" : search && round === 0 ? "required" : "auto",
        max_output_tokens: 2400,
        store: false,
      },
      { signal },
    );
    live ||= result.output.some((item) => item.type === "web_search_call");
    for (const item of result.output)
      if (item.type === "message")
        for (const part of item.content)
          if (part.type === "output_text")
            for (const annotation of part.annotations)
              if (annotation.type === "url_citation")
                addSource({
                  url: annotation.url,
                  title: annotation.title || "Source",
                });
    const calls = result.output.filter((item) => item.type === "function_call");
    if (!calls.length) {
      if (!result.output_text?.trim()) throw new Error("Empty model output");
      return { content: result.output_text, sources, live };
    }
    for (const item of result.output) {
      if (
        item.type === "message" ||
        item.type === "function_call" ||
        item.type === "reasoning" ||
        item.type === "web_search_call"
      )
        input.push(item);
    }
    for (const call of calls) {
      let output: unknown;
      try {
        if (call.name !== "get_weather") throw new Error("Unknown tool");
        const weather = await getWeather(JSON.parse(call.arguments), signal);
        output = weather;
        live ||= weather.live;
        weather.sources.forEach(addSource);
      } catch {
        if (signal?.aborted) throw signal.reason;
        output = {
          error:
            "Weather could not be retrieved. Do not invent conditions. Ask for a clearer location if needed, or try web search with the known city.",
        };
      }
      input.push({
        type: "function_call_output",
        call_id: call.call_id,
        output: JSON.stringify(output),
      });
    }
  }
  throw new Error("No final response after tool calls");
}
