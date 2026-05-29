/* ====================================================================
   interaction.js — el "slider invisible".

   Convierte el gesto del dedo en el valor continuo 0..1 y lo suaviza.
   - Mapeo RELATIVO/acumulativo: el valor cambia según CUÁNTO se arrastra,
     no según dónde se toca. No hay posiciones "correctas".
   - Suavizado (lerp exponencial) para respuesta fluida sin saltos.
   - Modo ATRACCIÓN: si nadie toca por unos segundos, el valor oscila
     lentamente solo para invitar; el primer contacto retoma el control
     sin salto perceptible.

   Usa Pointer Events: cubre touch (tablet) y mouse (desarrollo) con un
   solo camino de código.
   ==================================================================== */

import { CONFIG } from "./config.js";
import { clamp, damp, lerp } from "./utils.js";

export class Interaction {
  constructor(target, { onFirstTouch, onFirstRelease } = {}) {
    this.el = target; // elemento que captura el gesto (el canvas)
    this.onFirstTouch = onFirstTouch; // se dispara en el primer pointerdown
    this.onFirstRelease = onFirstRelease; // se dispara en el primer pointerup

    this.value = 0; // valor mostrado (suavizado) 0..1
    this.target = 0; // valor objetivo al que tiende
    this.firstTouchDone = false;
    this.firstReleaseDone = false;

    this._down = false;
    this._lastX = 0;
    this._activePointer = null;
    this._lastInputTime = performance.now() / 1000;

    // Estado del modo atracción
    this._attract = false;
    this._phase = 0;

    this._bind();
  }

  _bind() {
    const opts = { passive: false };
    this.el.addEventListener("pointerdown", this._onDown, opts);
    this.el.addEventListener("pointermove", this._onMove, opts);
    this.el.addEventListener("pointerup", this._onUp, opts);
    this.el.addEventListener("pointercancel", this._onUp, opts);
    this.el.addEventListener("pointerleave", this._onUp, opts);
    // Cinturón y tiradores: bloquear menú contextual y gestos de página
    this.el.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  _now() {
    return performance.now() / 1000;
  }

  _onDown = (e) => {
    e.preventDefault();
    if (!this.firstTouchDone) {
      this.firstTouchDone = true;
      this.onFirstTouch?.();
    }
    this._down = true;
    this._activePointer = e.pointerId;
    this._lastX = e.clientX;
    this._lastInputTime = this._now();
    this._attract = false; // el toque siempre toma el control
    this.target = this.value; // handoff sin salto: parte de donde está
    this.el.setPointerCapture?.(e.pointerId);
  };

  _onMove = (e) => {
    if (!this._down || e.pointerId !== this._activePointer) return;
    e.preventDefault();
    const dx = e.clientX - this._lastX;
    this._lastX = e.clientX;
    // Mapeo relativo: fracción del ancho de pantalla * sensibilidad
    const dv = (dx / window.innerWidth) * CONFIG.interaction.sensitivity;
    this.target = clamp(this.target + dv);
    this._lastInputTime = this._now();
  };

  _onUp = (e) => {
    if (e.pointerId !== this._activePointer && this._activePointer !== null)
      return;
    this._down = false;
    this._activePointer = null;
    this._lastInputTime = this._now();
    // Fullscreen necesita activarse en un pointerup/click (no en pointerdown):
    // Chrome ignora requestFullscreen pedido al iniciar el toque.
    if (e.type === "pointerup" && !this.firstReleaseDone) {
      this.firstReleaseDone = true;
      this.onFirstRelease?.();
    }
  };

  /** Avanza un frame. dt en segundos. Devuelve el valor suavizado. */
  update(dt) {
    const cfg = CONFIG.attract;
    const idleFor = this._now() - this._lastInputTime;

    if (!this._down && idleFor > cfg.idleDelay) {
      // ---- Modo atracción: vaivén lento tipo respiración ----
      const mid = (cfg.min + cfg.max) / 2;
      const amp = (cfg.max - cfg.min) / 2;
      if (!this._attract) {
        // Engancha sin salto: arranca la fase en el valor actual
        this._attract = true;
        const s = clamp((this.value - mid) / amp, -1, 1);
        this._phase = Math.asin(s);
      }
      this._phase += (dt * 2 * Math.PI) / cfg.period;
      this.target = mid + amp * Math.sin(this._phase);
    }

    // Suavizado independiente del framerate hacia el objetivo
    this.value = damp(this.value, this.target, CONFIG.interaction.smoothing, dt);
    return this.value;
  }
}
