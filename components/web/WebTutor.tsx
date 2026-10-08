"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import Markdown from "react-markdown";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Code2,
  Download,
  Mic,
  Play,
  RotateCcw,
  Send,
  Square,
  Volume2,
} from "lucide-react";
import { JeffFace } from "@/components/jeff/JeffFace";
import { useLocalNarration } from "@/hooks/useLocalNarration";
import { useTutorHistory } from "@/hooks/useTutorHistory";
import { useMicrophone } from "@/hooks/useMicrophone";
import {
  readWebProgress,
  webProgressKey,
  type WebProgress,
} from "@/lib/tutoring/progress";
import {
  starter,
  previewDocument,
  downloadDocument,
  type Playground,
} from "@/lib/tutoring/preview";
import type {
  WebLesson,
  KnowledgeSource,
  WebReply,
} from "@/lib/tutoring/types";
import type { ServerStatus } from "@/types";
import "./web.css";

type Chat = {
  role: "user" | "assistant";
  content: string;
  sources?: KnowledgeSource[];
};
export function WebTutor({
  lessons,
  initialLesson,
}: {
  lessons: WebLesson[];
  initialLesson?: string;
}) {
  const [progress, setProgress] = useState<WebProgress>(() =>
    readWebProgress(null, lessons),
  );
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [filter, setFilter] = useState("");
  const [tab, setTab] = useState<"lesson" | "playground">("lesson");
  const [language, setLanguage] = useState<keyof Playground>("html");
  const [preview, setPreview] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [narrow, setNarrow] = useState(false);
  const [choice, setChoice] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "retry" | null>(null);
  const [hint, setHint] = useState(false);
  const [solution, setSolution] = useState(false);
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [statusError, setStatusError] = useState("");
  const [question, setQuestion] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [motion, setMotion] = useState(true);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmCodeReset, setConfirmCodeReset] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const autoSpeak = useRef(true);
  const narration = useLocalNarration();
  const index = Math.max(
    0,
    lessons.findIndex((lesson) => lesson.id === progress.current),
  );
  const lesson = lessons[index];
  const history = useTutorHistory(`web:${lesson.id}:${progress.level}`, ready);
  const { messages: chat, setMessages: setChat } = history;
  const groups = [...new Set(lessons.map((lesson) => lesson.group))];
  const microphone = useMicrophone(
    (text) => {
      const combined = [question.trim(), text].filter(Boolean).join(" ");
      setQuestion(combined);
      void ask(combined);
    },
    status?.localSpeechAvailable,
  );
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
        "Could not check the local model. Lessons and the playground still work.",
      );
    }
  }
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const saved = readWebProgress(
          localStorage.getItem(webProgressKey),
          lessons,
        );
        if (initialLesson) saved.current = initialLesson;
        autoSpeak.current = saved.spoken;
        setProgress(saved);
      } catch {
        setStorageError(
          "Browser storage is unavailable. Progress lasts for this session only.",
        );
      }
      setReady(true);
      void refreshStatus();
    }, 0);
    return () => {
      clearTimeout(timer);
      controller.current?.abort();
    };
  }, [lessons, initialLesson]);
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(webProgressKey, JSON.stringify(progress));
      } catch {
        setStorageError(
          "Your changes could not be saved. Download your code before closing the tab.",
        );
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [progress, ready]);
  function cancelQuestion() {
    controller.current?.abort();
    controller.current = null;
    setBusy(false);
  }
  function selectLesson(id: string) {
    cancelQuestion();
    microphone.cancel();
    narration.stop();
    setProgress((previous) => ({ ...previous, current: id }));
    setChoice(null);
    setFeedback(null);
    setHint(false);
    setSolution(false);
    setQuestion("");
    setError("");
    setTab("lesson");
    // Preserve the shared playground when exploring another lesson.
    window.history.replaceState(
      null,
      "",
      `/web-development?lesson=${encodeURIComponent(id)}`,
    );
  }
  function check(event: FormEvent) {
    event.preventDefault();
    if (choice === null) return;
    const correct = choice === lesson.quiz.correct;
    setFeedback(correct ? "correct" : "retry");
    if (correct)
      setProgress((previous) => ({
        ...previous,
        completed: [...new Set([...previous.completed, lesson.id])],
      }));
  }
  async function ask(value: string) {
    const content = value.trim();
    if (!content || busy || !history.ready) return;
    if (content.length > 3000) {
      setError("Please shorten your question to 3,000 characters.");
      return;
    }
    const request = new AbortController();
    controller.current = request;
    narration.stop();
    setBusy(true);
    setError("");
    const last = chat.at(-1);
    const retry = last?.role === "user" && last.content === content;
    const conversation: Chat[] = retry
      ? chat
      : [...chat, { role: "user", content }];
    const messages = conversation.slice(-5);
    setChat(conversation);
    try {
      const response = await fetch("/api/web-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(115000)]),
        body: JSON.stringify({
          lessonId: lesson.id,
          level: progress.level,
          messages: messages.map(({ role, content }) => ({ role, content })),
        }),
      });
      const result = (await response.json()) as WebReply & { error?: string };
      if (!response.ok) {
        if (response.status === 401) void refreshStatus();
        throw new Error(result.error || "The local tutor could not answer.");
      }
      if (!result.content?.trim())
        throw new Error("The local model returned an empty answer.");
      if (controller.current !== request) return;
      setChat([
        ...conversation,
        {
          role: "assistant",
          content: result.content,
          sources: result.sources,
          cached: result.cached,
        },
      ]);
      if (result.memorySaved === false)
        setError(
          "JEFF answered, but could not save this answer on this computer for reuse.",
        );
      setQuestion("");
      if (autoSpeak.current) narration.speak(result.content);
    } catch (cause) {
      if (!request.signal.aborted && controller.current === request)
        setError(
          cause instanceof Error && cause.name === "TimeoutError"
            ? "The local model took too long. Try a shorter question or use the lesson hint."
            : cause instanceof Error
              ? cause.message
              : "Could not reach the local tutor.",
        );
    } finally {
      if (controller.current === request) {
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
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setCode("");
      await refreshStatus();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not unlock JEFF.",
      );
    } finally {
      setUnlocking(false);
    }
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([downloadDocument(progress.code)], { type: "text/html" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "jeff-web-practice.html";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const readLesson = () =>
    narration.speak(
      `${lesson.title}. ${lesson.goal} ${lesson.explanation.join(" ")} Your exercise. ${lesson.exercise}`,
    );
  const filtered = lessons.filter((item) =>
    `${item.title} ${item.keywords.join(" ")}`
      .toLowerCase()
      .includes(filter.toLowerCase().trim()),
  );
  return (
    <div className="web-app">
      <header className="web-header">
        <Link className="web-brand" href="/">
          j<span>.</span>
          <strong>
            JEFF <small>/ Web development & design</small>
          </strong>
        </Link>
        <nav aria-label="JEFF modes">
          <Link href="/">Assistant</Link>
          <Link href="/excel">Excel Tutor</Link>
          <Link href="/web-development" aria-current="page">
            Web Tutor
          </Link>
          <Link href="/chatgpt-basics">AI Made Simple</Link>
          <Link href="/computer-basics">PC & Windows</Link>
        </nav>
        <span className="web-local">● LOCAL LEARNING</span>
      </header>
      <main className="web-layout">
        <aside className="web-sidebar" aria-label="Web course navigation">
          <span className="web-eyebrow">FROM FIRST PAGE TO FINAL PROJECT</span>
          <h1>
            Make something
            <br /> for the web.
          </h1>
          <p>
            A local course. A place to practise.
            <br />
            JEFF by your side.
          </p>
          <div className="web-progress">
            <span>
              {progress.completed.length} / {lessons.length} knowledge checks
            </span>
            <strong>
              {Math.round((progress.completed.length / lessons.length) * 100)}%
            </strong>
            <progress
              aria-label="Web course progress"
              max={lessons.length}
              value={progress.completed.length}
            />
          </div>
          <label className="web-search">
            <span className="sr-only">Find a lesson</span>
            <input
              type="search"
              placeholder="Find a lesson…"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
          </label>
          <nav aria-label="Web lessons">
            {groups.map((group) => {
              const items = filtered.filter((item) => item.group === group);
              if (!items.length) return null;
              const done = lessons.filter(
                (item) =>
                  item.group === group && progress.completed.includes(item.id),
              ).length;
              const total = lessons.filter(
                (item) => item.group === group,
              ).length;
              return (
                <details
                  className="web-group"
                  key={group}
                  open={!!filter || lesson.group === group}
                >
                  <summary>
                    {group}
                    <span>
                      {done}/{total}
                    </span>
                  </summary>
                  {items.map((item) => (
                    <button
                      key={item.id}
                      disabled={!ready}
                      onClick={() => selectLesson(item.id)}
                      aria-current={lesson.id === item.id ? "step" : undefined}
                    >
                      <span>
                        {progress.completed.includes(item.id) ? (
                          <Check size={13} />
                        ) : (
                          String(item.order).padStart(2, "0")
                        )}
                      </span>
                      {item.title}
                    </button>
                  ))}
                </details>
              );
            })}
            {!filtered.length && (
              <p className="web-note">
                No matching lessons. Try HTML, CSS or design.
              </p>
            )}
          </nav>
          <p className="web-note">
            {storageError ||
              "Progress and playground code save in this browser, separately from Excel."}
          </p>
          <button
            className="web-text-button"
            onClick={() => setConfirmReset(!confirmReset)}
          >
            <RotateCcw size={12} /> Reset web progress
          </button>
          {confirmReset && (
            <div className="web-confirm">
              <p>
                Clear web lesson progress? Your playground code will remain.
              </p>
              <button
                onClick={() => {
                  cancelQuestion();
                  microphone.cancel();
                  narration.stop();
                  setProgress((p) => ({ ...p, completed: [] }));
                  setFeedback(null);
                  setConfirmReset(false);
                }}
              >
                Clear web progress
              </button>
              <button onClick={() => setConfirmReset(false)}>
                Keep progress
              </button>
            </div>
          )}
        </aside>
        <section className="web-workspace" aria-label="Web learning workspace">
          <div className="web-workspace-bar">
            <div role="tablist" aria-label="Learning workspace">
              <button
                role="tab"
                aria-selected={tab === "lesson"}
                onClick={() => setTab("lesson")}
              >
                <BookOpen size={14} /> Lesson
              </button>
              <button
                role="tab"
                aria-selected={tab === "playground"}
                onClick={() => setTab("playground")}
              >
                <Code2 size={14} /> Playground
              </button>
            </div>
            <label>
              Explain for{" "}
              <select
                aria-label="Tutoring level"
                value={progress.level}
                onChange={(event) => {
                  cancelQuestion();
                  microphone.cancel();
                  narration.stop();
                  setQuestion("");
                  setError("");
                  setProgress((p) => ({
                    ...p,
                    level: event.target.value as WebProgress["level"],
                  }));
                }}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
          </div>
          {tab === "lesson" ? (
            <article className="web-lesson" role="tabpanel" aria-label="Lesson">
              <div className="web-meta">
                <span>
                  MODULE {String(lesson.order).padStart(2, "0")} /{" "}
                  {lessons.length}
                </span>
                <span>{lesson.group}</span>
              </div>
              <h2>{lesson.title}</h2>
              <p className="web-goal">{lesson.goal}</p>
              <button
                className="web-secondary"
                onClick={narration.speaking ? narration.stop : readLesson}
                disabled={!narration.available || microphone.active}
              >
                {narration.speaking ? (
                  <Square size={13} />
                ) : (
                  <Volume2 size={13} />
                )}
                {narration.speaking ? "Stop reading" : "Read lesson"}
              </button>
              <div className="web-explanation">
                {lesson.explanation.map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
              <div className="web-code-example">
                <div>
                  <span>EXAMPLE</span>
                  <span>{lesson.language}</span>
                </div>
                <pre>
                  <code>{lesson.code}</code>
                </pre>
              </div>
              <section className="web-exercise">
                <span className="web-eyebrow">BUILD YOUR UNDERSTANDING</span>
                <h3>Your exercise</h3>
                <p>{lesson.exercise}</p>
                <button
                  className="web-text-button"
                  onClick={() => setHint(!hint)}
                >
                  {hint ? "Hide hint" : "Give me a hint"}
                </button>
                {hint && <p className="web-hint">{lesson.hint}</p>}
                <p className="web-note">
                  Practise HTML, CSS and browser JavaScript in the Playground.
                  Backend code, React/JSX and SQL need their own project
                  environment.
                </p>
                <button
                  className="web-secondary"
                  onClick={() => setTab("playground")}
                >
                  <Code2 size={13} /> Open playground
                </button>
              </section>
              <section className="web-check">
                <div className="web-check-heading">
                  <span className="web-eyebrow">KNOWLEDGE CHECK</span>
                  {progress.completed.includes(lesson.id) && (
                    <span>
                      <Check size={13} /> Checked
                    </span>
                  )}
                </div>
                <h3>{lesson.quiz.question}</h3>
                <form onSubmit={check}>
                  <fieldset>
                    <legend className="sr-only">Choose an answer</legend>
                    {lesson.quiz.options.map((option, i) => (
                      <label key={option}>
                        <input
                          type="radio"
                          name="web-answer"
                          checked={choice === i}
                          onChange={() => {
                            setChoice(i);
                            setFeedback(null);
                          }}
                        />
                        {option}
                      </label>
                    ))}
                  </fieldset>
                  <button
                    type="submit"
                    className="web-primary"
                    disabled={choice === null || !ready}
                  >
                    Check my answer <ArrowRight size={13} />
                  </button>
                </form>
                {feedback && (
                  <div role="status" className={`web-feedback ${feedback}`}>
                    <strong>
                      {feedback === "correct"
                        ? "That's right."
                        : "Try one more step."}
                    </strong>
                    <p>
                      {feedback === "correct"
                        ? lesson.quiz.explanation
                        : lesson.hint}
                    </p>
                  </div>
                )}
                <button
                  className="web-text-button"
                  onClick={() => setSolution(!solution)}
                >
                  {solution
                    ? "Hide explanation"
                    : "Show answer and explanation"}
                </button>
                {solution && (
                  <p className="web-hint">
                    <strong>{lesson.quiz.options[lesson.quiz.correct]}</strong>
                    <br />
                    {lesson.quiz.explanation}
                    <br />
                    <small>
                      Viewing this does not complete the check. Select an answer
                      and check it yourself.
                    </small>
                  </p>
                )}
              </section>
              <a
                className="web-reference"
                href={lesson.reference.url}
                target="_blank"
                rel="noreferrer"
              >
                Read the official reference ↗ <span>Opens online</span>
              </a>
              <div className="web-lesson-navigation">
                <button
                  disabled={index === 0}
                  onClick={() => selectLesson(lessons[index - 1].id)}
                >
                  <ArrowLeft size={14} /> Previous
                </button>
                {index < lessons.length - 1 ? (
                  <button onClick={() => selectLesson(lessons[index + 1].id)}>
                    Next module <ArrowRight size={14} />
                  </button>
                ) : (
                  <span>
                    {progress.completed.length === lessons.length
                      ? "All knowledge checks completed."
                      : "Review any unchecked modules to finish."}
                  </span>
                )}
              </div>
            </article>
          ) : (
            <section
              className="web-playground"
              role="tabpanel"
              aria-label="Playground"
            >
              <span className="web-eyebrow">YOUR PRACTICE SPACE</span>
              <h2>Try it. See it. Change it.</h2>
              <p className="web-goal">
                A shared mini-project for your HTML, CSS and JavaScript
                exercises. Your code stays here when you change lessons.
              </p>
              <div className="web-editor-tabs">
                {(["html", "css", "javascript"] as const).map((key) => (
                  <button
                    aria-pressed={key === language}
                    key={key}
                    onClick={() => setLanguage(key)}
                  >
                    {key === "javascript" ? "JavaScript" : key.toUpperCase()}
                  </button>
                ))}
              </div>
              <label>
                <span className="sr-only">
                  {language === "javascript"
                    ? "JavaScript"
                    : language.toUpperCase()}{" "}
                  code
                </span>
                <textarea
                  className="web-code-editor"
                  spellCheck={false}
                  maxLength={20000}
                  value={progress.code[language]}
                  onChange={(event) =>
                    setProgress((p) => ({
                      ...p,
                      code: { ...p.code, [language]: event.target.value },
                    }))
                  }
                />
              </label>
              <div className="web-playground-actions">
                <button
                  className="web-primary"
                  disabled={!ready}
                  onClick={() => {
                    setPreview(previewDocument(progress.code));
                    setPreviewKey((key) => key + 1);
                  }}
                >
                  <Play size={13} /> Run preview
                </button>
                <button className="web-secondary" onClick={download}>
                  <Download size={13} /> Download HTML
                </button>
                <button
                  className="web-text-button"
                  onClick={() => setConfirmCodeReset(!confirmCodeReset)}
                >
                  Restore starter
                </button>
              </div>
              {confirmCodeReset && (
                <div className="web-confirm">
                  <p>Replace your HTML, CSS and JavaScript with the starter?</p>
                  <button
                    onClick={() => {
                      setProgress((p) => ({ ...p, code: { ...starter } }));
                      setPreview(null);
                      setConfirmCodeReset(false);
                    }}
                  >
                    Replace my code
                  </button>
                  <button onClick={() => setConfirmCodeReset(false)}>
                    Keep my code
                  </button>
                </div>
              )}
              <div className="web-preview-heading">
                <span>PREVIEW</span>
                <label>
                  <input
                    type="checkbox"
                    checked={narrow}
                    onChange={(event) => setNarrow(event.target.checked)}
                  />{" "}
                  Narrow view
                </label>
                {preview && (
                  <button
                    className="web-text-button"
                    onClick={() => setPreview(null)}
                  >
                    Stop preview
                  </button>
                )}
              </div>
              <div className={`web-preview ${narrow ? "narrow" : ""}`}>
                {preview ? (
                  <iframe
                    key={previewKey}
                    title="Your website preview"
                    sandbox="allow-scripts"
                    referrerPolicy="no-referrer"
                    srcDoc={preview}
                  />
                ) : (
                  <div className="web-preview-empty">
                    <Code2 size={28} />
                    <p>Run your code to see the result.</p>
                  </div>
                )}
              </div>
              <p className="web-note">
                Preview is isolated from JEFF. Fetch requests, external assets,
                forms and popups are blocked; links can navigate inside the
                preview. It runs plain browser code, not Node.js, React/JSX or
                SQL. Code is not automatically graded. Long-running loops can
                freeze a browser tab. Downloaded HTML runs as a normal page when
                you open it.
              </p>
            </section>
          )}
        </section>
        <aside className="web-jeff" aria-label="Web tutor JEFF">
          <div className="web-jeff-companion">
            <div className="web-face">
            <div className="web-face-label">
              <span>YOUR LOCAL TUTOR</span>
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
            <h2>Let’s build your next idea.</h2>
            <p>
              Ask a question. Explore the why.
              <br />
              Then make it your own.
            </p>
          </div>
          <div className="web-model-status">
            <span className={status?.configured ? "ready" : "offline"} />
            <span>
              {status?.configured
                ? "Local AI ready"
                : status
                  ? "Lessons ready · AI offline"
                  : statusError
                    ? "Lessons ready"
                    : "Checking local AI…"}
            </span>
            <button
              className="web-text-button"
              aria-label="Refresh local model"
              onClick={() => void refreshStatus()}
            >
              <RotateCcw size={13} />
            </button>
          </div>
          {statusError && <p className="web-note">{statusError}</p>}
          {status && !status.configured && (
            <details className="web-setup">
              <summary>Connect Ollama</summary>
              <p>
                Open Ollama on this computer. Install the configured model, then
                refresh:
              </p>
              <code>ollama pull {status.model || "qwen3:1.7b"}</code>
            </details>
          )}
          <section className="web-chat">
            <span className="web-eyebrow">ASK JEFF</span>
            <h3>One question at a time.</h3>
            <p className="web-note">
              JEFF searches your local web course before answering. Lesson links
              show the material supplied to the model.
            </p>
            <div className="web-speech-controls">
              <label>
                <input
                  type="checkbox"
                  checked={progress.spoken}
                  disabled={!ready}
                  onChange={(event) => {
                    const spoken = event.target.checked;
                    autoSpeak.current = spoken;
                    setProgress((p) => ({ ...p, spoken }));
                    if (!spoken) narration.stop();
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
            {!narration.available && (
              <p className="web-note">
                Read-aloud needs an installed local English voice.
              </p>
            )}
            <p className="web-note">
              Questions are saved on this computer. Recent messages help JEFF follow
              the conversation.
            </p>
            {history.error && (
              <p className="web-error" role="alert">
                {history.error}
              </p>
            )}
            <div className="web-chat-messages" aria-live="polite">
              {chat.map((message, i) => (
                <div key={i} className={`web-message ${message.role}`}>
                  <strong>
                    {message.role === "user" ? "You" : "JEFF · local tutor"}
                  </strong>
                  <Markdown>{message.content}</Markdown>
                  {message.cached && <small>Reused saved answer</small>}
                  {message.sources && message.sources.length > 0 && (
                    <div className="web-sources">
                      <span>LOCAL LESSONS USED</span>
                      {message.sources.map((source) => (
                        <button
                          key={source.id}
                          onClick={() => selectLesson(source.id)}
                        >
                          {source.title} ↗
                        </button>
                      ))}
                    </div>
                  )}
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
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void ask(question);
                }}
              >
                <label className="sr-only" htmlFor="web-question">
                  Ask JEFF about web development
                </label>
                <textarea
                  id="web-question"
                  rows={4}
                  maxLength={3000}
                  placeholder="How do I make a responsive navigation bar?"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  disabled={busy || microphone.active || !history.ready}
                />
                <button
                  className="web-primary"
                  disabled={
                    !ready ||
                    !question.trim() ||
                    busy ||
                    microphone.active ||
                    !status?.configured
                  }
                >
                  {busy ? "Searching and thinking…" : "Ask JEFF"}
                  <Send size={13} />
                </button>
              </form>
            )}
            {busy && (
              <div className="web-wait">
                <span>Local answers can take a minute.</span>
                <button className="web-text-button" onClick={cancelQuestion}>
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
              Typed questions and course retrieval stay local.{" "}
              {microphone.local
                ? "Speech is transcribed on this computer."
                : "Browser microphone recognition may use an online service."}{" "}
              AI can make mistakes; verify code in your own project.
            </p>
          </section>
        </aside>
      </main>
      <footer className="web-footer">
        <span>JEFF / WEB DEVELOPMENT & DESIGN</span>
        <span>{lessons.length} local modules · No paid API required</span>
      </footer>
    </div>
  );
}
