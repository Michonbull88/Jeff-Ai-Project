import { guard, apiError, HttpError } from "@/lib/server";
import { transcribeRecording } from "@/lib/local/transcription";

export const runtime = "nodejs";
export const maxDuration = 70;
const maxBytes = 4 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    await guard(request, "transcribe", 12);
    if (!/^audio\/(webm|mp4|ogg|wav)(;|$)/i.test(request.headers.get("content-type") || ""))
      throw new HttpError(415, "Please send a microphone audio recording.");
    if (Number(request.headers.get("content-length")) > maxBytes)
      throw new HttpError(413, "Please keep spoken questions under one minute.");
    const reader = request.body?.getReader();
    if (!reader) throw new HttpError(400, "The microphone recording was empty.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) {
          await reader.cancel();
          throw new HttpError(413, "Please keep spoken questions under one minute.");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    if (!size) throw new HttpError(400, "The microphone recording was empty.");
    const text = await transcribeRecording(Buffer.concat(chunks), request.signal);
    return Response.json({ text }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
