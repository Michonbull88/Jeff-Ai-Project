"use client";

import { useState } from "react";
import { Folder, MousePointer2, Keyboard } from "lucide-react";

export function PracticePad({ kind }: { kind: "pointer" | "typing" }) {
  const [selected, setSelected] = useState(false);
  const [opened, setOpened] = useState(false);
  const [menu, setMenu] = useState(false);
  const [menuDone, setMenuDone] = useState(false);
  const [typed, setTyped] = useState("");
  const target = "I can use my computer.";
  return (
    <section className="computer-pad" aria-label="Browser practice pad">
      <span className="web-eyebrow">PRACTISE RIGHT HERE</span>
      <h3>
        {kind === "pointer" ? (
          <MousePointer2 size={19} />
        ) : (
          <Keyboard size={19} />
        )}{" "}
        {kind === "pointer" ? "Pointer practice" : "Keyboard practice"}
      </h3>
      <p>
        This practice pad stays inside the page. It does not change Windows or
        your files, and it resets when you change lessons.
      </p>
      {kind === "pointer" ? (
        <>
          <p>
            Click the folder once to select it, double-click to open it, then
            right-click for a practice menu.
          </p>
          <button
            className={`computer-target ${selected ? "selected" : ""}`}
            aria-label="Practice folder"
            aria-pressed={selected}
            onClick={() => setSelected(true)}
            onDoubleClick={() => {
              setSelected(true);
              setOpened(true);
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              setMenu(true);
              setMenuDone(true);
            }}
          >
            <Folder size={36} /> Practice folder
          </button>
          <div className="computer-pad-actions">
            <button
              className="web-secondary"
              onClick={() => {
                setSelected(true);
                setOpened(true);
              }}
            >
              Open practice folder
            </button>
            <button
              className="web-secondary"
              aria-expanded={menu}
              onClick={() => {
                setMenu(!menu);
                setMenuDone(true);
              }}
            >
              Show practice menu
            </button>
          </div>
          {menu && (
            <div className="computer-practice-menu">
              <p>A menu offers actions for the selected item.</p>
              <button className="web-secondary" onClick={() => setMenu(false)}>
                Close practice menu
              </button>
            </div>
          )}
          <p className="computer-pad-status" role="status">
            {selected ? "✓ Selected" : "○ Select"} ·{" "}
            {opened ? "✓ Opened" : "○ Open"} ·{" "}
            {menuDone ? "✓ Menu explored" : "○ Explore menu"}
          </p>
          <small>
            The extra buttons let you practise with a keyboard or touch screen
            too.
          </small>
        </>
      ) : (
        <>
          <p>Type this sentence, including its capital letter and full stop:</p>
          <p className="computer-typing-target">{target}</p>
          <label htmlFor="computer-typing">Type the practice sentence</label>
          <textarea
            id="computer-typing"
            rows={3}
            maxLength={200}
            spellCheck={false}
            autoComplete="off"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
          />
          <p className="computer-pad-status" role="status">
            {typed === target
              ? "Well done — the sentence matches."
              : typed
                ? "Keep practising. Check capitals, spaces and the full stop."
                : "Take your time. There is no timer."}
          </p>
        </>
      )}
    </section>
  );
}
