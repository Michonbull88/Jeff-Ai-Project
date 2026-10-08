"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRecordedMicrophone } from "./useRecordedMicrophone";

type Result = { isFinal: boolean; 0: { transcript: string } };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: { results: ArrayLike<Result> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
export function useMicrophone(onQuestion: (text: string) => void, local = false) {
  const recorded = useRecordedMicrophone(onQuestion);
  const browser = useBrowserMicrophone(onQuestion);
  return browser.active ? browser : local || recorded.active ? recorded : browser;
}

function useBrowserMicrophone(onQuestion: (text: string) => void) {
  const [active, setActive] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const current = useRef<Recognition | null>(null);
  const callback = useRef(onQuestion);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    callback.current = onQuestion;
  }, [onQuestion]);
  const cancel = useCallback(() => {
    const item = current.current;
    current.current = null;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    item?.abort();
    setActive(false);
    setListening(false);
    setTranscript("");
    setError("");
  }, []);
  useEffect(
    () => () => {
      const item = current.current;
      current.current = null;
      if (timer.current) clearTimeout(timer.current);
      item?.abort();
    },
    [],
  );
  const start = useCallback(() => {
    if (current.current) return;
    setError("");
    setTranscript("");
    const browser = window as SpeechWindow;
    const Constructor =
      browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if (!Constructor) {
      setError(
        "Microphone recognition is unavailable in this browser. Open JEFF in Chrome, or keep typing.",
      );
      return;
    }
    if (!window.isSecureContext) {
      setError(
        "Microphone access needs localhost or HTTPS. Open JEFF at http://127.0.0.1:3000.",
      );
      return;
    }
    window.speechSynthesis?.cancel();
    const item = new Constructor();
    current.current = item;
    let finalText = "";
    let failed = false;
    item.lang = "en-ZA";
    // Keep listening across natural pauses. Single-shot recognition often treats
    // a thinking pause as the end of the question and drops the final words.
    item.continuous = true;
    item.interimResults = true;
    item.maxAlternatives = 3;
    item.onstart = () => {
      if (current.current === item) setListening(true);
    };
    item.onresult = (event) => {
      if (current.current !== item) return;
      const results = Array.from(event.results);
      finalText = results
        .filter((result) => result.isFinal)
        .map((result) => result[0].transcript)
        .join(" ")
        .trim();
      setTranscript(
        results
          .map((result) => result[0].transcript)
          .join(" ")
          .trim(),
      );
    };
    item.onerror = (event) => {
      if (current.current !== item) return;
      failed = true;
      const errors: Record<string, string> = {
        "not-allowed":
          "Microphone access was denied. Allow the microphone in the browser's site settings and your computer's privacy settings, then try again.",
        "service-not-allowed":
          "Your browser has blocked speech recognition. Check its microphone permissions or type your question.",
        "audio-capture":
          "No microphone was detected. Connect your microphone and select it as the browser's default input device.",
        "no-speech":
          "I didn't hear a question. Click the microphone and try again.",
        network:
          "The browser's speech service could not connect, even if other websites work. Refresh JEFF to use local speech recognition if installed, or type your question.",
        "language-not-supported":
          "This browser does not support the selected speech language. You can still type your question.",
      };
      setError(
        errors[event.error] ||
          "Speech recognition stopped. Try the microphone again, or type your question.",
      );
      // Release even if the browser never delivers its end event after an error.
      current.current = null;
      if (timer.current) clearTimeout(timer.current);
      setActive(false);
      setListening(false);
      item.abort();
    };
    item.onend = () => {
      if (current.current !== item) return;
      current.current = null;
      if (timer.current) clearTimeout(timer.current);
      setActive(false);
      setListening(false);
      if (!failed && finalText) callback.current(finalText);
      else if (!failed)
        setError(
          "No complete question was recognised. Please try again or type it.",
        );
    };
    setActive(true);
    try {
      item.start();
      timer.current = setTimeout(() => {
        if (current.current !== item) return;
        cancel();
        setError(
          "The microphone timed out. Click it again for a new question.",
        );
      }, 60000);
    } catch {
      current.current = null;
      setActive(false);
      setListening(false);
      setError(
        "Could not start the microphone. Check browser permissions and try again.",
      );
    }
  }, [cancel]);
  const stop = useCallback(() => {
    current.current?.stop();
  }, []);
  return { active, listening, transcript, error, start, stop, cancel,
    transcribing: false, local: false,
    statusText: listening ? "Listening…" : "Waiting for microphone permission…",
  };
}
