"use client";
import { useState } from "react";
import Link from "next/link";
import {
  backupLimit,
  createBrowserBackup,
  parseBrowserBackup,
  restoreBrowserBackup,
  type BrowserBackup,
} from "@/lib/browserBackup";
import "./transfer.css";

export function TransferProgress() {
  const [backup, setBackup] = useState<BrowserBackup | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  function download() {
    setError("");
    setMessage("");
    try {
      const saved = createBrowserBackup(localStorage);
      const count = Object.keys(saved.entries).length;
      if (!count)
        throw new Error(
          "No saved JEFF records were found in this browser. Open this page in the same browser and site address you use for your lessons.",
        );
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(saved, null, 2)], {
          type: "application/json",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `jeff-browser-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(
        `Downloaded ${count} saved records. Copy the JSON file into your JEFF transfer folder.`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not read browser storage.",
      );
    }
  }
  async function choose(file?: File) {
    setBackup(null);
    setError("");
    setMessage("");
    if (!file) return;
    try {
      if (file.size > backupLimit)
        throw new Error("Choose a JEFF browser backup under 10 MB.");
      setBackup(parseBrowserBackup(await file.text()));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not read the backup.",
      );
    }
  }
  function restore() {
    if (!backup) return;
    setError("");
    setMessage("");
    try {
      restoreBrowserBackup(localStorage, backup);
      setMessage(
        "Backup restored. Open a course to continue with your saved progress and conversations.",
      );
      setBackup(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not restore the backup.",
      );
    }
  }
  return (
    <main className="transfer-page">
      <Link href="/" className="transfer-home">
        ← Back to JEFF
      </Link>
      <span className="transfer-eyebrow">TAKE YOUR LEARNING WITH YOU</span>
      <h1>Move your progress.</h1>
      <p>
        Your completed checks, notes, practice drafts, playground code, tutor
        conversations and preferences live in this browser. Use a backup to move
        them to another computer.
      </p>
      <section>
        <span className="transfer-step">01 / ON THIS COMPUTER</span>
        <h2>Download your browser backup</h2>
        <p>
          Use the browser and address where you normally use JEFF. Copy the
          downloaded JSON file into the transfer folder or onto your USB drive.
        </p>
        <button onClick={download}>Download JEFF backup</button>
      </section>
      <section>
        <span className="transfer-step">02 / ON THE NEW COMPUTER</span>
        <h2>Restore your browser backup</h2>
        <p>
          Start JEFF on the new computer and open this page. Restoring replaces
          matching JEFF records. Download a backup first if you need to keep
          this browser’s version.
        </p>
        <label htmlFor="jeff-backup">Choose your JEFF backup (.json)</label>
        <input
          id="jeff-backup"
          type="file"
          accept=".json,application/json"
          onChange={(event) => void choose(event.target.files?.[0])}
        />
        {backup && (
          <div className="transfer-preview">
            <p>
              {Object.keys(backup.entries).length} saved records · Exported{" "}
              {new Date(backup.exportedAt).toLocaleString()}
            </p>
            <button onClick={restore}>Restore this backup</button>
          </div>
        )}
      </section>
      {error && (
        <p role="alert" className="transfer-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="transfer-success">
          {message}
        </p>
      )}
      <p className="transfer-note">
        Backup files can contain your notes and conversations. Keep them with
        your personal files. JEFF’s application, AI models and disk archive of
        saved answers are supplied separately in the transfer folder.
        Main-assistant conversations that existed only in an open tab are not
        included.
      </p>
    </main>
  );
}
