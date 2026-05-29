/* ====================================================================
   scene.js — convierte el valor continuo (0..1) en el "estado del
   mundo" interpolando los keyframes de config.js.

   Devuelve un objeto con todos los parámetros audiovisuales ya
   mezclados. Tanto el render como el audio leen de acá: una única
   fuente de verdad para que imagen y sonido estén siempre sincronizados.
   ==================================================================== */

import { CONFIG } from "./config.js";
import { clamp, lerp, smoothstep, lerpColor } from "./utils.js";

const KF = CONFIG.keyframes;

// Parámetros escalares (se interpolan como números)
const SCALARS = [
  "fireIntensity",
  "emberRate",
  "textureAmount",
  "light",
  "ambient",
  "climax",
];
// Parámetros de color (se interpolan como RGB)
const COLORS = [
  "skyTop",
  "skyBottom",
  "mountainFar",
  "mountainNear",
  "fireColor",
];

/**
 * Muestrea la escena en la posición `v` (0..1).
 * Encuentra los dos keyframes que rodean a `v` y los mezcla con un
 * easing suave (smoothstep) para transiciones orgánicas.
 */
export function sampleScene(v) {
  const value = clamp(v);

  // Localiza el tramo [a, b] que contiene a `value`.
  let a = KF[0];
  let b = KF[KF.length - 1];
  for (let i = 0; i < KF.length - 1; i++) {
    if (value >= KF[i].at && value <= KF[i + 1].at) {
      a = KF[i];
      b = KF[i + 1];
      break;
    }
  }

  const span = b.at - a.at || 1;
  const t = smoothstep((value - a.at) / span);

  const out = { value };
  for (const k of SCALARS) out[k] = lerp(a[k], b[k], t);
  for (const k of COLORS) out[k] = lerpColor(a[k], b[k], t);
  return out;
}
