"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getJeffVoice, applyJeffVoice } from "@/lib/speech/voice";

export function useLocalNarration() {
  const [available, setAvailable] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState("");
  const voice = useRef<SpeechSynthesisVoice | null>(null);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const frame = useRef<number | null>(null);
  const wordStarted = useRef(0);
  const stopMotion = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    setSpeaking(false);
    setAudioLevel(0);
  }, []);
  const startMotion = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    setSpeaking(true);
    wordStarted.current = performance.now();
    let last = 0;
    const animate = (time: number) => {
      if (time - last >= 40) {
        // Browser narration exposes no waveform. Approximate syllables between
        // word boundary events, including voices that never emit boundaries.
        const elapsed = (time - wordStarted.current) / 1000;
        const syllable = Math.max(0, Math.sin(elapsed * 24));
        const emphasis = 0.65 + 0.35 * Math.sin(elapsed * 9 + 0.8) ** 2;
        setAudioLevel(0.04 + syllable * emphasis * 0.9);
        last = time;
      }
      frame.current = requestAnimationFrame(animate);
    };
    frame.current = requestAnimationFrame(animate);
  }, []);
  const stop = useCallback(() => {
    utterance.current = null;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    stopMotion();
  }, [stopMotion]);
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const refresh = () => {
      voice.current = getJeffVoice(synth.getVoices());
      setAvailable(!!voice.current);
    };
    refresh();
    synth.addEventListener("voiceschanged", refresh);
    return () => {
      synth.removeEventListener("voiceschanged", refresh);
      utterance.current = null;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
      synth.cancel();
    };
  }, []);
  const speak = useCallback(
    (text: string) => {
      stop();
      setError("");
      if (!voice.current) {
        setError(
          "No local English voice is available. Install one in your computer's speech settings.",
        );
        return;
      }
      const item = new SpeechSynthesisUtterance(text.replace(/[*#`]/g, ""));
      utterance.current = item;
      applyJeffVoice(item, voice.current);
      item.onstart = () => {
        if (utterance.current === item) startMotion();
      };
      item.onboundary = (event) => {
        if (utterance.current === item && event.name === "word")
          wordStarted.current = performance.now();
      };
      item.onpause = () => {
        if (utterance.current === item) stopMotion();
      };
      item.onresume = () => {
        if (utterance.current === item) startMotion();
      };
      item.onend = () => {
        if (utterance.current === item) {
          utterance.current = null;
          stopMotion();
        }
      };
      item.onerror = () => {
        if (utterance.current === item) {
          utterance.current = null;
          stopMotion();
          setError(
            "Voice playback stopped. Click Read answer or Read lesson to try again.",
          );
        }
      };
      window.speechSynthesis.speak(item);
    },
    [stop, startMotion, stopMotion],
  );
  return { available, speaking, audioLevel, error, speak, stop };
}
