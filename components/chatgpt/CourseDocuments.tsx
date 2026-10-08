"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Download, FileText, LoaderCircle, Trash2, Upload } from "lucide-react";

type CourseDocument = {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
};

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CourseDocuments() {
  const [documents, setDocuments] = useState<CourseDocument[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  async function load() {
    try {
      const response = await fetch("/api/chatgpt-documents", {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Documents could not be loaded.");
      setDocuments(result.documents);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Documents could not be loaded.");
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
      void fetch("/api/auth", { cache: "no-store" })
        .then((response) => response.json())
        .then((result) => setIsAdmin(result.user?.role === "admin"));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      for (const file of files) {
        const form = new FormData();
        form.append("document", file);
        const response = await fetch("/api/chatgpt-documents", {
          method: "POST",
          body: form,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(`${file.name}: ${result.error || "Upload failed."}`);
      }
      setMessage(
        files.length === 1
          ? `${files[0].name} is ready to download.`
          : `${files.length} documents are ready to download.`,
      );
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The upload failed.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(document: CourseDocument) {
    if (!window.confirm(`Remove “${document.name}” from the course?`)) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `/api/chatgpt-documents?id=${encodeURIComponent(document.id)}`,
        { method: "DELETE" },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The document could not be removed.");
      setDocuments((current) => current.filter((item) => item.id !== document.id));
      setMessage(`${document.name} was removed.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The document could not be removed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="chatgpt-documents" aria-labelledby="course-documents-heading">
      <div className="chatgpt-section-heading">
        <div>
          <span className="web-eyebrow">COURSE LIBRARY</span>
          <h2 id="course-documents-heading">Course documents</h2>
        </div>
        {isAdmin && <button
          className="web-primary"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          {busy ? <LoaderCircle className="spin" size={16} /> : <Upload size={16} />}
          {busy ? "Adding…" : "Add documents"}
        </button>}
        {isAdmin && <input
          ref={input}
          className="sr-only"
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.rtf,.csv"
          onChange={(event) => void upload(event)}
        />}
      </div>
      <p className="chatgpt-documents-intro">
        Learners can download supporting files from this JEFF installation.
        {isAdmin && " Administrators can add files up to 20 MB each."}
      </p>
      {documents.length ? (
        <ul className="chatgpt-document-list">
          {documents.map((document) => (
            <li key={document.id}>
              <FileText size={22} aria-hidden="true" />
              <div>
                <strong>{document.name}</strong>
                <span>
                  {fileSize(document.size)} · Added {new Date(document.uploadedAt).toLocaleDateString()}
                </span>
              </div>
              <a
                className="web-secondary"
                href={`/api/chatgpt-documents?download=${encodeURIComponent(document.id)}`}
                download
              >
                <Download size={15} /> Download
              </a>
              {isAdmin && <button
                className="chatgpt-document-remove"
                disabled={busy}
                aria-label={`Remove ${document.name}`}
                onClick={() => void remove(document)}
              >
                <Trash2 size={16} />
              </button>}
            </li>
          ))}
        </ul>
      ) : (
        <div className="chatgpt-documents-empty">
          <FileText size={24} />
          <p>No course documents have been added yet.</p>
        </div>
      )}
      {message && <p className="chatgpt-document-message" role="status">{message}</p>}
      {error && <p className="web-error" role="alert">{error}</p>}
    </section>
  );
}
