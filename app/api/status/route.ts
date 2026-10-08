import { isLocked } from "@/lib/server";
import { checkOllamaModel, ollamaModelName } from "@/lib/local/ollama";
import { localTranscriptionAvailable } from "@/lib/local/transcription";
export const dynamic = "force-dynamic";
export async function GET() {
  const [configured, localSpeechAvailable] = await Promise.all([
    checkOllamaModel(),
    localTranscriptionAvailable(),
  ]);
  return Response.json(
    {
      configured,
      localSpeechAvailable,
      locked: await isLocked(),
      voiceConfigured:
        process.env.JEFF_ENABLE_OPENAI === "true" &&
        !!process.env.OPENAI_API_KEY,
      model: ollamaModelName(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
