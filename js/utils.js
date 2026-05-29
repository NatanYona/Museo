/* ====================================================================
   utils.js — funciones matemáticas/interpolación reutilizables.
   ==================================================================== */

export const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));

/** Interpolación lineal entre a y b. */
export const lerp = (a, b, t) => a + (b - a) * t;

/** Suavizado tipo Hermite: bordes más orgánicos que el lineal puro. */
export const smoothstep = (t) => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};

/** Interpolación independiente del framerate (suavizado exponencial).
 *  rate = velocidad de aproximación; dt en segundos. */
export const damp = (current, target, rate, dt) =>
  lerp(current, target, 1 - Math.exp(-rate * dt));

/** Mapea v de [inMin,inMax] a [outMin,outMax] sin clamping. */
export const mapRange = (v, inMin, inMax, outMin, outMax) =>
  outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin);

/** Curva en campana (gaussiana) centrada en "center" con ancho "width".
 *  Útil para capas que aparecen y desaparecen alrededor de una zona. */
export const bell = (v, center, width) => {
  const d = (v - center) / width;
  return Math.exp(-(d * d));
};

/** Interpola dos colores RGB ([r,g,b], 0–255). */
export const lerpColor = (c1, c2, t) => [
  Math.round(lerp(c1[0], c2[0], t)),
  Math.round(lerp(c1[1], c2[1], t)),
  Math.round(lerp(c1[2], c2[2], t)),
];

export const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

/** PRNG determinista (mulberry32) para siluetas/figuras reproducibles. */
export const seededRandom = (seed) => {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
