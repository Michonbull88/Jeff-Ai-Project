"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Phase = "idle" | "permission" | "recording" | "transcribing";
type Session = {
  controller: AbortController;
  stream?: MediaStream;
  recorder?: MediaRecorder;
  context?: AudioContext;
  interval?: ReturnType<typeof setInterval>;
  timeout?: ReturnType<typeof setTimeout>;
};

function release(session: Session) {
  clearInterval(session.interval);
  clearTimeout(session.timeout);
  if (session.recorder) {
    session.recorder.onstop = null;
    session.recorder.ondataavailable = null;
    session.recorder.onerror = null;
    if (session.recorder.state !== "inactive") session.recorder.stop();
  }
  session.stream?.getTracks().forEach((track) => track.stop());
  if (session.context && session.context.state !== "closed")
    void session.context.close().catch(() => {});
}

export function useRecordedMicrophone(onQuestion: (text: string) => void) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");
  const current = useRef<Session | null>(null);
  const callback = useRef(onQuestion);
  useEffect(() => { callback.current = onQuestion; }, [onQuestion]);
  const discard = useCallback(() => {
    const session = current.current;
    current.current = null;
    if (session) {
      session.controller.abort();
      release(session);
    }
  }, []);
  const cancel = useCallback(() => {
    discard();
    setPhase("idle");
    setTranscript("");
    setError("");
  }, [discard]);
  useEffect(() => discard, [discard]);

  const stop = useCallback(() => {
    const session = current.current;
    if (session?.recorder?.state === "recording") {
      clearInterval(session.interval);
      clearTimeout(session.timeout);
      setPhase("transcribing");
      session.recorder.stop();
      session.stream?.getTracks().forEach((track) => track.stop());
    }
  }, []);

  const start = useCallback(async () => {
    if (current.current) return;
    setError("");
    setTranscript("");
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError("Microphone recording needs a supported browser on localhost or HTTPS. Open JEFF in Chrome at http://127.0.0.1:3000.");
      return;
    }
    window.speechSynthesis?.cancel();
    const session: Session = { controller: new AbortController() };
    current.current = session;
    setPhase("permission");
    session.timeout = setTimeout(() => {
      if (current.current !== session) return;
      cancel();
      setError("Microphone permission is still pending. Allow access in the browser, then click the microphone again.");
    }, 30000);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: { ideal: 1 },
          sampleRate: { ideal: 48000 },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if (current.current !== session) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      clearTimeout(session.timeout);
      session.stream = stream;
      const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"]
        .find((type) => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error("This browser cannot record a supported audio format. Try Chrome.");
      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });
      session.recorder = recorder;
      const chunks: Blob[] = [];
      let bytes = 0;
      recorder.ondataavailable = ({ data }) => {
        if (current.current !== session || !data.size) return;
        bytes += data.size;
        if (bytes > 4 * 1024 * 1024) {
          cancel();
          setError("The recording is too large. Please ask a shorter question.");
          return;
        }
        chunks.push(data);
      };
      recorder.onerror = () => {
        if (current.current !== session) return;
        cancel();
        setError("Microphone recording failed. Check your input device and try again.");
      };
      recorder.onstop = async () => {
        if (current.current !== session) return;
        release(session);
        setPhase("transcribing");
        try {
          const audio = new Blob(chunks, { type: mimeType });
          if (!audio.size) throw new Error("No audio was recorded. Check your microphone and try again.");
          const response = await fetch("/api/transcribe", {
            method: "POST", headers: { "Content-Type": mimeType }, body: audio,
            signal: AbortSignal.any([session.controller.signal, AbortSignal.timeout(70000)]),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Local speech recognition failed. Please try again.");
          if (typeof result.text !== "string" || !result.text.trim())
            throw new Error("No speech was detected. Check your microphone input and try again.");
          if (current.current !== session) return;
          current.current = null;
          setPhase("idle");
          setTranscript(result.text);
          callback.current(result.text);
        } catch (cause) {
          if (current.current !== session) return;
          current.current = null;
          setPhase("idle");
          setError(cause instanceof Error && cause.name === "TimeoutError"
            ? "Local speech recognition took too long. Try a shorter question."
            : cause instanceof Error ? cause.message : "Could not transcribe your question.");
        }
      };
      recorder.start(250);
      setPhase("recording");
      session.timeout = setTimeout(stop, 60000);
      // Silence detection is optional; Stop and send always works without it.
      try {
        const context = new AudioContext();
        session.context = context;
        await context.resume();
        if (current.current !== session || recorder.state !== "recording") return;
        const analyser = context.createAnalyser();
        analyser.fftSize = 2048;
        context.createMediaStreamSource(stream).connect(analyser);
        const samples = new Float32Array(analyser.fftSize);
        const began = Date.now();
        let lastSound = began;
        let speechFrames = 0;
        session.interval = setInterval(() => {
          if (current.current !== session || recorder.state !== "recording") return;
          analyser.getFloatTimeDomainData(samples);
          const rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
          const now = Date.now();
          if (rms > 0.008) { speechFrames++; lastSound = now; }
          // Leave room for a learner to think mid-sentence without cutting off
          // the end of their question. Stop and send remains immediately available.
          if (speechFrames >= 3 && now - lastSound > 4200) stop();
          else if (!speechFrames && now - began > 12000) {
            cancel();
            setError("No microphone sound was detected. Check your system sound input settings and select the microphone you are using.");
          }
        }, 100);
      } catch {
        // Recording still works if Web Audio is unavailable.
      }
    } catch (cause) {
      if (current.current !== session) return;
      cancel();
      setError(cause instanceof Error && cause.name === "NotAllowedError"
        ? "Microphone access was denied. Allow it in your browser and system privacy settings, then try again."
        : cause instanceof Error && cause.name === "NotFoundError"
          ? "No microphone was detected. Connect a microphone and try again."
          : cause instanceof Error ? cause.message : "Could not start the microphone.");
    }
  }, [cancel, stop]);

  return {
    active: phase !== "idle", listening: phase === "recording",
    transcribing: phase === "transcribing", local: true,
    statusText: phase === "transcribing" ? "Transcribing on this computer…"
      : phase === "recording" ? "Listening on this computer… Speak, then pause or click Stop and send."
        : "Waiting for microphone permission…",
    transcript, error, start, stop, cancel,
  };
}
