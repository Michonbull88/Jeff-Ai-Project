"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  AudioLines,
  Code2,
  Globe2,
  Lightbulb,
  MessageSquare,
  Mic,
  MicOff,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
  X,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";
import { JeffFace } from "./jeff/JeffFace";
import { Startup } from "./jeff/Startup";
import { AudioVisualizer } from "./audio/AudioVisualizer";
import { ChatInput } from "./chat/ChatInput";
import { Conversation } from "./chat/Conversation";
import { SettingsDialog } from "./SettingsDialog";
import { useRealtime } from "@/hooks/useRealtime";
import { useMicrophone } from "@/hooks/useMicrophone";
import { useSpeech } from "@/hooks/useSpeech";
import type { JeffState, Message, ServerStatus, Settings } from "@/types";
const defaults: Settings = {
  voice: "cedar",
  microphone: "",
  speaker: "",
  intensity: 0.7,
  speakerMuted: false,
};
const prompts = [
  {
    icon: Globe2,
    title: "Explore something",
    detail: "A little curiosity goes a long way",
    prompt:
      "What is an interesting recent discovery in science? Search for current sources.",
  },
  {
    icon: Lightbulb,
    title: "Think it through",
    detail: "Big ideas start with a conversation",
    prompt:
      "Help me think of a small business idea. Ask me about my skills and interests first.",
  },
  {
    icon: Code2,
    title: "Build something",
    detail: "Turn your next idea into reality",
    prompt: "Help me plan my next coding project. Ask me what I want to build.",
  },
];
export function JeffApp() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [settings, setSettings] = useState(defaults);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mode, setMode] = useState<"voice" | "text">("text");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [code, setCode] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const mergeMessage = useCallback(
    (message: Message) =>
      setMessages((list) => {
        const index = list.findIndex((m) => m.id === message.id);
        return index < 0
          ? [...list, message]
          : list.map((m) => (m.id === message.id ? message : m));
      }),
    [],
  );
  const showError = useCallback((message: string) => setError(message), []);
  const voice = useRealtime(settings, mergeMessage, showError);
  const microphone = useMicrophone(
    (text) => void send(text),
    status?.localSpeechAvailable,
  );
  const speech = useSpeech(!voice.connected && !microphone.active, messages);
  const audioLevel = voice.connected ? voice.audioLevel : speech.audioLevel;
  useEffect(() => {
    const c = new AbortController();
    fetch("/api/status", { signal: c.signal })
      .then((r) => r.json())
      .then(setStatus)
      .catch((e) => {
        if (e.name !== "AbortError")
          setError("The server is unavailable. Please refresh and try again.");
      });
    const hydrate = setTimeout(() => {
      try {
        const raw = JSON.parse(localStorage.getItem("jeff-settings") || "null");
        if (raw)
          setSettings({
            ...defaults,
            voice: ["cedar", "marin", "alloy", "ash", "sage"].includes(
              raw.voice,
            )
              ? raw.voice
              : defaults.voice,
            intensity:
              typeof raw.intensity === "number"
                ? Math.max(0, Math.min(1, raw.intensity))
                : 0.7,
            speakerMuted: raw.speakerMuted === true,
          });
      } catch {}
    }, 0);
    return () => {
      clearTimeout(hydrate);
      c.abort();
      controller.current?.abort();
    };
  }, []);
  const changeSettings = (next: Settings) => {
    setSettings(next);
    try {
      localStorage.setItem(
        "jeff-settings",
        JSON.stringify({
          voice: next.voice,
          intensity: next.intensity,
          speakerMuted: next.speakerMuted,
        }),
      );
    } catch {}
  };
  const ready = (provider: "text" | "voice") => {
    if (!status) {
      setError("JEFF is still checking its connection. Please try again.");
      return false;
    }
    if (status.locked) {
      setError("Enter your access code to connect to JEFF.");
      return false;
    }
    if (
      provider === "voice" &&
      !(status.voiceConfigured ?? status.configured)
    ) {
      setError(
        "Paid voice mode is disabled. Use local text chat or the Excel tutor, which can read lessons aloud without OpenAI.",
      );
      return false;
    }
    // Built-in answers, including live weather, do not require Ollama.
    // Let the server report model availability for requests that actually need it.
    return true;
  };
  const cancel = () => {
    controller.current?.abort();
    controller.current = null;
    setBusy(false);
  };
  const clear = () => {
    cancel();
    microphone.cancel();
    voice.stop();
    setMessages([]);
    setError("");
  };
  async function send(text: string) {
    if (busy || voice.connecting || !ready("text")) return;
    setError("");
    const next = [
      ...messages,
      { id: crypto.randomUUID(), role: "user" as const, content: text },
    ];
    setMessages(next);
    if (voice.connected) {
      voice.sendText(text);
      return;
    }
    const c = new AbortController();
    controller.current = c;
    setBusy(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next
            .filter((m) => !m.pending)
            .slice(-40)
            .map(({ role, content }) => ({ role, content })),
        }),
        signal: c.signal,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error || "JEFF could not answer. Please try again.",
        );
      if (!data.content)
        throw new Error("JEFF returned an empty response. Please try again.");
      if (!c.signal.aborted) {
        mergeMessage({ id: crypto.randomUUID(), role: "assistant", ...data });
        if (data.memorySaved === false)
          setError(
            "JEFF answered, but could not save this answer on this computer for reuse.",
          );
      }
    } catch (e) {
      if (!c.signal.aborted)
        setError(
          e instanceof Error ? e.message : "Connection lost. Please try again.",
        );
    } finally {
      if (controller.current === c) {
        controller.current = null;
        setBusy(false);
      }
    }
  }
  const browserVoice = status?.voiceConfigured === false;
  const toggleVoice = () => {
    if (browserVoice) {
      if (microphone.active) microphone.stop();
      else if (!busy && ready("text")) {
        setError("");
        microphone.start();
      }
      return;
    }
    if (voice.connected || voice.connecting) {
      voice.stop();
      return;
    }
    if (busy || !ready("voice")) return;
    setError("");
    setMode("voice");
    void voice.start(messages);
  };
  const state: JeffState = microphone.active
    ? microphone.transcribing
      ? "thinking"
      : "listening"
    : busy
      ? "thinking"
      : voice.connected
        ? voice.state
        : speech.speaking
          ? "speaking"
          : voice.connecting
            ? "thinking"
            : error
              ? "error"
              : "idle";
  const stateText = microphone.active
    ? microphone.transcribing
      ? "Transcribing…"
      : microphone.listening
        ? "Listening…"
        : "Waiting for microphone…"
    : voice.connecting
      ? "Connecting…"
      : busy
        ? "Thinking…"
        : voice.connected
          ? voice.muted && state !== "speaking"
            ? "Microphone muted"
            : state === "listening"
              ? "Listening…"
              : state === "speaking"
                ? "Speaking…"
                : state === "thinking"
                  ? "Thinking…"
                  : "Connected"
          : speech.speaking
            ? "Speaking…"
            : error
              ? "Let’s reconnect"
              : "Ready when you are";
  const unlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlocking(true);
    setError("");
    try {
      const r = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setStatus((s) => (s ? { ...s, locked: false } : s));
      setCode("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to unlock.");
    } finally {
      setUnlocking(false);
    }
  };
  return (
    <div className="app-shell">
      <Startup />
      <header className="topbar">
        <Link className="brand" href="/" aria-label="JEFF home">
          <span className="brand-symbol">
            j<span>.</span>
          </span>
          <span>
            JEFF<span className="brand-sub">PERSONAL INTELLIGENCE</span>
          </span>
        </Link>
        <nav className="mode-switch" aria-label="Conversation mode">
          <button
            className={mode === "voice" ? "selected" : ""}
            aria-pressed={mode === "voice"}
            onClick={() => setMode("voice")}
          >
            <AudioLines size={15} />
            Voice
          </button>
          <button
            className={mode === "text" ? "selected" : ""}
            aria-pressed={mode === "text"}
            onClick={() => {
              voice.stop();
              setMode("text");
            }}
          >
            <MessageSquare size={14} />
            Text
          </button>
        </nav>
        <div className="header-actions">
          <Link href="/computer-basics" className="excel-entry">
            PC & Windows ↗
          </Link>
          <Link href="/chatgpt-basics" className="excel-entry">
            AI Made Simple ↗
          </Link>
          <Link href="/web-development" className="excel-entry">
            Web Tutor ↗
          </Link>
          <Link href="/excel" className="excel-entry">
            Excel Tutor ↗
          </Link>
          <button
            className="new-session"
            aria-label="New session"
            onClick={clear}
            title="Clear conversation and start fresh"
          >
            <Plus size={16} />
            <span>New session</span>
          </button>
          <span className="header-divider" />
          <button
            className="icon-button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
          >
            <Settings2 size={19} />
          </button>
        </div>
      </header>
      <main className={messages.length ? "has-conversation" : ""}>
        <div className="ambient-light" />
        <div className="system-label">
          <span className={`status-dot ${voice.connected ? "live" : ""}`} />
          {voice.connected
            ? "VOICE CONNECTED"
            : status?.configured && !status.locked
              ? "AI SYSTEM ONLINE"
              : status?.locked
                ? "PRIVATE INTELLIGENCE"
                : "NEURAL INTERFACE READY"}
        </div>
        <section
          className="intelligence-stage"
          aria-label="JEFF visual interface"
        >
          <div className="stage-note left">
            <span className="tiny-cross">+</span>
            <span>
              DESIGNED TO UNDERSTAND
              <br />
              BUILT TO CONNECT
            </span>
          </div>
          <JeffFace
            state={state}
            audioLevel={audioLevel}
            intensity={settings.intensity}
          />
          <div className="stage-note right">
            <span>
              VOICE & TEXT
              <br />
              ONE INTELLIGENCE
            </span>
            <span className="tiny-cross">+</span>
          </div>
        </section>
        <div className="state-indicator" role="status">
          <AudioVisualizer
            level={audioLevel}
            active={voice.connected || speech.speaking}
          />
          <span>{stateText}</span>
        </div>
        {!messages.length ? (
          <motion.section
            className="welcome"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1>
              A little more human.
              <br />
              <span>A world of possibility.</span>
            </h1>
            <p>
              Hello, I’m Jeff. Your mind, with a little more room to explore.
            </p>
          </motion.section>
        ) : (
          <Conversation
            messages={messages}
            busy={busy || voice.state === "thinking"}
          />
        )}
        <section
          className="interaction-area"
          aria-label="Conversation controls"
        >
          {!messages.length && (
            <div className="suggestions">
              {prompts.map((item) => (
                <button
                  key={item.title}
                  onClick={() => void send(item.prompt)}
                  disabled={busy || voice.connecting || microphone.active}
                >
                  <item.icon size={17} />
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                  </span>
                  <ArrowUpRight size={14} className="suggestion-arrow" />
                </button>
              ))}
            </div>
          )}
          {status?.locked && (
            <form className="unlock-form" onSubmit={unlock}>
              <LockKeyhole size={16} />
              <input
                type="password"
                aria-label="Access code"
                placeholder="Enter your private access code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                maxLength={300}
              />
              <button disabled={unlocking || !code}>
                {unlocking ? "Unlocking…" : "Unlock JEFF"}
              </button>
            </form>
          )}
          {error && (
            <div
              className="error-banner"
              role="alert"
              aria-label="JEFF notification"
            >
              <span>{error}</span>
              <button onClick={() => setError("")} aria-label="Dismiss error">
                <X size={15} />
              </button>
            </div>
          )}
          <ChatInput
            onSend={(text) => void send(text)}
            onVoice={toggleVoice}
            onCancel={cancel}
            busy={
              busy ||
              (voice.connected &&
                (voice.state === "thinking" || voice.state === "speaking"))
            }
            connected={voice.connected}
            connecting={voice.connecting}
            microphoneActive={microphone.active}
            microphoneTranscribing={microphone.transcribing}
            microphoneDisabled={
              !status || status.locked ||
              (microphone.active && !microphone.listening)
            }
          />
          {browserVoice && (
            <div className="microphone-panel">
              <p>
                Click the mic, speak, then pause or choose Stop and send.{" "}
                {microphone.local
                  ? "Speech is transcribed on this computer."
                  : "Browser recognition may process audio online."}{" "}
                No OpenAI API.
              </p>
              {microphone.active && (
                <>
                  <p role="status">
                    {microphone.statusText} {microphone.transcript}
                  </p>
                  <button
                    type="button"
                    className="soft-button"
                    onClick={microphone.cancel}
                  >
                    Cancel microphone
                  </button>
                </>
              )}
              {microphone.error && <p role="alert">{microphone.error}</p>}
            </div>
          )}
          <div className="voice-controls">
            {voice.connected ? (
              <>
                <button
                  className={`soft-button ${voice.muted ? "muted" : ""}`}
                  onClick={voice.toggleMute}
                >
                  {voice.muted ? <MicOff size={14} /> : <Mic size={14} />}{" "}
                  {voice.muted ? "Unmute mic" : "Mic is live"}
                </button>
                <button className="soft-button" onClick={voice.stop}>
                  <Square size={11} /> End conversation
                </button>
              </>
            ) : mode === "voice" ? (
              <button
                className="start-voice"
                onClick={toggleVoice}
                disabled={busy}
              >
                {voice.connecting ? (
                  <LoaderCircle size={15} className="spin" />
                ) : (
                  <AudioLines size={16} />
                )}{" "}
                {voice.connecting
                  ? "Cancel connection"
                  : microphone.active
                    ? "Stop and send"
                    : "Start a conversation"}
                <span>Speak naturally. I’m here.</span>
              </button>
            ) : (
              <span className="text-hint">
                Text replies are read aloud when voice isn’t connected.
              </span>
            )}
            {voice.connected && (
              <button
                className="icon-button"
                onClick={() =>
                  changeSettings({
                    ...settings,
                    speakerMuted: !settings.speakerMuted,
                  })
                }
                aria-label={
                  settings.speakerMuted ? "Unmute speaker" : "Mute speaker"
                }
              >
                {settings.speakerMuted ? (
                  <VolumeX size={16} />
                ) : (
                  <Volume2 size={16} />
                )}
              </button>
            )}
          </div>
        </section>
      </main>
      <footer>
        <span>
          <ShieldCheck size={12} />
          {microphone.active
            ? microphone.transcribing
              ? "Microphone off · transcribing on this computer"
              : microphone.local
                ? "Microphone active · local speech recognition"
                : "Microphone active · browser speech recognition"
            : voice.micActive && !voice.muted
              ? voice.connected
                ? "Microphone active · audio sent to OpenAI"
                : "Microphone active · connecting to voice"
              : voice.micActive
                ? "Microphone muted · no audio sent"
                : "Your microphone stays off until you say so"}
        </span>
        <span className="footer-centre">THOUGHTFULLY CONNECTED.</span>
        <span>
          <Sparkles size={12} /> Local AI · Ollama
        </span>
      </footer>
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={changeSettings}
        onClear={clear}
        active={voice.connected || voice.connecting}
      />
    </div>
  );
}
