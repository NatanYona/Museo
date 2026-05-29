/* ====================================================================
   main.js — orquestador. Une interacción, escena, render y audio en
   un único bucle de animación.

   Flujo:
     valor (Interaction) ──► sampleScene(valor) ──► VisualEngine.render
                                              └────► AudioEngine.update
   ==================================================================== */

import { CONFIG } from "./config.js";
import { Interaction } from "./interaction.js";
import { sampleScene } from "./scene.js";
import { VisualEngine } from "./visual.js";
import { AudioEngine } from "./audio.js";
import {
  enterFullscreen,
  lockLandscape,
  keepAwake,
  suppressBrowserGestures,
} from "./kiosk.js";

const canvas = document.getElementById("stage");
const gate = document.getElementById("gate");

const visual = new VisualEngine(canvas);
const audio = new AudioEngine();

// Desbloqueo del kiosco repartido entre los dos momentos del gesto:
//  - pointerdown: oculta la compuerta y crea el AudioContext (el autoplay
//    de audio sí se permite al iniciar el toque).
//  - pointerup:   pide fullscreen + bloqueo de orientación. Chrome ignora
//    requestFullscreen si se llama en pointerdown; solo lo acepta al
//    levantar el dedo (pointerup/click).
const interaction = new Interaction(canvas, {
  onFirstTouch: () => {
    gate.classList.add("is-hidden");
    audio.init();
    keepAwake();
  },
  onFirstRelease: () => {
    // El bloqueo de orientación requiere fullscreen ya activo → encadenar.
    // Tras la transición a fullscreen, mobile suele suspender el audio:
    // lo reanudamos al terminar.
    enterFullscreen()
      .then(() => lockLandscape())
      .finally(() => audio.wake());
  },
});

suppressBrowserGestures();

// Red de seguridad: en cada toque, reanudar el audio si quedó suspendido
// (típico en mobile tras fullscreen/rotación) y restaurar el volumen.
canvas.addEventListener("pointerdown", () => audio.wake());

// Pausar el sonido si el kiosco pierde foco; reanudar al volver.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") audio.wake();
  else audio.setMuted(true);
});

// Panel de diagnóstico (CONFIG.debug). Quitar para la versión final.
let hud = null;
if (CONFIG.debug) {
  hud = document.createElement("div");
  hud.style.cssText =
    "position:fixed;top:8px;left:8px;z-index:20;font:12px/1.4 monospace;" +
    "color:#fff;background:rgba(0,0,0,.6);padding:6px 9px;border-radius:6px;" +
    "white-space:pre;pointer-events:none;";
  document.body.appendChild(hud);
}
let hudTick = 0;

// ---- Bucle principal ----
let last = performance.now();
function frame(now) {
  // dt acotado: evita saltos tras un freeze (cambio de pestaña, etc.)
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  const value = interaction.update(dt);
  const scene = sampleScene(value);

  // Fuego VISIBLE = potencial del paisaje (posición) · vida (energía).
  // Con energía baja, el fuego cae a brasas (queda el floor). El clímax
  // sonoro se apaga del todo (sin floor) cuando no hay estímulo.
  const live = CONFIG.energy.floor + (1 - CONFIG.energy.floor) * interaction.energy;
  scene.fireIntensity *= live;
  scene.emberRate *= live;
  scene.climax *= interaction.energy;

  visual.render(scene, dt);
  audio.update(scene);

  if (hud && (hudTick++ & 7) === 0) {
    const d = audio.getDebug();
    hud.textContent =
      `ctx:${d.state}  sample:${d.sample}\n` +
      `master:${d.master ?? "-"}  fireGain:${d.fire ?? "-"}\n` +
      `value:${value.toFixed(2)}  energy:${interaction.energy.toFixed(2)}  pts:${interaction.pointerCount}`;
  }

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
