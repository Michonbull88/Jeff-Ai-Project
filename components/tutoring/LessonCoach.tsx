"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Markdown from "react-markdown";
import { Mic, RotateCcw, Send, Square, Volume2 } from "lucide-react";
import { JeffFace } from "@/components/jeff/JeffFace";
import { useTutorHistory, type TutorMessage } from "@/hooks/useTutorHistory";
import { useMicrophone } from "@/hooks/useMicrophone";
import type { useLocalNarration } from "@/hooks/useLocalNarration";
import type { ServerStatus } from "@/types";

export type LessonCoachConfig = {
  topic: string;
  historyScope: string;
  endpoint: string;
  description: string;
  placeholder: string;
  footer: string;
  requestContext?: Record<string, string>;
};

const chatgptConfig: LessonCoachConfig = {
  topic: "AI Made Simple",
  historyScope: "chatgpt",
  endpoint: "/api/chatgpt-tutor",
  description: "Ask about this module or get help improving a practice prompt.",
  placeholder: "Can you explain this module more simply?",
  footer:
    "JEFF is a local text tutor. Practical work happens in your separate ChatGPT, Microsoft Copilot or Canva account.",
};

export function LessonCoach({
  lesson,
  ready,
  narration,
  spoken,
  onSpokenChange,
  onMicrophoneActiveChange,
  config = chatgptConfig,
}: {
  lesson: { id: string };
  ready: boolean;
  narration: ReturnType<typeof useLocalNarration>;
  spoken: boolean;
  onSpokenChange: (value: boolean) => void;
  onMicrophoneActiveChange: (active: boolean) => void;
  config?: LessonCoachConfig;
}) {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [statusError, setStatusError] = useState("");
  const [code, setCode] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [motion, setMotion] = useState(true);
  const controller = useRef<AbortController | null>(null);
  const alive = useRef(true);
  const spokenRef = useRef(spoken);
  const history = useTutorHistory(`${config.historyScope}:${lesson.id}`, ready);
  const microphone = useMicrophone(
    (text) => {
      const combined = [question.trim(), text].filter(Boolean).join(" ");
      setQuestion(combined);
      void ask(combined);
    },
    status?.localSpeechAvailable,
  );
  const stopNarration = narration.stop;
  useEffect(() => {
    onMicrophoneActiveChange(microphone.active);
    // A lesson or Windows-version change unmounts the coach and cancels capture.
    return () => onMicrophoneActiveChange(false);
  }, [microphone.active, onMicrophoneActiveChange]);
  useEffect(() => {
    spokenRef.current = spoken;
  }, [spoken]);
  useEffect(() => {
    alive.current = true;
    const timer = setTimeout(() => void refreshStatus(), 0);
    return () => {
      alive.current = false;
      clearTimeout(timer);
      controller.current?.abort();
      stopNarration();
    };
  }, [stopNarration]);

  async function refreshStatus() {
    try {
      const response = await fetch("/api/status", {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (!alive.current) return;
      setStatus(data);
      setStatusError("");
    } catch {
      if (!alive.current) return;
      setStatus(null);
      setStatusError(
        "Could not check Ollama. Your lessons and practice still work.",
      );
    }
  }
  function cancel() {
    controller.current?.abort();
    controller.current = null;
    setBusy(false);
  }
  async function ask(value: string) {
    const content = value.trim();
    if (
      !content ||
      controller.current ||
      !history.ready ||
      !status?.configured ||
      status.locked
    )
      return;
    if (content.length > 3000) {
      setError("Please keep your question under 3,000 characters.");
      return;
    }
    const request = new AbortController();
    controller.current = request;
    narration.stop();
    setBusy(true);
    setError("");
    const last = history.messages.at(-1);
    const conversation: TutorMessage[] =
      last?.role === "user" && last.content === content
        ? history.messages
        : [...history.messages, { role: "user", content }];
    history.setMessages(conversation);
    try {
      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(115000)]),
        body: JSON.stringify({
          ...config.requestContext,
          lessonId: lesson.id,
          messages: conversation
            .slice(-5)
            .map(({ role, content }) => ({ role, content })),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) void refreshStatus();
        throw new Error(
          result.error || "JEFF could not answer. Please try again.",
        );
      }
      if (typeof result.content !== "string" || !result.content.trim())
        throw new Error("The local model returned an empty answer.");
      if (!alive.current || controller.current !== request) return;
      history.setMessages([
        ...conversation,
        { role: "assistant", content: result.content, cached: result.cached },
      ]);
      setQuestion("");
      if (result.memorySaved === false)
        setError(
          "JEFF answered, but could not save this answer on this computer for reuse.",
        );
      if (spokenRef.current) narration.speak(result.content);
    } catch (cause) {
      if (
        alive.current &&
        controller.current === request &&
        !request.signal.aborted
      ) {
        setError(
          cause instanceof Error && cause.name === "TimeoutError"
            ? "The local model took too long. Try a shorter question or the lesson hint."
            : cause instanceof Error
              ? cause.message
              : "Could not reach JEFF.",
        );
      }
    } finally {
      if (alive.current && controller.current === request) {
        controller.current = null;
        setBusy(false);
      }
    }
  }
  async function unlock(event: FormEvent) {
    event.preventDefault();
    setUnlocking(true);
    setError("");
    try {
      const response = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        signal: AbortSignal.timeout(10000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (alive.current) {
        setCode("");
        await refreshStatus();
      }
    } catch (cause) {
      if (alive.current)
        setError(
          cause instanceof Error ? cause.message : "Could not unlock JEFF.",
        );
    } finally {
      if (alive.current) setUnlocking(false);
    }
  }

  return (
    <aside className="web-jeff" aria-label={`${config.topic} course tutor`}>
      <div className="web-jeff-companion">
        <div className="web-face">
        <div className="web-face-label">
          <span>YOUR LEARNING COMPANION</span>
          <label>
            <input
              type="checkbox"
              checked={motion}
              onChange={(event) => setMotion(event.target.checked)}
            />{" "}
            Animation
          </label>
        </div>
        <JeffFace
          state={
            microphone.listening
              ? "listening"
              : busy || microphone.transcribing
                ? "thinking"
                : narration.speaking
                  ? "speaking"
                  : "idle"
          }
          audioLevel={narration.audioLevel}
          intensity={motion ? 1 : 0}
        />
        </div>
        {!status?.locked && (
          <div className="web-microphone web-microphone-featured">
          <button
            className="web-primary"
            disabled={
              busy || !status?.configured || !history.ready ||
              (microphone.active && !microphone.listening)
            }
            aria-label={
              microphone.transcribing ? "Transcribing question" : undefined
            }
            onClick={() => {
              if (microphone.active) microphone.stop();
              else {
                narration.stop();
                microphone.start();
              }
            }}
          >
            {microphone.active ? <Square size={15} /> : <Mic size={15} />}
            {microphone.transcribing
              ? "Transcribing…"
              : microphone.active ? "Stop and send" : "Talk to JEFF"}
          </button>
          {microphone.active && (
            <button className="web-text-button" onClick={microphone.cancel}>
              Cancel microphone
            </button>
          )}
          {microphone.active && (
            <p role="status">
              {microphone.statusText} {microphone.transcript}
            </p>
          )}
          {microphone.error && (
            <p className="web-error" role="alert">{microphone.error}</p>
          )}
          </div>
        )}
      </div>
      <div className="web-face-copy">
        <h2>A little help from JEFF.</h2>
        <p>{config.description}</p>
      </div>
      <div className="web-model-status">
        <span className={status?.configured ? "ready" : "offline"} />
        <span>
          {status?.configured ? "Local AI ready" : "Lessons ready · AI offline"}
        </span>
        <button
          className="web-text-button"
          aria-label="Refresh local model"
          onClick={() => void refreshStatus()}
        >
          <RotateCcw size={14} />
        </button>
      </div>
      {statusError && <p className="web-note">{statusError}</p>}
      {status && !status.configured && (
        <p className="web-note">
          Open Ollama on this computer, then refresh to ask JEFF. You can keep
          learning without it.
        </p>
      )}
      <section className="web-chat">
        <span className="web-eyebrow">ASK JEFF ABOUT THIS LESSON</span>
        <div className="web-speech-controls">
          <label>
            <input
              type="checkbox"
              checked={spoken}
              disabled={!ready}
              onChange={(event) => {
                onSpokenChange(event.target.checked);
                if (!event.target.checked) narration.stop();
              }}
            />{" "}
            Speak answers aloud
          </label>
          {narration.speaking && (
            <button className="web-text-button" onClick={narration.stop}>
              <Square size={12} /> Stop speaking
            </button>
          )}
        </div>
        <div
          className="web-chat-messages"
          role="log"
          aria-label="Lesson conversation"
          aria-live="polite"
        >
          {history.messages.map((message, i) => (
            <div className={`web-message ${message.role}`} key={i}>
              <strong>
                {message.role === "user" ? "You" : "JEFF · local tutor"}
              </strong>
              <Markdown>{message.content}</Markdown>
              {message.cached && <small>Reused saved answer</small>}
              {message.role === "assistant" && (
                <button
                  className="web-text-button"
                  disabled={!narration.available || microphone.active}
                  onClick={() => narration.speak(message.content)}
                >
                  <Volume2 size={12} /> Read answer
                </button>
              )}
            </div>
          ))}
        </div>
        {history.error && (
          <p className="web-error" role="alert">
            {history.error}
          </p>
        )}
        {status?.locked ? (
          <form onSubmit={unlock}>
            <label className="web-field">
              JEFF access code
              <input
                type="password"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                autoComplete="current-password"
              />
            </label>
            <button className="web-primary" disabled={!code || unlocking}>
              {unlocking ? "Unlocking…" : "Unlock local tutor"}
            </button>
          </form>
        ) : (
          <>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void ask(question);
              }}
            >
              <label className="web-field" htmlFor="lesson-question">
                Ask JEFF about {config.topic}
              </label>
              <textarea
                id="lesson-question"
                rows={4}
                maxLength={3000}
                placeholder={config.placeholder}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                disabled={busy || microphone.active || !history.ready}
              />
              <button
                className="web-primary"
                disabled={
                  busy ||
                  microphone.active ||
                  !history.ready ||
                  !question.trim() ||
                  !status?.configured
                }
              >
                {busy ? "Thinking…" : "Ask JEFF"}
                <Send size={13} />
              </button>
            </form>
          </>
        )}
        {busy && (
          <div className="web-wait">
            <span>Local answers can take a minute.</span>
            <button className="web-text-button" onClick={cancel}>
              Cancel answer
            </button>
          </div>
        )}
        {(error || narration.error) && (
          <p className="web-error" role="alert">
            {error || narration.error}
          </p>
        )}
        <p className="web-note">
          {config.footer} Lesson conversations are saved in this browser;{" "}
          {microphone.local
            ? "speech is transcribed on this computer."
            : "browser microphone recognition may use an online service."}
        </p>
      </section>
    </aside>
  );
}
