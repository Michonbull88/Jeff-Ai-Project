"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  X,
  SlidersHorizontal,
  Trash2,
  Volume2,
  ShieldCheck,
} from "lucide-react";
import type { Settings } from "@/types";
export function SettingsDialog({
  open,
  onClose,
  settings,
  onChange,
  onClear,
  active,
}: {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onChange: (settings: Settings) => void;
  onClear: () => void;
  active: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [sinkSupported, setSinkSupported] = useState(false);
  useEffect(() => {
    if (open) {
      dialog.current?.showModal();
      navigator.mediaDevices
        ?.enumerateDevices()
        .then((list) => {
          setDevices(list);
          setSinkSupported("setSinkId" in HTMLMediaElement.prototype);
        })
        .catch(() => {});
    } else dialog.current?.close();
  }, [open]);
  return (
    <dialog
      ref={dialog}
      className="settings-dialog"
      aria-labelledby="settings-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
    >
      <div className="dialog-content">
        <header>
          <div>
            <SlidersHorizontal size={17} />
            <h2 id="settings-title">Make JEFF your own</h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </header>
        <p className="dialog-intro">
          A few details. A more personal connection.
        </p>
        <label className="setting-row">
          <span>
            Voice<small>The voice behind the intelligence</small>
          </span>
          <select
            value={settings.voice}
            disabled={active}
            onChange={(e) =>
              onChange({
                ...settings,
                voice: e.target.value as Settings["voice"],
              })
            }
          >
            <option value="cedar">Cedar · warm</option>
            <option value="marin">Marin · clear</option>
            <option value="alloy">Alloy · balanced</option>
            <option value="ash">Ash · calm</option>
            <option value="sage">Sage · grounded</option>
          </select>
        </label>
        <label className="setting-row">
          <span>
            Microphone<small>Used only when you start voice</small>
          </span>
          <select
            value={settings.microphone}
            disabled={active}
            onChange={(e) =>
              onChange({ ...settings, microphone: e.target.value })
            }
          >
            <option value="">System default</option>
            {devices
              .filter(
                (d) =>
                  d.kind === "audioinput" &&
                  d.deviceId &&
                  d.deviceId !== "default",
              )
              .map((d, i) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microphone ${i + 1}`}
                </option>
              ))}
          </select>
        </label>
        <label className="setting-row">
          <span>
            Speaker<small>Audio output device</small>
          </span>
          <select
            value={settings.speaker}
            disabled={active || !sinkSupported}
            onChange={(e) => onChange({ ...settings, speaker: e.target.value })}
          >
            <option value="">System default</option>
            {devices
              .filter(
                (d) =>
                  d.kind === "audiooutput" &&
                  d.deviceId &&
                  d.deviceId !== "default",
              )
              .map((d, i) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Speaker ${i + 1}`}
                </option>
              ))}
          </select>
        </label>
        {active && (
          <p className="setting-note">
            End voice to change the voice or audio devices.
          </p>
        )}
        <label className="setting-row">
          <span>
            Animation intensity<small>Find your level of energy</small>
          </span>
          <input
            aria-label="Animation intensity"
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={settings.intensity}
            onChange={(e) =>
              onChange({ ...settings, intensity: Number(e.target.value) })
            }
          />
        </label>
        <div className="setting-row">
          <span>
            Voice playback<small>AI-generated speech</small>
          </span>
          <button
            className="soft-button"
            aria-pressed={!settings.speakerMuted}
            onClick={() =>
              onChange({ ...settings, speakerMuted: !settings.speakerMuted })
            }
          >
            <Volume2 size={15} />
            {settings.speakerMuted ? "Muted" : "Enabled"}
          </button>
        </div>
        <div className="setting-row">
          <span>
            Conversation<small>Kept in this tab until you leave</small>
          </span>
          <button
            className="soft-button danger"
            onClick={() => {
              onClear();
              onClose();
            }}
          >
            <Trash2 size={14} /> Clear
          </button>
        </div>
        <div className="setting-row">
          <span>Backup &amp; transfer<small>Move lessons and notes to another computer</small></span>
          <Link className="soft-button" href="/transfer">Open</Link>
        </div>
        <p className="privacy-note">
          <ShieldCheck size={15} /> Your microphone is off until you start
          voice. Audio is sent to OpenAI during a voice session; JEFF does not
          save recordings.
        </p>
      </div>
    </dialog>
  );
}
