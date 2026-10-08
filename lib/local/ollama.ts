import { misunderstandingInstruction } from "@/lib/assistantFallback";
import { HttpError } from "@/lib/server";
import {
  excelTutorInstructions,
  isExcelConversation,
} from "@/lib/openai/excelTutor";
import { personality } from "@/lib/openai/personality";
import type { Message } from "@/types";
import { answerWithMemory } from "./answerMemory";
import { questionMessages } from "./question";

const defaultBaseUrl = "http://127.0.0.1:11434";
const timeoutMs = 110_000;

type OllamaModel = { name?: string; model?: string };
type OllamaChatResponse = {
  message?: { content?: string };
  error?: string;
};

function baseUrl() {
  const raw = process.env.OLLAMA_BASE_URL || defaultBaseUrl;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new HttpError(
      500,
      "OLLAMA_BASE_URL must be a valid local Ollama URL.",
    );
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname)
  )
    throw new HttpError(
      500,
      "For privacy, JEFF only connects to an Ollama service running on this computer.",
    );
  return url.origin;
}

export function ollamaModelName() {
  return process.env.OLLAMA_MODEL?.trim() || "qwen3:1.7b";
}

function ollamaSignal(signal?: AbortSignal) {
  return signal
    ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
    : AbortSignal.timeout(timeoutMs);
}

export async function checkOllamaModel(signal?: AbortSignal) {
  try {
    const response = await fetch(`${baseUrl()}/api/tags`, {
      cache: "no-store",
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(1800)])
        : AbortSignal.timeout(1800),
    });
    if (!response.ok) return false;
    const data = (await response.json()) as { models?: OllamaModel[] };
    const expected = ollamaModelName();
    return (data.models || []).some(
      (model) => (model.name || model.model) === expected,
    );
  } catch {
    return false;
  }
}

export async function respondLocal(
  messages: Pick<Message, "role" | "content">[],
  signal?: AbortSignal,
  tutorContext?: string,
) {
  // Standalone questions are answered on their own. This keeps unrelated prior
  // topics out of both the prompt and the saved-answer lookup.
  messages = questionMessages(messages);
  const model = ollamaModelName();
  const system =
    tutorContext ||
    [
      personality,
      "You are running as a local model. You do not have live web search or external tools in this chat. Be transparent when information may be out of date and never claim to have browsed.",
      isExcelConversation(messages) ? excelTutorInstructions : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  const generate = async () => {
    let response: Response;
    try {
      response = await fetch(`${baseUrl()}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: `${system}\n\n${misunderstandingInstruction}`,
            },
            ...messages.map(({ role, content }) => ({ role, content })),
          ],
          stream: false,
          think: false,
          keep_alive: "10m",
          options: {
            temperature: 0.3,
            num_ctx: 4096,
            num_predict: tutorContext ? 220 : 400,
          },
        }),
        signal: ollamaSignal(signal),
        cache: "no-store",
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      if (error instanceof Error && error.name === "TimeoutError")
        throw new HttpError(
          504,
          "The local model took too long. Try a shorter question or a smaller Ollama model. Guided lesson hints still work.",
        );
      throw new HttpError(
        503,
        "JEFF can't reach Ollama. Open the Ollama app and make sure the local model is installed, then try again.",
      );
    }
    const data = (await response
      .json()
      .catch(() => ({}))) as OllamaChatResponse;
    if (!response.ok) {
      if (response.status === 404 || /not found|pull/i.test(data.error || ""))
        throw new HttpError(
          503,
          `The local model ${model} is not installed. Run ollama pull ${model}, then try again.`,
        );
      throw new HttpError(
        502,
        "The local model couldn't complete that answer. Please try again.",
      );
    }
    const content = data.message?.content?.trim();
    if (!content)
      throw new HttpError(502, "The local model returned an empty answer.");
    return { content, sources: [], live: false };
  };
  const result = await answerWithMemory(
    {
      model,
      system: `${system}\n\n${misunderstandingInstruction}`,
      messages: messages.map(({ role, content }) => ({ role, content })),
    },
    generate,
    { signal },
  );
  return { ...result, sources: [], live: false };
}
