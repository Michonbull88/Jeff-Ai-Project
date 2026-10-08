"use client";
import { useEffect, useRef } from "react";
import {
  createFaceGeometry,
  faceDepth,
  getNodAmount,
} from "@/lib/visual/faceGeometry";
import type { JeffState } from "@/types";

export function JeffFace({
  state,
  audioLevel,
  intensity,
}: {
  state: JeffState;
  audioLevel: number;
  intensity: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const values = useRef({ state, audioLevel, intensity });
  useEffect(() => {
    values.current = { state, audioLevel, intensity };
  }, [state, audioLevel, intensity]);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    const geometry = createFaceGeometry();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0,
      last = 0,
      phase = 0,
      amplitude = 0,
      talking = 0;
    const startedAt = performance.now();
    let visible = !document.hidden;
    let width = 0,
      height = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = el.clientWidth;
      height = el.clientHeight;
      el.width = width * dpr;
      el.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    const visibility = () => {
      visible = !document.hidden;
    };
    document.addEventListener("visibilitychange", visibility);
    const draw = (time: number) => {
      frame = requestAnimationFrame(draw);
      if (!visible || time - last < (reduced.matches ? 100 : 15)) return;
      const dt = Math.min(time - last, 50);
      last = time;
      const { state, audioLevel, intensity } = values.current;
      const motion = reduced.matches ? 0 : intensity;
      phase += dt * 0.00045 * motion;
      amplitude += (audioLevel * motion - amplitude) * Math.min(1, dt / 65);
      const speaking = state === "speaking";
      const thinking = state === "thinking";
      talking += ((speaking ? motion : 0) - talking) * Math.min(1, dt / 220);
      const nod = motion * getNodAmount(time - startedAt);
      const color =
        state === "error"
          ? "222,159,136"
          : thinking
            ? "163,182,242"
            : "151,214,224";
      const cx = width / 2,
        cy = height * 0.495;
      const scale =
        width * 0.355 * (1 + Math.sin(phase * 1.1) * 0.006 + amplitude * 0.013);
      const yaw =
        -0.13 +
        Math.sin(phase * 0.48) * 0.15 +
        Math.sin(phase * 0.21 + 1.4) * 0.035 +
        talking *
          (Math.sin(phase * 1.7) * 0.23 +
            Math.sin(phase * 3.1) * amplitude * 0.12);
      const pitch =
        -0.025 +
        Math.sin(phase * 0.57) * 0.028 +
        talking * (Math.sin(phase * 2.3) * 0.065 + amplitude * 0.12) +
        nod * 0.09;
      const roll =
        Math.sin(phase * 0.36 + 0.7) * 0.018 +
        talking * Math.sin(phase * 1.3) * 0.045;
      const shiftX =
        Math.sin(phase * 0.48) * width * 0.012 +
        talking * Math.sin(phase * 1.4) * width * 0.015;
      const shiftY =
        (nod * 0.018 +
          talking * (Math.sin(phase * 2.2) * 0.008 - amplitude * 0.012)) *
        height;
      const cosRoll = Math.cos(roll),
        sinRoll = Math.sin(roll);
      const sin = Math.sin(yaw),
        cos = Math.cos(yaw);
      const project = (x: number, y: number, z: number) => {
        const xx = x * cos + (z - 0.3) * sin;
        const zz = z * cos - x * sin;
        const perspective = 1 + zz * 0.1;
        const yy = y * Math.cos(pitch) + (zz - 0.3) * Math.sin(pitch);
        return [
          cx + shiftX + (xx * cosRoll - yy * sinRoll) * scale * perspective,
          cy + shiftY + (xx * sinRoll + yy * cosRoll) * scale * perspective,
        ];
      };
      ctx.clearRect(0, 0, width, height);
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, width * 0.49);
      halo.addColorStop(0, `rgba(${color},${0.065 + amplitude * 0.05})`);
      halo.addColorStop(0.6, `rgba(${color},0.025)`);
      halo.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, width, height);

      // Broken orbital arcs frame the face without turning it back into a sphere.
      for (let ring = 0; ring < 2; ring++) {
        ctx.beginPath();
        ctx.ellipse(
          cx,
          cy,
          scale * (0.98 + ring * 0.13) + amplitude * 5,
          scale * (1.13 + ring * 0.06),
          -0.1,
          -1.05 + ring * Math.PI,
          1.07 + ring * Math.PI,
        );
        ctx.strokeStyle = `rgba(${color},${ring ? 0.1 : 0.19})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
      const scan = ((phase * (thinking ? 0.72 : 0.22)) % 2.6) - 1.3;
      // Use wall-clock time so animation intensity does not change blink frequency.
      const blinkElapsed = time - startedAt - 5000;
      const blinkCycle = blinkElapsed % 5000;
      const blink =
        motion > 0 && blinkElapsed >= 0 && blinkCycle < 220
          ? Math.sin((blinkCycle / 220) * Math.PI)
          : 0;
      const mouth = speaking ? amplitude * 0.22 : 0;
      const pixel = Math.max(0.65, width / 405);
      for (let row = 0; row < geometry.length; row++) {
        const points = geometry[row];
        // Fine contours connect rows of illuminated tiles into a coherent relief.
        if (row % 3 === 0) {
          ctx.beginPath();
          points.forEach((p, i) => {
            const [x, y] = project(p.x, p.y + mouth * p.lip, p.z);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.strokeStyle = `rgba(${color},0.055)`;
          ctx.lineWidth = 0.45;
          ctx.stroke();
        }
        for (let col = 0; col < points.length; col++) {
          const p = points[col];
          const scanLight = Math.max(0, 1 - Math.abs(p.y - scan) / 0.08) * 0.19;
          const flicker =
            0.86 + 0.14 * Math.sin(phase * 1.5 + col * 1.8 + p.noise * 4);
          const edgeFade = Math.max(0.1, 1 - p.edge ** 8 * 0.8);
          const eyeDark = 1 - p.eye * (1 - blink) * 0.83;
          const alpha = Math.min(
            0.93,
            (0.085 + p.light ** 2 * 0.66 + scanLight + amplitude * 0.13) *
              (0.55 + p.noise * 0.65) *
              edgeFade *
              flicker *
              eyeDark,
          );
          const [x, y] = project(p.x, p.y + mouth * p.lip, p.z);
          ctx.fillStyle = `rgba(${color},${alpha})`;
          const tileWidth = pixel * (0.7 + p.noise * 0.9);
          ctx.fillRect(x, y, tileWidth, pixel * (1.0 + p.noise * 1.1));
          if (p.light > 0.7 && p.noise > 0.72) {
            ctx.fillStyle = `rgba(225,249,255,${alpha * 0.65})`;
            ctx.fillRect(x, y, tileWidth, pixel * 0.65);
          }
        }
      }
      // Thin almond eyelids and a small iris catchlight keep the gaze calm and alive.
      ctx.save();
      ctx.shadowColor = `rgb(${color})`;
      ctx.shadowBlur = 7 + amplitude * 6;
      for (const side of [-1, 1]) {
        for (const upper of [-1, 1]) {
          ctx.beginPath();
          for (let i = 0; i <= 28; i++) {
            const t = i / 28;
            const x = side * 0.29 + (t - 0.5) * 0.27;
            const y =
              -0.19 +
              Math.sin(t * Math.PI) *
                (upper === -1 ? -0.04 : 0.028) *
                (1 - blink) +
              (t - 0.5) * side * -0.014;
            const point = project(x, y, faceDepth(x, y) + 0.015);
            if (!i) ctx.moveTo(point[0], point[1]);
            else ctx.lineTo(point[0], point[1]);
          }
          ctx.lineWidth = 0.65 * pixel;
          ctx.strokeStyle = `rgba(${color},${upper === -1 ? 0.6 : 0.3})`;
          ctx.stroke();
        }
        if (blink < 0.6) {
          const x = side * 0.29 + Math.sin(phase * 0.38) * 0.012;
          const [ex, ey] = project(x, -0.19, faceDepth(x, -0.19));
          ctx.beginPath();
          ctx.ellipse(
            ex,
            ey,
            2.1 * pixel,
            2.6 * pixel * (1 - blink),
            0,
            0,
            Math.PI * 2,
          );
          ctx.strokeStyle = `rgba(${color},0.52)`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
          ctx.fillStyle = "rgba(226,251,255,0.85)";
          ctx.fillRect(ex - pixel, ey - pixel, pixel, pixel);
        }
      }
      ctx.restore();
      // Sparse fragments drift away from the sides of the projected face.
      for (let i = 0; i < 64; i++) {
        const seed = Math.sin(i * 127.1) * 43758.5453;
        const n = seed - Math.floor(seed);
        const y = ((i * 0.137 + phase * 0.018) % 2.15) - 1.075;
        const x = (i % 2 ? 1 : -1) * (0.76 + n * 0.3);
        const [px, py] = project(x, y, n * 0.3);
        ctx.fillStyle = `rgba(${color},${0.06 + n * 0.18})`;
        ctx.fillRect(px, py, pixel * (0.6 + n), pixel * (1 + n * 2));
      }
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  return (
    <div
      className={`jeff-face state-${state}`}
      role="img"
      aria-label={`JEFF is ${state}`}
    >
      <div className="core-halo" />
      <canvas ref={canvas} />
    </div>
  );
}
