"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import Markdown from "react-markdown";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  BookOpen,
  Volume2,
  Square,
  Send,
  RotateCcw,
  ChevronDown,
  Mic,
} from "lucide-react";
import { JeffFace } from "@/components/jeff/JeffFace";
import { useTutorHistory } from "@/hooks/useTutorHistory";
import { useMicrophone } from "@/hooks/useMicrophone";
import { useLocalNarration } from "@/hooks/useLocalNarration";
import {
  lessons,
  lessonForVersion,
  practiceRows,
  checkAnswer,
  type ExcelVersion,
} from "@/lib/excel/course";
import {
  initialProgress,
  parseProgress,
  progressKey,
  type Progress,
} from "@/lib/excel/progress";
import type { ServerStatus } from "@/types";
import "./excel.css";

type ChatMessage = { role: "user" | "assistant"; content: string };
export function ExcelTutor() {
  const [progress, setProgress] = useState<Progress>(initialProgress);
  const [hydrated, setHydrated] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "retry" | null>(null);
  const [hint, setHint] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [statusError, setStatusError] = useState("");
  const [question, setQuestion] = useState("");

  const [busy, setBusy] = useState(false);
  const [chatError, setChatError] = useState("");
  const [code, setCode] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const chatEnd = useRef<HTMLDivElement>(null);
  const narration = useLocalNarration();
  const [spokenAnswers, setSpokenAnswers] = useState(true);
  const spokenAnswersRef = useRef(true);
  const index = Math.max(
    0,
    lessons.findIndex((l) => l.id === progress.current),
  );
  const lesson = lessonForVersion(lessons[index], progress.version);
  const history = useTutorHistory(
    `excel:${lesson.id}:${progress.version}`,
    hydrated,
  );
  const { messages: chat, setMessages: setChat } = history;
  const completed = progress.completed.includes(lesson.id);
  const percent = Math.round(
    (progress.completed.length / lessons.length) * 100,
  );
  const [motion, setMotion] = useState(true);

  async function refreshStatus() {
    try {
      const response = await fetch("/api/status", {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error();
      setStatus(await response.json());
      setStatusError("");
    } catch {
      setStatus(null);
      setStatusError(
        "Connection check unavailable. Guided practice still works.",
      );
    }
  }
  useEffect(() => {
    const hydration = window.setTimeout(() => {
      try {
        setProgress(parseProgress(localStorage.getItem(progressKey)));
        const enabled =
          localStorage.getItem("jeff-excel-spoken-answers") !== "false";
        spokenAnswersRef.current = enabled;
        setSpokenAnswers(enabled);
      } catch {
        setSaveError(
          "Browser storage is unavailable. Progress will last for this session only.",
        );
      }
      setHydrated(true);
      void refreshStatus();
    }, 0);
    return () => {
      window.clearTimeout(hydration);
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    let failed: ReturnType<typeof setTimeout> | undefined;
    try {
      localStorage.setItem(progressKey, JSON.stringify(progress));
    } catch {
      failed = setTimeout(
        () =>
          setSaveError(
            "Could not save progress. Keep this tab open to retain this session.",
          ),
        0,
      );
    }
    return () => clearTimeout(failed);
  }, [progress, hydrated]);
  useEffect(() => {
    if (chat.length)
      chatEnd.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [chat]);

  function resetLessonState() {
    controller.current?.abort();
    controller.current = null;
    narration.stop();
    microphone.cancel();
    setBusy(false);
    setAnswer("");
    setFeedback(null);
    setHint(false);
    setRevealed(false);
    setChatError("");
    setQuestion("");
  }
  function selectLesson(id: string) {
    resetLessonState();
    setProgress((p) => ({ ...p, current: id }));
  }
  function changeVersion(version: ExcelVersion) {
    resetLessonState();
    setProgress((p) => ({
      ...p,
      version,
      completed: p.completed.filter((id) => id !== "lookup"),
    }));
  }
  function submitAnswer(event: FormEvent) {
    event.preventDefault();
    if (!answer.trim()) return;
    const correct = checkAnswer(lesson, answer);
    setFeedback(correct ? "correct" : "retry");
    if (correct)
      setProgress((p) => ({
        ...p,
        completed: [...new Set([...p.completed, lesson.id])],
      }));
  }
  function ask(event: FormEvent) {
    event.preventDefault();
    void askQuestion(question);
  }
  async function askQuestion(question: string) {
    if (!question.trim() || busy || !history.ready) return;
    if (question.length > 2000) {
      setChatError("Please shorten your question to 2,000 characters.");
      return;
    }
    const request = new AbortController();
    controller.current = request;
    const content = question.trim();
    const last = chat.at(-1);
    const retry = last?.role === "user" && last.content === content;
    const conversation: ChatMessage[] = retry
      ? chat
      : [...chat, { role: "user", content }];
    const messages = conversation.slice(-7);
    setChat(conversation);
    setBusy(true);
    setChatError("");
    narration.stop();
    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(115000)]),
        body: JSON.stringify({
          lessonId: lesson.id,
          version: progress.version,
          messages,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) void refreshStatus();
        throw new Error(data.error || "JEFF could not answer. Try again.");
      }
      if (typeof data.content !== "string" || !data.content.trim())
        throw new Error("The local model returned no answer. Try again.");
      if (controller.current !== request) return;
      setChat([
        ...conversation,
        { role: "assistant", content: data.content, cached: data.cached },
      ]);
      if (data.memorySaved === false)
        setChatError(
          "JEFF answered, but could not save this answer on this computer for reuse.",
        );
      setQuestion("");
      if (spokenAnswersRef.current) narration.speak(data.content);
    } catch (error) {
      if (!request.signal.aborted && controller.current === request)
        setChatError(
          error instanceof Error && error.name === "TimeoutError"
            ? "The local model took too long. Try a shorter question, or use the lesson hint."
            : error instanceof Error
              ? error.message
              : "Could not connect to the local model.",
        );
    } finally {
      if (controller.current === request) {
        setBusy(false);
        controller.current = null;
      }
    }
  }
  const microphone = useMicrophone(
    (text) => {
      const combined = [question.trim(), text].filter(Boolean).join(" ");
      setQuestion(combined);
      void askQuestion(combined);
    },
    status?.localSpeechAvailable,
  );
  async function unlock(event: FormEvent) {
    event.preventDefault();
    setUnlocking(true);
    setChatError("");
    try {
      const response = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        signal: AbortSignal.timeout(10000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setCode("");
      await refreshStatus();
    } catch (error) {
      setChatError(
        error instanceof Error ? error.message : "Could not unlock JEFF.",
      );
    } finally {
      setUnlocking(false);
    }
  }
  const readLesson = () =>
    narration.speak(
      `${lesson.title}. ${lesson.goal} ${lesson.steps.join(" ")} Example: ${lesson.example}. Your turn. ${lesson.task}`,
    );

  return (
    <div className="excel-app">
      <header className="excel-header">
        <Link href="/" className="excel-brand" aria-label="JEFF home">
          j<span>.</span>
          <small>
            JEFF <b>/ Excel tutor</b>
          </small>
        </Link>
        <Link href="/web-development" className="excel-entry">
          Web Tutor ↗
        </Link>
        <Link href="/chatgpt-basics" className="excel-entry">
          AI Made Simple ↗
        </Link>
        <Link href="/computer-basics" className="excel-entry">
          PC & Windows ↗
        </Link>
        <span className="excel-local">
          <i /> No OpenAI required
        </span>
        <Link href="/" className="excel-back">
          <ArrowLeft size={14} /> Assistant
        </Link>
      </header>
      <main className="excel-layout">
        <aside className="excel-sidebar" aria-label="Course navigation">
          <div className="excel-course-heading">
            <span className="excel-eyebrow">YOUR LEARNING PATH</span>
            <h1>
              Excel, one step
              <br /> at a time.
            </h1>
            <p>
              Small lessons. Real practice.
              <br />A patient tutor by your side.
            </p>
          </div>
          <div className="excel-progress">
            <div>
              <span>
                {progress.completed.length} of {lessons.length} checked
              </span>
              <strong>{percent}%</strong>
            </div>
            <progress
              aria-label="Course progress"
              value={progress.completed.length}
              max={lessons.length}
            />
          </div>
          <nav aria-label="Excel lessons">
            {(["Foundations", "Formulas", "Analysis"] as const).map((level) => (
              <div className="excel-lesson-group" key={level}>
                <h2>{level}</h2>
                {lessons
                  .filter((l) => l.level === level)
                  .map((l) => (
                    <button
                      disabled={!hydrated}
                      key={l.id}
                      onClick={() => selectLesson(l.id)}
                      aria-current={lesson.id === l.id ? "step" : undefined}
                      className={lesson.id === l.id ? "current" : ""}
                    >
                      <span
                        className={
                          progress.completed.includes(l.id)
                            ? "lesson-number done"
                            : "lesson-number"
                        }
                      >
                        {progress.completed.includes(l.id) ? (
                          <Check size={13} aria-label="Completed" />
                        ) : (
                          String(lessons.indexOf(l) + 1).padStart(2, "0")
                        )}
                      </span>
                      <span>{l.title}</span>
                      {lesson.id === l.id && (
                        <span className="lesson-current-dot" />
                      )}
                    </button>
                  ))}
              </div>
            ))}
          </nav>
          <div className="excel-save-note">
            {saveError || "Progress saved in this browser."}
          </div>
          <button
            className="excel-text-button"
            onClick={() => setShowReset(!showReset)}
          >
            <RotateCcw size={12} /> Reset progress
          </button>
          {showReset && (
            <div className="excel-reset">
              <p>Clear all lesson progress on this browser?</p>
              <button
                onClick={() => {
                  resetLessonState();
                  setProgress(initialProgress);
                  setShowReset(false);
                }}
              >
                Clear progress
              </button>
              <button onClick={() => setShowReset(false)}>Keep progress</button>
            </div>
          )}
        </aside>
        <section className="excel-workspace" aria-label="Lesson workspace">
          <div className="excel-workspace-toolbar">
            <span>
              <BookOpen size={14} /> THE EXCEL ESSENTIALS
            </span>
            <label>
              Excel version{" "}
              <select
                value={progress.version}
                onChange={(e) => changeVersion(e.target.value as ExcelVersion)}
                disabled={!hydrated}
              >
                <option value="modern">365 / 2021 / 2024</option>
                <option value="legacy">2016 / 2019</option>
              </select>
            </label>
          </div>
          <article
            className="excel-lesson"
            key={`${lesson.id}-${progress.version}`}
          >
            <div className="excel-lesson-meta">
              <span>
                LESSON {String(index + 1).padStart(2, "0")}{" "}
                <b>/ {String(lessons.length).padStart(2, "0")}</b>
              </span>
              <span>
                {lesson.minutes} MIN · {lesson.level.toUpperCase()}
              </span>
            </div>
            <h2>{lesson.title}</h2>
            <p className="excel-goal">{lesson.goal}</p>
            <div className="excel-lesson-actions">
              <button
                className="excel-secondary"
                onClick={narration.speaking ? narration.stop : readLesson}
                disabled={!narration.available || microphone.active}
              >
                {narration.speaking ? (
                  <Square size={14} />
                ) : (
                  <Volume2 size={14} />
                )}
                {narration.speaking ? "Stop reading" : "Read lesson"}
              </button>
              <a
                className="excel-secondary"
                href="/practice/jeff-excel-sales.csv"
                download
              >
                <Download size={14} /> Practice data
              </a>
            </div>
            {!narration.available && (
              <p className="excel-note">
                Reading aloud needs a local English voice installed on your
                computer.
              </p>
            )}
            {narration.error && (
              <p role="alert" className="excel-error">
                {narration.error}
              </p>
            )}
            <ol className="excel-steps">
              {lesson.steps.map((step, n) => (
                <li key={step}>
                  <span>{n + 1}</span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
            <div className="excel-example">
              <span className="excel-eyebrow">WORKED EXAMPLE</span>
              <p>{lesson.example}</p>
            </div>
            <details className="excel-sheet" open>
              <summary>
                Practice sheet{" "}
                <span>
                  A1:E6 <ChevronDown size={14} />
                </span>
              </summary>
              <div className="excel-table-scroll">
                <table aria-label="Excel practice data">
                  <thead>
                    <tr>
                      <th aria-label="Row" />
                      {["A", "B", "C", "D", "E"].map((c) => (
                        <th key={c} scope="col">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {practiceRows.map((row, n) => (
                      <tr key={n}>
                        <th scope="row">{n + 1}</th>
                        {row.map((cell, col) => (
                          <td
                            key={col}
                            className={`${n === 0 ? "sheet-heading" : ""} ${col >= 2 && n > 0 ? "numeric" : ""}`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                Read-only reference. Open the download in Excel to practise. If
                it opens in one column, use Data → From Text/CSV and choose a
                comma delimiter.
              </p>
            </details>
            <section className="excel-exercise" aria-label="Practice exercise">
              <div className="excel-exercise-title">
                <span className="excel-eyebrow">YOUR TURN</span>
                {completed && (
                  <span className="excel-completed">
                    <Check size={13} /> Checked
                  </span>
                )}
              </div>
              <h3>{lesson.task}</h3>
              <form onSubmit={submitAnswer}>
                {lesson.choices ? (
                  <fieldset>
                    <legend className="sr-only">Choose your answer</legend>
                    {lesson.choices.map((choice) => (
                      <label className="excel-choice" key={choice}>
                        <input
                          type="radio"
                          name="answer"
                          value={choice}
                          checked={answer === choice}
                          onChange={() => {
                            setAnswer(choice);
                            setFeedback(null);
                          }}
                        />
                        {choice}
                      </label>
                    ))}
                  </fieldset>
                ) : (
                  <label className="excel-answer-label">
                    Your answer
                    <input
                      autoComplete="off"
                      spellCheck={false}
                      maxLength={500}
                      value={answer}
                      onChange={(e) => {
                        setAnswer(e.target.value);
                        setFeedback(null);
                      }}
                      placeholder={
                        lesson.answer.startsWith("=")
                          ? "= Your formula here"
                          : "Type your answer"
                      }
                    />
                  </label>
                )}
                <div className="excel-check-actions">
                  <button
                    className="excel-primary"
                    type="submit"
                    disabled={!answer.trim() || !hydrated}
                  >
                    Check my answer <ArrowRight size={14} />
                  </button>
                  <button
                    type="button"
                    className="excel-text-button"
                    onClick={() => setHint(!hint)}
                  >
                    {hint ? "Hide hint" : "Give me a hint"}
                  </button>
                </div>
              </form>
              {hint && <p className="excel-hint">{lesson.hint}</p>}
              {feedback && (
                <div role="status" className={`excel-feedback ${feedback}`}>
                  <strong>
                    {feedback === "correct"
                      ? "That's right."
                      : "Let's try one more step."}
                  </strong>
                  <p>
                    {feedback === "correct"
                      ? lesson.explanation
                      : `${lesson.hint} Follow the requested method; this checker recognises the guided exercise answers, not every equivalent Excel formula.`}
                  </p>
                </div>
              )}
              <button
                className="excel-text-button excel-reveal"
                onClick={() => setRevealed(!revealed)}
              >
                {revealed ? "Hide solution" : "Show me the solution"}
              </button>
              {revealed && (
                <div className="excel-solution">
                  <code>{lesson.answer}</code>
                  <p>{lesson.explanation}</p>
                  <small>
                    Read it, then try entering the answer yourself. Viewing a
                    solution does not complete the exercise.
                  </small>
                </div>
              )}
            </section>
            <div className="excel-navigation">
              <button
                disabled={index === 0}
                onClick={() => selectLesson(lessons[index - 1].id)}
              >
                <ArrowLeft size={15} /> Previous
              </button>
              {index < lessons.length - 1 ? (
                <button onClick={() => selectLesson(lessons[index + 1].id)}>
                  Next lesson <ArrowRight size={15} />
                </button>
              ) : (
                <span>
                  {percent === 100
                    ? "All exercises checked. Nicely done!"
                    : "Revisit any unchecked exercises to finish."}
                </span>
              )}
            </div>
          </article>
        </section>
        <aside className="excel-jeff" aria-label="JEFF local tutor">
          <div className="excel-jeff-companion">
            <div className="excel-face-panel">
            <div className="excel-face-caption">
              <span>YOUR TUTOR</span>
              <label>
                <input
                  type="checkbox"
                  checked={motion}
                  onChange={(e) => setMotion(e.target.checked)}
                />{" "}
                Animation
              </label>
            </div>
            <JeffFace
              state={
                microphone.active
                  ? microphone.transcribing
                    ? "thinking"
                    : "listening"
                  : narration.speaking
                    ? "speaking"
                    : busy
                      ? "thinking"
                      : "idle"
              }
              audioLevel={narration.audioLevel}
              intensity={motion ? 0.65 : 0}
            />
            </div>
            {!status?.locked && (
              <div className="microphone-panel excel-microphone-featured">
              <button
                type="button"
                className="excel-primary"
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
                <button
                  type="button"
                  className="excel-text-button"
                  onClick={microphone.cancel}
                >
                  Cancel microphone
                </button>
              )}
              <p className="excel-note">
                Speak naturally, then pause or choose Stop and send.
              </p>
              {microphone.active && (
                <p role="status">
                  {microphone.statusText} {microphone.transcript}
                </p>
              )}
              {microphone.error && (
                <p role="alert" className="excel-error">{microphone.error}</p>
              )}
              </div>
            )}
          </div>
          <div className="excel-face-copy">
            <h2>Here to help you learn.</h2>
            <p>
              Take your time. Try an answer.
              <br />
              We’ll work through it together.
            </p>
          </div>
          <div className="excel-connection">
            <span
              className={status?.configured ? "online-dot" : "offline-dot"}
            />
            <span>
              {status?.configured
                ? "Local AI ready"
                : status
                  ? "Guided lessons ready · AI offline"
                  : statusError
                    ? "Guided lessons ready"
                    : "Checking local AI…"}
            </span>
            <button
              className="excel-text-button"
              onClick={() => void refreshStatus()}
              aria-label="Refresh local AI status"
            >
              <RotateCcw size={13} />
            </button>
          </div>
          {statusError && (
            <p role="status" className="excel-note">
              {statusError}
            </p>
          )}
          {status && !status.configured && (
            <details className="excel-setup">
              <summary>Connect local AI</summary>
              <p>
                Open Ollama on this computer and install the configured model:
              </p>
              <code>ollama pull {status.model || "qwen3:1.7b"}</code>
              <p>
                Then refresh the status above. Lessons, hints and checks work
                without it.
              </p>
            </details>
          )}
          <section className="excel-chat">
            <span className="excel-eyebrow">ASK JEFF</span>
            <h3>A little more explanation?</h3>
            <p className="excel-chat-intro">
              Ask about this lesson. Responses come from Ollama on your
              computer.
            </p>
            <div className="excel-voice-controls">
              <label>
                <input
                  type="checkbox"
                  checked={spokenAnswers}
                  disabled={!hydrated}
                  onChange={(event) => {
                    const enabled = event.target.checked;
                    spokenAnswersRef.current = enabled;
                    setSpokenAnswers(enabled);
                    if (!enabled) narration.stop();
                    try {
                      localStorage.setItem(
                        "jeff-excel-spoken-answers",
                        String(enabled),
                      );
                    } catch {
                      /* Keep the preference for this session. */
                    }
                  }}
                />
                Speak answers aloud
              </label>
              {narration.speaking && (
                <button className="excel-text-button" onClick={narration.stop}>
                  <Square size={12} /> Stop speaking
                </button>
              )}
            </div>
            <p className="excel-note">
              Questions are saved on this computer. Recent messages help JEFF follow
              the conversation.
            </p>
            {history.error && (
              <p className="excel-error" role="alert">
                {history.error}
              </p>
            )}
            <div className="excel-chat-messages" aria-live="polite">
              {chat.map((message, n) => (
                <div className={`excel-chat-message ${message.role}`} key={n}>
                  <strong>
                    {message.role === "user" ? "You" : "JEFF · local AI"}
                  </strong>
                  <Markdown>{message.content}</Markdown>
                  {message.cached && <small>Reused saved answer</small>}
                  {message.role === "assistant" && (
                    <button
                      className="excel-text-button"
                      disabled={!narration.available || microphone.active}
                      onClick={() => narration.speak(message.content)}
                    >
                      <Volume2 size={12} /> Read answer
                    </button>
                  )}
                </div>
              ))}
              <div ref={chatEnd} />
            </div>
            {status?.locked ? (
              <form onSubmit={unlock}>
                <label className="excel-answer-label">
                  JEFF access code
                  <input
                    type="password"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    autoComplete="current-password"
                  />
                </label>
                <button className="excel-primary" disabled={unlocking || !code}>
                  {unlocking ? "Unlocking…" : "Unlock local chat"}
                </button>
              </form>
            ) : (
              <form onSubmit={ask}>
                <label className="sr-only" htmlFor="excel-question">
                  Ask JEFF about this lesson
                </label>
                <textarea
                  id="excel-question"
                  maxLength={2000}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Can you explain that another way?"
                  disabled={busy || microphone.active || !history.ready}
                  rows={3}
                />
                <button
                  className="excel-primary"
                  disabled={
                    !question.trim() ||
                    busy ||
                    microphone.active ||
                    !status?.configured
                  }
                >
                  {busy ? "JEFF is thinking…" : "Ask JEFF"}
                  <Send size={13} />
                </button>
              </form>
            )}
            {busy && (
              <div className="excel-wait" role="status">
                Local answers can take a minute.
                <button
                  className="excel-text-button"
                  onClick={() => {
                    controller.current?.abort();
                    controller.current = null;
                    setBusy(false);
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
            {chatError && (
              <p role="alert" className="excel-error">
                {chatError}
              </p>
            )}
            <p className="excel-note">
              AI can make mistakes. Test formulas in Excel. Text goes to local
              Ollama.{" "}
              {microphone.local
                ? "Speech is transcribed on this computer."
                : "Browser speech recognition may use an online service."}{" "}
              Lesson progress is saved in this browser.
            </p>
          </section>
        </aside>
      </main>
      <footer className="excel-footer">
        <span>JEFF / THE EXCEL ESSENTIALS</span>
        <span>Learn at your pace. No paid API needed.</span>
      </footer>
    </div>
  );
}
