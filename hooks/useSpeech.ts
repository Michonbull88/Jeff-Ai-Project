import { useCallback, useEffect, useRef, useState } from "react";
import type { Message } from "@/types";
import { getJeffVoice, applyJeffVoice } from "@/lib/speech/voice";

function plainText(markdown: string) {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[`*_>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function useSpeech(enabled: boolean, messages: Message[]) {
  const lastSpoken = useRef<string | null>(null);
  const greeted = useRef(false);
  const frame = useRef<number | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const stopMotion = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    setSpeaking(false);
    setAudioLevel(0);
  }, []);

  const startMotion = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    setSpeaking(true);
    let phase = 0;
    let last = 0;
    const animate = (time: number) => {
      if (frame.current === null) return;
      if (time - last >= 55) {
        // SpeechSynthesis exposes no waveform, so pulse the face with a speech-like envelope.
        phase += 0.57;
        setAudioLevel(0.2 + Math.abs(Math.sin(phase)) * 0.58);
        last = time;
      }
      frame.current = requestAnimationFrame(animate);
    };
    frame.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const latest = [...messages]
      .reverse()
      .find((message) => message.role === "assistant" && !message.pending);
    if (!enabled || !latest || latest.id === lastSpoken.current) {
      if (latest && !enabled) lastSpoken.current = latest.id;
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
      stopMotion();
      return;
    }

    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const text = plainText(latest.content);
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    applyJeffVoice(utterance, getJeffVoice(window.speechSynthesis.getVoices()));
    utterance.onstart = startMotion;
    utterance.onend = stopMotion;
    utterance.onerror = stopMotion;
    const timer = window.setTimeout(() => {
      lastSpoken.current = latest.id;
      window.speechSynthesis.speak(utterance);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      window.speechSynthesis?.cancel();
      stopMotion();
    };
  }, [enabled, messages, startMotion, stopMotion]);

  useEffect(() => {
    if (!enabled || greeted.current || !window.speechSynthesis) return;
    const greetOnTyping = (event: KeyboardEvent) => {
      if (
        greeted.current ||
        event.repeat ||
        event.key.length !== 1 ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return;
      greeted.current = true;
      window.speechSynthesis.cancel();
      const greeting = new SpeechSynthesisUtterance(
        "What can I assist you with today?",
      );
      applyJeffVoice(
        greeting,
        getJeffVoice(window.speechSynthesis.getVoices()),
      );
      greeting.onstart = startMotion;
      greeting.onend = stopMotion;
      greeting.onerror = stopMotion;
      window.speechSynthesis.speak(greeting);
    };
    window.addEventListener("keydown", greetOnTyping);
    return () => window.removeEventListener("keydown", greetOnTyping);
  }, [enabled, startMotion, stopMotion]);

  return { speaking, audioLevel };
}
