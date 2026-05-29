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
    enterFullscreen().then(() => lockLandscape());
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

  // Fuego VISIBLE = potencial del paisaje (posición) · vida (energía).
  // Con energía baja, el fuego cae a brasas (queda el floor). El clímax
  // sonoro se apaga del todo (sin floor) cuando no hay estímulo.
  const live = CONFIG.energy.floor + (1 - CONFIG.energy.floor) * interaction.energy;
  scene.fireIntensity *= live;
  scene.emberRate *= live;
  scene.climax *= interaction.energy;

  visual.render(scene, dt);
  audio.update(scene);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
