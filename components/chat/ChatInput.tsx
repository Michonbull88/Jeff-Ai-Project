"use client";
import { useState } from "react";
import { ArrowUp, Mic, Square, LoaderCircle } from "lucide-react";
export function ChatInput({
  onSend,
  onVoice,
  onCancel,
  busy,
  connected,
  connecting,
  microphoneActive = false,
  microphoneTranscribing = false,
  microphoneDisabled = false,
}: {
  onSend: (value: string) => void;
  onVoice: () => void;
  onCancel: () => void;
  busy: boolean;
  connected: boolean;
  connecting: boolean;
  microphoneActive?: boolean;
  microphoneTranscribing?: boolean;
  microphoneDisabled?: boolean;
}) {
  const [value, setValue] = useState("");
  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim() && !busy && !connecting && !microphoneActive) {
          onSend(value.trim());
          setValue("");
        }
      }}
    >
      <button
        type="button"
        className={`composer-mic ${connected || microphoneActive ? "is-live" : ""}`}
        onClick={onVoice}
        disabled={
          microphoneDisabled || (busy && !connected && !microphoneActive)
        }
        aria-label={
          microphoneTranscribing
            ? "Transcribing question"
            : microphoneActive
              ? "Stop and send"
              : connected || connecting
                ? "Stop voice conversation"
                : "Start voice conversation"
        }
        title={
          connected ? "Stop voice conversation" : "Start voice conversation"
        }
      >
        {connecting || microphoneTranscribing ? (
          <LoaderCircle size={19} className="spin" />
        ) : connected || microphoneActive ? (
          <Square size={16} />
        ) : (
          <Mic size={20} />
        )}
      </button>
      <span className="composer-divider" />
      <input
        disabled={microphoneActive}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={12000}
        placeholder="Ask JEFF anything..."
        aria-label="Ask JEFF anything"
        autoComplete="off"
      />
      <kbd>↵</kbd>
      {busy && !connected ? (
        <button
          type="button"
          className="send-button"
          aria-label="Cancel response"
          onClick={onCancel}
        >
          <Square size={15} />
        </button>
      ) : (
        <button
          className="send-button"
          type="submit"
          disabled={!value.trim() || busy || connecting || microphoneActive}
          aria-label="Send message"
        >
          <ArrowUp size={20} />
        </button>
      )}
    </form>
  );
}
