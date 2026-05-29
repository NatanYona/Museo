/* ====================================================================
   main.js — orquestador. Une interacción, escena, render y audio en
   un único bucle de animación.

   Flujo:
     valor (Interaction) ──► sampleScene(valor) ──► VisualEngine.render
                                              └────► AudioEngine.update
   ==================================================================== */

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

// El primer toque desbloquea audio y modo kiosco, y oculta la compuerta.
const interaction = new Interaction(canvas, {
  onFirstTouch: async () => {
    gate.classList.add("is-hidden");
    await audio.init();
    await enterFullscreen();
    await lockLandscape();
    keepAwake();
  },
});

suppressBrowserGestures();

// Pausar el sonido si el kiosco pierde foco; reanudar al volver.
document.addEventListener("visibilitychange", () => {
  audio.setMuted(document.visibilityState !== "visible");
});

// ---- Bucle principal ----
let last = performance.now();
function frame(now) {
  // dt acotado: evita saltos tras un freeze (cambio de pestaña, etc.)
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  const value = interaction.update(dt);
  const scene = sampleScene(value);
  visual.render(scene, dt);
  audio.update(scene);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
