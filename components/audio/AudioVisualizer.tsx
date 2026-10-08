"use client";
export function AudioVisualizer({
  level,
  active,
}: {
  level: number;
  active: boolean;
}) {
  return (
    <div className={`waveform ${active ? "active" : ""}`} aria-hidden="true">
      {Array.from({ length: 19 }, (_, i) => (
        <i
          key={i}
          style={{
            height: active
              ? `${3 + Math.abs(Math.sin(i * 1.4)) * level * 23}px`
              : `${3 + Math.abs(Math.sin(i * 1.4)) * 5}px`,
          }}
        />
      ))}
    </div>
  );
}
