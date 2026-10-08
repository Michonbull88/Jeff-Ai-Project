import "server-only";
import { execFile } from "node:child_process";
import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import os from "node:os";
import path from "node:path";
import { HttpError } from "@/lib/server";

// This optional Python runtime is installed on the host, not bundled with Next.js.
// Its interpreter symlinks may point outside the project's filesystem root.
const root = path.join(/* turbopackIgnore: true */ process.cwd(), ".jeff-data", "speech");
const python = process.platform === "win32"
  ? path.join(root, "venv", "Scripts", "python.exe")
  : path.join(root, "venv", "bin", "python");
const model = path.join(root, "model");
let running = false;

export async function localTranscriptionAvailable() {
  try {
    await Promise.all([
      access(python, constants.X_OK),
      access(path.join(root, "ready.json")),
      access(path.join(model, "model.bin")),
    ]);
    return true;
  } catch {
    return false;
  }
}

export async function transcribeRecording(audio: Buffer, signal: AbortSignal) {
  if (!(await localTranscriptionAvailable()))
    throw new HttpError(503, "Local speech recognition is not installed. Run JEFF's setup on this computer, then refresh.");
  if (running) throw new HttpError(429, "JEFF is transcribing another recording. Try again shortly.");
  signal.throwIfAborted();
  running = true;
  let directory: string | undefined;
  try {
    directory = await mkdtemp(path.join(os.tmpdir(), "jeff-speech-"));
    const file = path.join(directory, "recording");
    await writeFile(file, audio, { mode: 0o600 });
    return await new Promise<string>((resolve, reject) => {
      execFile(python, [path.join(process.cwd(), "scripts", "transcribe.py"), file, model], {
        timeout: 60000, maxBuffer: 64000, signal,
        env: { ...process.env, HF_HUB_OFFLINE: "1", HF_HUB_DISABLE_TELEMETRY: "1" },
      }, (error, stdout) => {
        if (signal.aborted) return reject(signal.reason);
        if (error) return reject(new HttpError(422, "Could not transcribe the recording. Speak clearly, keep it under one minute, then try again."));
        try {
          const result = JSON.parse(stdout);
          if (typeof result.text !== "string") throw new Error();
          if (!result.text.trim()) return reject(new HttpError(422, "No speech was detected. Check your microphone input and try again."));
          if (result.text.length > 2000) return reject(new HttpError(422, "Please ask a shorter spoken question."));
          resolve(result.text.trim());
        } catch {
          reject(new HttpError(502, "Local speech recognition returned an unreadable result. Please try again."));
        }
      });
    });
  } finally {
    running = false;
    if (directory) await rm(directory, { recursive: true, force: true });
  }
}
