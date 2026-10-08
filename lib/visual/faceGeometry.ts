const gaussian = (
  x: number,
  y: number,
  cx: number,
  cy: number,
  sx: number,
  sy: number,
) => Math.exp(-(((x - cx) / sx) ** 2) - ((y - cy) / sy) ** 2);

export function faceWidth(y: number) {
  return Math.sqrt(Math.max(0, 1 - y * y)) * (0.74 - 0.14 * Math.max(0, y));
}

export function getNodAmount(elapsedMs: number) {
  if (elapsedMs < 9000) return 0;
  const phase = elapsedMs % 9000;
  const duration = 1200;
  if (phase >= duration) return 0;
  return Math.sin((phase / duration) * Math.PI);
}

// An original relief surface: recessed sockets, brow ridges, cheekbones, nose and lips.
export function faceDepth(x: number, y: number) {
  const width = faceWidth(y);
  let z =
    0.42 *
    Math.sqrt(Math.max(0, 1 - (x / Math.max(width, 0.001)) ** 2)) *
    Math.sqrt(Math.max(0, 1 - y * y));
  for (const side of [-1, 1]) {
    z -= 0.13 * gaussian(x, y, side * 0.29, -0.19, 0.185, 0.115);
    z += 0.1 * gaussian(x, y, side * 0.29, -0.33, 0.21, 0.055);
    z += 0.09 * gaussian(x, y, side * 0.4, 0.1, 0.16, 0.18);
    z += 0.055 * gaussian(x, y, side * 0.105, 0.22, 0.067, 0.045);
    z -= 0.065 * gaussian(x, y, side * 0.078, 0.25, 0.036, 0.022);
  }
  z += 0.23 * gaussian(x, y, 0, -0.035, 0.087, 0.3);
  z += 0.17 * gaussian(x, y, 0, 0.17, 0.1, 0.09);
  z -= 0.035 * gaussian(x, y, 0, 0.32, 0.036, 0.085);
  const lipLine =
    0.435 + 0.026 * Math.exp(-((x / 0.075) ** 2)) - 0.035 * (x / 0.23) ** 2;
  z += 0.065 * gaussian(x, y, 0, lipLine - 0.026, 0.22, 0.026);
  z -= 0.073 * gaussian(x, y, 0, lipLine + 0.008, 0.225, 0.019);
  z += 0.07 * gaussian(x, y, 0, 0.507, 0.2, 0.041);
  z += 0.065 * gaussian(x, y, 0, 0.72, 0.28, 0.14);
  return z;
}

export interface FacePoint {
  x: number;
  y: number;
  z: number;
  light: number;
  edge: number;
  noise: number;
  lip: number;
  eye: number;
}
export function createFaceGeometry(): FacePoint[][] {
  const rows: FacePoint[][] = [];
  for (let row = 0; row <= 108; row++) {
    const y = -0.985 + (row / 108) * 1.97;
    const width = faceWidth(y);
    const points: FacePoint[] = [];
    for (let col = 0; col <= 78; col++) {
      const u = -0.985 + (col / 78) * 1.97;
      const x = u * width;
      const z = faceDepth(x, y);
      const dx = (faceDepth(x + 0.004, y) - faceDepth(x - 0.004, y)) / 0.008;
      const dy = (faceDepth(x, y + 0.004) - faceDepth(x, y - 0.004)) / 0.008;
      const norm = Math.sqrt(dx * dx + dy * dy + 1);
      const light = Math.max(0, (dx * 0.42 + dy * 0.55 + 0.72) / norm);
      const noise = (Math.sin(row * 127.1 + col * 311.7) * 43758.5453) % 1;
      const eye = Math.max(
        gaussian(x, y, -0.29, -0.19, 0.135, 0.033),
        gaussian(x, y, 0.29, -0.19, 0.135, 0.033),
      );
      points.push({
        x,
        y,
        z,
        light,
        edge: Math.abs(u),
        noise: Math.abs(noise),
        lip: gaussian(x, y, 0, 0.53, 0.26, 0.13),
        eye,
      });
    }
    rows.push(points);
  }
  return rows;
}
