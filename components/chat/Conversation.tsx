"use client";
import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Globe2 } from "lucide-react";
import { Sources } from "./Sources";
import type { Message } from "@/types";
export function Conversation({
  messages,
  busy,
}: {
  messages: Message[];
  busy: boolean;
}) {
  const list = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  useEffect(() => {
    if (stick.current && list.current)
      list.current.scrollTop = list.current.scrollHeight;
  }, [messages, busy]);
  return (
    <div
      className="conversation"
      ref={list}
      role="log"
      aria-label="Conversation transcript"
      aria-live="polite"
      onScroll={() => {
        if (list.current)
          stick.current =
            list.current.scrollHeight -
              list.current.scrollTop -
              list.current.clientHeight <
            70;
      }}
    >
      {messages.map((message) => (
        <article key={message.id} className={`message ${message.role}`}>
          <div className="message-label">
            {message.role === "assistant" ? (
              <>
                <span className="mini-logo">j.</span> JEFF{" "}
                {message.cached && (
                  <span className="live-label">Saved answer</span>
                )}
                {message.live && (
                  <span className="live-label">
                    <Globe2 size={10} /> Live sources
                  </span>
                )}
              </>
            ) : (
              "You"
            )}
          </div>
          <div className="message-content">
            <ReactMarkdown
              components={{
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
          {!!message.sources?.length && <Sources sources={message.sources} />}
        </article>
      ))}
      {busy && (
        <div className="thinking-line">
          <i />
          <i />
          <i />
          <span>Connecting the dots</span>
        </div>
      )}
    </div>
  );
}
