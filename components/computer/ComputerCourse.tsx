"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  Monitor,
  RotateCcw,
  Volume2,
} from "lucide-react";
import {
  computerLessons,
  computerReviewed,
  computerSteps,
  windows10Support,
  type WindowsVersion,
} from "@/lib/computer/course";
import {
  computerProgressKey,
  readComputerProgress,
  type ComputerProgress,
} from "@/lib/computer/progress";
import { useLocalNarration } from "@/hooks/useLocalNarration";
import { LessonCoach } from "../tutoring/LessonCoach";
import { PracticePad } from "./PracticePad";
import "../web/web.css";
import "./computer.css";

export function ComputerCourse({ initialLesson }: { initialLesson?: string }) {
  const [progress, setProgress] = useState<ComputerProgress>(() =>
    readComputerProgress(null),
  );
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [filter, setFilter] = useState("");
  const [choice, setChoice] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "retry" | null>(null);
  const [hint, setHint] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const narration = useLocalNarration();
  const [microphoneActive, setMicrophoneActive] = useState(false);
  const index = Math.max(
    0,
    computerLessons.findIndex((item) => item.id === progress.current),
  );
  const lesson = computerLessons[index];
  const steps = computerSteps(lesson, progress.version);
  const note = progress.notes[lesson.id] || "";
  const groups = [...new Set(computerLessons.map((item) => item.group))];
  const filtered = computerLessons.filter((item) =>
    `${item.title} ${item.goal} ${item.group}`
      .toLowerCase()
      .includes(filter.trim().toLowerCase()),
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      let saved = readComputerProgress(null);
      try {
        saved = readComputerProgress(localStorage.getItem(computerProgressKey));
      } catch {
        setStorageError(
          "Browser storage is unavailable. Download your notes before closing this tab.",
        );
      }
      if (initialLesson) saved.current = initialLesson;
      setProgress(saved);
      setReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [initialLesson]);

  function save(next: ComputerProgress) {
    setProgress(next);
    try {
      localStorage.setItem(computerProgressKey, JSON.stringify(next));
      setStorageError("");
    } catch {
      setStorageError(
        "Your changes could not be saved. Download your notes before closing this tab.",
      );
    }
  }
  function resetLessonFeedback() {
    setChoice(null);
    setFeedback(null);
    setHint(false);
    setConfirmReset(false);
  }
  function selectLesson(id: string) {
    narration.stop();
    save({ ...progress, current: id });
    resetLessonFeedback();
    window.history.replaceState(
      null,
      "",
      `/computer-basics?lesson=${encodeURIComponent(id)}`,
    );
  }
  function changeVersion(version: WindowsVersion) {
    narration.stop();
    save({ ...progress, version });
    resetLessonFeedback();
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
  function downloadNotes() {
    const contents = [
      `JEFF — PC & Windows Basics\n${lesson.title}\nWindows ${progress.version}`,
      `GOAL\n${lesson.goal}`,
      `STEPS\n${steps.map((step, i) => `${i + 1}. ${step}`).join("\n\n")}`,
      `PRACTICE\n${lesson.exercise}`,
      `CHECKLIST\n${lesson.review.map((item) => `- ${item}`).join("\n")}`,
      `MY NOTES\n${note || "No notes yet."}`,
      `OFFICIAL REFERENCE\n${lesson.reference.url}\nReferences checked ${computerReviewed}.`,
      progress.version === "10"
        ? `Standard Windows 10 support ended on 14 October 2025. ESU and certain specialised editions have separate support terms.\n${windows10Support}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    const url = URL.createObjectURL(
      new Blob([contents], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `jeff-computer-${lesson.id}-windows-${progress.version}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="web-app computer-app">
      <header className="web-header">
        <Link href="/" className="web-brand" aria-label="JEFF home">
          j<span>.</span>
          <strong>
            JEFF <small>/ PC & Windows</small>
          </strong>
        </Link>
        <nav aria-label="JEFF modes">
          <Link href="/">Assistant</Link>
          <Link href="/excel">Excel Tutor</Link>
          <Link href="/web-development">Web Tutor</Link>
          <Link href="/chatgpt-basics">AI Made Simple</Link>
          <Link href="/computer-basics" aria-current="page">
            PC & Windows
          </Link>
        </nav>
      </header>
      <main className="web-layout">
        <aside className="web-sidebar" aria-label="Computer course navigation">
          <span className="web-eyebrow">SMALL STEPS. EVERYDAY CONFIDENCE.</span>
          <h1>PC & Windows basics.</h1>
          <p>
            Get comfortable with your computer.
            <br />
            No previous experience needed.
          </p>
          <div className="web-progress">
            <span>
              {progress.completed.length} / {computerLessons.length} checks
              complete
            </span>
            <strong>
              {Math.round(
                (progress.completed.length / computerLessons.length) * 100,
              )}
              %
            </strong>
            <progress
              aria-label="Computer course progress"
              max={computerLessons.length}
              value={progress.completed.length}
            />
          </div>
          <label className="web-search">
            <span className="sr-only">Find a computer lesson</span>
            <input
              placeholder="Find a lesson…"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
          </label>
          <nav aria-label="Computer lessons">
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
                            String(computerLessons.indexOf(item) + 1).padStart(
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
                No matching lessons. Try “files”, “Wi-Fi” or “keyboard”.
              </p>
            )}
          </nav>
          <p className="web-note">
            Checks track what you have learned. Practise on your Windows
            computer and use each checklist at your own pace.
          </p>
          <button
            className="web-text-button"
            disabled={!ready}
            onClick={() => setConfirmReset(!confirmReset)}
          >
            <RotateCcw size={13} /> Reset course progress
          </button>
          {confirmReset && (
            <div className="web-confirm">
              <p>
                Clear completed checks? Your notes and conversations will be
                kept.
              </p>
              <button
                onClick={() => {
                  save({ ...progress, completed: [] });
                  resetLessonFeedback();
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
            <p className="web-error" role="alert">
              {storageError}
            </p>
          )}
        </aside>
        <section
          className="web-workspace"
          aria-label="Computer lesson and practice"
        >
          <div className="computer-welcome">
            <Monitor size={24} />
            <div>
              <strong>Your computer, at your pace.</strong>
              <p>
                Read a step, try it on your Windows PC, then come back. JEFF can
                explain anything you get stuck on.
              </p>
            </div>
            <label className="computer-version">
              I am learning on
              <select
                aria-label="Windows version"
                value={progress.version}
                disabled={!ready}
                onChange={(event) =>
                  changeVersion(event.target.value as WindowsVersion)
                }
              >
                <option value="11">Windows 11</option>
                <option value="10">Windows 10</option>
              </select>
            </label>
          </div>
          {progress.version === "10" && (
            <p className="computer-support">
              Standard Windows 10 support ended on 14 October 2025. Extended
              Security Updates and certain specialised editions have separate
              support terms.{" "}
              <a
                href={windows10Support}
                target="_blank"
                rel="noopener noreferrer"
              >
                Check Microsoft’s support guidance ↗
              </a>
            </p>
          )}
          <article
            className="web-lesson"
            key={`${lesson.id}:${progress.version}`}
          >
            <div className="web-meta">
              <span>
                Lesson {index + 1} of {computerLessons.length}
              </span>
              <span>
                About {lesson.minutes} minutes · Windows {progress.version}
              </span>
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
                      `${lesson.title}. Windows ${progress.version}. ${lesson.goal} ${steps.join(" ")} Your practice. ${lesson.exercise}`,
                    )
              }
            >
              <Volume2 size={15} />
              {narration.speaking ? "Stop reading" : "Read lesson"}
            </button>
            <ol className="computer-steps">
              {steps.map((step, i) => (
                <li key={i}>
                  <span>{i + 1}</span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
            {lesson.practice && <PracticePad kind={lesson.practice} />}
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
              <h4>Before you move on</h4>
              <ul className="computer-review">
                {lesson.review.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
            <section className="computer-notes">
              <label htmlFor="computer-notes">Your lesson notes</label>
              <p className="web-note">
                Write what you tried and what you want to practise again. Keep
                passwords and sign-in codes out of your notes.
              </p>
              <textarea
                id="computer-notes"
                rows={5}
                maxLength={20000}
                disabled={!ready}
                value={note}
                onChange={(event) =>
                  save({
                    ...progress,
                    notes: {
                      ...progress.notes,
                      [lesson.id]: event.target.value,
                    },
                  })
                }
                placeholder="Today I learned how to…"
              />
              <div className="computer-notes-actions">
                <span className="web-note">
                  {ready
                    ? storageError
                      ? "Unsaved changes · download a copy"
                      : "Notes save in this browser"
                    : "Loading your notes…"}
                </span>
                <button
                  className="web-secondary"
                  disabled={!ready}
                  onClick={downloadNotes}
                >
                  <Download size={14} /> Download lesson notes (.txt)
                </button>
              </div>
            </section>
            <form className="web-check" onSubmit={check}>
              <div className="web-check-heading">
                <span className="web-eyebrow">QUICK KNOWLEDGE CHECK</span>
                {progress.completed.includes(lesson.id) && (
                  <span>
                    <Check size={14} /> Complete
                  </span>
                )}
              </div>
              <fieldset>
                <legend>{lesson.quiz.question}</legend>
                {lesson.quiz.options.map((option, i) => (
                  <label key={option}>
                    <input
                      type="radio"
                      name="computer-check"
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
                      : "Read the steps or use the hint, then have another go."}
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
              <span>Reference checked {computerReviewed}</span>
            </div>
            <div className="web-lesson-navigation">
              <button
                disabled={!ready || index === 0}
                onClick={() => selectLesson(computerLessons[index - 1].id)}
              >
                <ArrowLeft size={14} /> Previous lesson
              </button>
              <span>
                {index + 1} / {computerLessons.length}
              </span>
              <button
                disabled={!ready || index === computerLessons.length - 1}
                onClick={() => selectLesson(computerLessons[index + 1].id)}
              >
                Next lesson <ArrowRight size={14} />
              </button>
            </div>
            {progress.completed.length === computerLessons.length && (
              <div className="computer-finished">
                <Check size={24} />
                <h3>All checks complete.</h3>
                <p>
                  Finish your everyday practice project and return whenever you
                  want a refresher. Confidence grows with practice.
                </p>
              </div>
            )}
          </article>
        </section>
        <LessonCoach
          key={`${lesson.id}:${progress.version}`}
          lesson={lesson}
          ready={ready}
          narration={narration}
          spoken={progress.spoken}
          onSpokenChange={(spoken) => save({ ...progress, spoken })}
          onMicrophoneActiveChange={setMicrophoneActive}
          config={{
            topic: "PC and Windows",
            historyScope: `computer:${progress.version}`,
            endpoint: "/api/computer-tutor",
            requestContext: { version: progress.version },
            description:
              "Tell me which step you are on. We can take it one step at a time.",
            placeholder: "I cannot find the folder I saved. What should I try?",
            footer:
              "JEFF explains the steps; you stay in control of your computer. He cannot see your screen or change your settings.",
          }}
        />
      </main>
      <footer className="web-footer">
        <span>JEFF / PC & WINDOWS BASICS</span>
        <span>
          {computerLessons.length} practical lessons · Local tutor · Your own
          pace
        </span>
      </footer>
    </div>
  );
}
