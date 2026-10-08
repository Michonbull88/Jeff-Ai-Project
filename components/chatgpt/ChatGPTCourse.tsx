"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Download,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Volume2,
} from "lucide-react";
import { chatgptLessons, courseReviewed } from "@/lib/chatgpt/course";
import {
  chatgptProgressKey,
  readChatGPTProgress,
  type ChatGPTProgress,
  type LessonDraft,
} from "@/lib/chatgpt/progress";
import { useLocalNarration } from "@/hooks/useLocalNarration";
import { LessonCoach } from "../tutoring/LessonCoach";
import { CourseDocuments } from "./CourseDocuments";
import "../web/web.css";
import "./chatgpt.css";

export function ChatGPTCourse({ initialLesson }: { initialLesson?: string }) {
  const [progress, setProgress] = useState<ChatGPTProgress>(() =>
    readChatGPTProgress(null),
  );
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [filter, setFilter] = useState("");
  const [choice, setChoice] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "retry" | null>(null);
  const [hint, setHint] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const editor = useRef<HTMLTextAreaElement>(null);
  const narration = useLocalNarration();
  const [microphoneActive, setMicrophoneActive] = useState(false);
  const index = Math.max(
    0,
    chatgptLessons.findIndex((lesson) => lesson.id === progress.current),
  );
  const lesson = chatgptLessons[index];
  const draft = progress.drafts[lesson.id] || {
    prompt: lesson.prompt,
    notes: "",
  };
  const groups = [...new Set(chatgptLessons.map((item) => item.group))];
  const filtered = chatgptLessons.filter((item) =>
    `${item.title} ${item.goal} ${item.group}`
      .toLowerCase()
      .includes(filter.trim().toLowerCase()),
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      let saved = readChatGPTProgress(null);
      try {
        saved = readChatGPTProgress(localStorage.getItem(chatgptProgressKey));
      } catch {
        setStorageError(
          "Browser storage is unavailable. Download your practice before closing this tab.",
        );
      }
      if (initialLesson) saved.current = initialLesson;
      setProgress(saved);
      setReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [initialLesson]);

  function save(next: ChatGPTProgress) {
    setProgress(next);
    try {
      localStorage.setItem(chatgptProgressKey, JSON.stringify(next));
      setStorageError("");
    } catch {
      setStorageError(
        "Your changes could not be saved. Download your practice before closing this tab.",
      );
    }
  }
  function updateDraft(change: Partial<LessonDraft>) {
    save({
      ...progress,
      drafts: { ...progress.drafts, [lesson.id]: { ...draft, ...change } },
    });
  }
  function selectLesson(id: string) {
    narration.stop();
    save({ ...progress, current: id });
    setChoice(null);
    setFeedback(null);
    setHint(false);
    setCopyMessage("");
    setConfirmReset(false);
    window.history.replaceState(
      null,
      "",
      `/chatgpt-basics?lesson=${encodeURIComponent(id)}`,
    );
  }
  function check(event: FormEvent) {
    event.preventDefault();
    if (choice === null) return;
    const correct = choice === lesson.quiz.correct;
    setFeedback(correct ? "correct" : "retry");
    if (correct)
      save({
        ...progress,
        completed: [...new Set([...progress.completed, lesson.id])],
      });
  }
  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(draft.prompt);
      setCopyMessage(
        "Prompt copied. Paste it into ChatGPT when you are ready.",
      );
    } catch {
      editor.current?.focus();
      editor.current?.select();
      setCopyMessage(
        "Automatic copy is unavailable. The prompt is selected; use your browser’s Copy command.",
      );
    }
  }
  function downloadPractice() {
    const contents = [
      `JEFF — AI Made Simple\n${lesson.title}`,
      `GOAL\n${lesson.goal}`,
      `YOUR PROMPT\n${draft.prompt}`,
      `PRACTICE TASK\n${lesson.exercise}`,
      `REVIEW CHECKLIST\n${lesson.review.map((item) => `- ${item}`).join("\n")}`,
      `YOUR NOTES / RESULT\n${draft.notes || "No notes yet."}`,
      `OFFICIAL REFERENCE\n${lesson.reference.url}\nCourse references checked ${courseReviewed}.`,
    ].join("\n\n");
    const url = URL.createObjectURL(
      new Blob([contents], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `jeff-chatgpt-${lesson.id}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="web-app chatgpt-app">
      <header className="web-header">
        <Link href="/" className="web-brand" aria-label="JEFF home">
          j<span>.</span>
          <strong>
            JEFF <small>/ AI made simple</small>
          </strong>
        </Link>
        <nav aria-label="JEFF modes">
          <Link href="/">Assistant</Link>
          <Link href="/excel">Excel Tutor</Link>
          <Link href="/web-development">Web Tutor</Link>
          <Link href="/chatgpt-basics" aria-current="page">
            AI Made Simple
          </Link>
          <Link href="/computer-basics">PC & Windows</Link>
        </nav>
      </header>
      <main className="web-layout">
        <aside className="web-sidebar" aria-label="AI Made Simple course navigation">
          <span className="web-eyebrow">BEGINNER · PRACTICAL · EVERYDAY USE</span>
          <h1>AI made simple.</h1>
          <p>
            ChatGPT, Microsoft Copilot and Canva.
            <br />
            One practical module at a time.
          </p>
          <div className="web-progress">
            <span>
              {progress.completed.length} / {chatgptLessons.length} checks
              complete
            </span>
            <strong>
              {Math.round(
                (progress.completed.length / chatgptLessons.length) * 100,
              )}
              %
            </strong>
            <progress
              aria-label="AI Made Simple course progress"
              max={chatgptLessons.length}
              value={progress.completed.length}
            />
          </div>
          <label className="web-search">
            <span className="sr-only">Find an AI Made Simple lesson</span>
            <input
              placeholder="Find a module…"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
          </label>
          <nav aria-label="AI Made Simple lessons">
            {groups.map((group) => {
              const items = filtered.filter((item) => item.group === group);
              return (
                items.length > 0 && (
                  <details
                    key={group}
                    className="web-group"
                    open={!!filter || group === lesson.group}
                  >
                    <summary>
                      {group}
                      <span>{items.length}</span>
                    </summary>
                    {items.map((item) => (
                      <button
                        key={item.id}
                        disabled={!ready}
                        aria-current={
                          lesson.id === item.id ? "step" : undefined
                        }
                        onClick={() => selectLesson(item.id)}
                      >
                        <span>
                          {progress.completed.includes(item.id) ? (
                            <Check size={13} aria-label="Complete" />
                          ) : (
                            String(chatgptLessons.indexOf(item) + 1).padStart(
                              2,
                              "0",
                            )
                          )}
                        </span>
                        {item.title}
                      </button>
                    ))}
                  </details>
                )
              );
            })}
            {!filtered.length && (
              <p className="web-note">
                No matching modules. Try “ChatGPT”, “Copilot” or “Canva”.
              </p>
            )}
          </nav>
          <p className="web-note">
            Knowledge checks track your progress. Review your practice outputs
            with each lesson’s checklist.
          </p>
          <button
            className="web-text-button"
            disabled={!ready}
            onClick={() => setConfirmReset(!confirmReset)}
          >
            <RotateCcw size={12} /> Reset course progress
          </button>
          {confirmReset && (
            <div className="web-confirm">
              <p>
                Clear completed checks? Your prompts, notes and conversations
                will be kept.
              </p>
              <button
                onClick={() => {
                  save({ ...progress, completed: [] });
                  setChoice(null);
                  setFeedback(null);
                  setConfirmReset(false);
                }}
              >
                Clear completed checks
              </button>
              <button onClick={() => setConfirmReset(false)}>
                Keep progress
              </button>
            </div>
          )}
          {storageError && (
            <p role="alert" className="web-error">
              {storageError}
            </p>
          )}
        </aside>
        <section
          className="web-workspace"
          aria-label="ChatGPT lesson and practice"
        >
          <div className="chatgpt-welcome">
            <Sparkles size={20} />
            <div>
              <strong>Learn here. Practise in ChatGPT.</strong>
              <p>
                Follow the modules here, then practise in ChatGPT, Microsoft
                Copilot or Canva. Each account’s tools and limits apply.
              </p>
            </div>
            <a
              href="https://chatgpt.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="web-secondary"
            >
              Open ChatGPT <ExternalLink size={13} />
            </a>
          </div>
          <CourseDocuments />
          <article className="web-lesson" key={lesson.id}>
            <div className="web-meta">
              <span>
                Lesson {index + 1} of {chatgptLessons.length}
              </span>
              <span>About {lesson.minutes} minutes</span>
            </div>
            <h2>{lesson.title}</h2>
            <p className="web-goal">{lesson.goal}</p>
            <button
              className="web-secondary"
              disabled={!narration.available || microphoneActive}
              onClick={() =>
                narration.speaking
                  ? narration.stop()
                  : narration.speak(
                      `${lesson.title}. ${lesson.goal} ${lesson.steps.join(" ")} Your practice. ${lesson.exercise}`,
                    )
              }
            >
              <Volume2 size={14} />
              {narration.speaking ? "Stop reading" : "Read lesson"}
            </button>
            <ol className="chatgpt-steps">
              {lesson.steps.map((step, i) => (
                <li key={i}>
                  <span>{i + 1}</span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
            <section
              className="chatgpt-prompt"
              aria-labelledby="prompt-heading"
            >
              <div className="chatgpt-section-heading">
                <div>
                  <span className="web-eyebrow">MAKE IT YOUR OWN</span>
                  <h3 id="prompt-heading">Your practice prompt</h3>
                </div>
                <button
                  className="web-secondary"
                  disabled={!ready || !draft.prompt.trim()}
                  onClick={() => void copyPrompt()}
                >
                  <Copy size={13} /> Copy prompt
                </button>
              </div>
              <p className="web-note">
                Edit this example, replace any [placeholders], then paste it
                into ChatGPT. Each lesson keeps its own draft.
              </p>
              <label className="sr-only" htmlFor="chatgpt-prompt">
                Your practice prompt
              </label>
              <textarea
                ref={editor}
                id="chatgpt-prompt"
                rows={9}
                maxLength={12000}
                value={draft.prompt}
                disabled={!ready}
                onChange={(event) => {
                  updateDraft({ prompt: event.target.value });
                  setCopyMessage("");
                }}
              />
              <p className="chatgpt-copy-status" role="status">
                {copyMessage}
              </p>
              <details className="chatgpt-original">
                <summary>View original example</summary>
                <pre>{lesson.prompt}</pre>
              </details>
            </section>
            <section className="web-exercise">
              <span className="web-eyebrow">TRY IT YOURSELF</span>
              <h3>Your practice task</h3>
              <p>{lesson.exercise}</p>
              <button
                className="web-text-button"
                aria-expanded={hint}
                onClick={() => setHint(!hint)}
              >
                {hint ? "Hide hint" : "Show hint"}
              </button>
              {hint && <div className="web-hint">{lesson.hint}</div>}
              <h4>Before you call it finished</h4>
              <ul className="chatgpt-review">
                {lesson.review.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
            <section className="chatgpt-notes">
              <label htmlFor="chatgpt-notes">
                Your practice notes or finished text
              </label>
              <p className="web-note">
                Paste your result or note what you changed. For images, record
                your prompt and where you saved the file.
              </p>
              <textarea
                id="chatgpt-notes"
                rows={6}
                maxLength={20000}
                disabled={!ready}
                value={draft.notes}
                onChange={(event) => updateDraft({ notes: event.target.value })}
                placeholder="What did you make? What did you improve?"
              />
              <div className="chatgpt-notes-actions">
                <span className="web-note">
                  {ready
                    ? storageError
                      ? "Unsaved changes · download a copy"
                      : "Edits save in this browser"
                    : "Loading saved practice…"}
                </span>
                <button
                  className="web-secondary"
                  disabled={!ready}
                  onClick={downloadPractice}
                >
                  <Download size={13} /> Download practice (.txt)
                </button>
              </div>
            </section>
            <form className="web-check" onSubmit={check}>
              <div className="web-check-heading">
                <span className="web-eyebrow">QUICK KNOWLEDGE CHECK</span>
                {progress.completed.includes(lesson.id) && (
                  <span>
                    <Check size={13} /> Complete
                  </span>
                )}
              </div>
              <fieldset>
                <legend>{lesson.quiz.question}</legend>
                {lesson.quiz.options.map((option, i) => (
                  <label key={option}>
                    <input
                      type="radio"
                      name="chatgpt-check"
                      value={i}
                      checked={choice === i}
                      disabled={!ready}
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
                className="web-primary"
                disabled={!ready || choice === null}
              >
                Check answer
              </button>
              {feedback && (
                <div className={`web-feedback ${feedback}`} role="status">
                  <strong>
                    {feedback === "correct"
                      ? "Correct — check complete."
                      : "Not quite. Try again."}
                  </strong>
                  <p>
                    {feedback === "correct"
                      ? lesson.quiz.explanation
                      : "Review the lesson and choose the most useful approach."}
                  </p>
                </div>
              )}
            </form>
            <div className="web-reference">
              <a
                href={lesson.reference.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {lesson.reference.title} ↗
              </a>
              <span>Reference checked {courseReviewed}</span>
            </div>
            <div className="web-lesson-navigation">
              <button
                disabled={!ready || index === 0}
                onClick={() => selectLesson(chatgptLessons[index - 1].id)}
              >
                <ArrowLeft size={13} /> Previous lesson
              </button>
              <span>
                {index + 1} / {chatgptLessons.length}
              </span>
              <button
                disabled={!ready || index === chatgptLessons.length - 1}
                onClick={() => selectLesson(chatgptLessons[index + 1].id)}
              >
                Next lesson <ArrowRight size={13} />
              </button>
            </div>
            {progress.completed.length === chatgptLessons.length && (
              <div className="chatgpt-finished">
                <Sparkles size={22} />
                <h3>All checks complete.</h3>
                <p>
                  Finish your content pack, keep your best prompts and return
                  whenever you want to practise.
                </p>
              </div>
            )}
          </article>
        </section>
        <LessonCoach
          key={lesson.id}
          lesson={lesson}
          ready={ready}
          narration={narration}
          spoken={progress.spoken}
          onSpokenChange={(spoken) => save({ ...progress, spoken })}
          onMicrophoneActiveChange={setMicrophoneActive}
        />
      </main>
      <footer className="web-footer">
        <span>INTENSITY IT / AI MADE SIMPLE</span>
        <span>8 practical modules · ChatGPT · Microsoft Copilot · Canva</span>
      </footer>
    </div>
  );
}
