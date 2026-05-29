/* ====================================================================
   interaction.js — el "slider invisible" + multi-touch + energía.

   GESTOS
   ------
   - 1 dedo  → arrastre horizontal RELATIVO/acumulativo: controla la
     posición (el paisaje). Además, su movimiento ALIMENTA la energía.
   - 2 dedos (pellizco) → separar = avivar el fuego, juntar = sofocarlo.
     No mueve la posición: actúa solo sobre la energía/intensidad.

   ENERGÍA (estímulo)
   ------------------
   `energy` (0..1) es la vida del fuego. Sube con el movimiento/pellizco
   y decae sola por falta de estímulo. El motor (main.js) la combina con
   el "potencial" de la posición para obtener el fuego visible.

   SUAVIZADO y ATRACCIÓN igual que antes: respuesta fluida sin saltos y
   vaivén lento de invitación cuando nadie toca.

   Usa Pointer Events (touch + mouse con un solo camino de código).
   ==================================================================== */

import { CONFIG } from "./config.js";
import { clamp, damp } from "./utils.js";

export class Interaction {
  constructor(target, { onFirstTouch, onFirstRelease } = {}) {
    this.el = target;
    this.onFirstTouch = onFirstTouch; // primer pointerdown (audio)
    this.onFirstRelease = onFirstRelease; // primer pointerup (fullscreen)

    this.value = 0; // posición mostrada (suavizada) 0..1
    this.target = 0; // posición objetivo
    this.energy = 0; // vida del fuego 0..1

    this.firstTouchDone = false;
    this.firstReleaseDone = false;

    this._pointers = new Map(); // id -> {x, y}  (dedos activos)
    this._pinchDist = null; // distancia previa entre dos dedos
    this._lastInputTime = this._now();

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
    this.el.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  _now() {
    return performance.now() / 1000;
  }

  /** Cantidad de dedos activos (para debug). */
  get pointerCount() {
    return this._pointers.size;
  }

  /** Distancia entre los dos primeros dedos activos (para el pellizco). */
  _pinchDistance() {
    const it = this._pointers.values();
    const a = it.next().value;
    const b = it.next().value;
    if (!a || !b) return null;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  _onDown = (e) => {
    e.preventDefault();
    if (!this.firstTouchDone) {
      this.firstTouchDone = true;
      this.onFirstTouch?.();
    }
    this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this._lastInputTime = this._now();
    this._attract = false; // el toque siempre toma el control

    if (this._pointers.size === 1) {
      this.target = this.value; // handoff sin salto
    } else if (this._pointers.size === 2) {
      this._pinchDist = this._pinchDistance(); // arranca el pellizco
    }
    this.el.setPointerCapture?.(e.pointerId);
  };

  _onMove = (e) => {
    const p = this._pointers.get(e.pointerId);
    if (!p) return;
    e.preventDefault();
    const prevX = p.x;
    p.x = e.clientX;
    p.y = e.clientY;
    this._lastInputTime = this._now();

    const w = window.innerWidth;
    const cfg = CONFIG;

    if (this._pointers.size === 1) {
      // --- 1 dedo: posición (relativa) + estímulo por movimiento ---
      const dx = e.clientX - prevX;
      this.target = clamp(this.target + (dx / w) * cfg.interaction.sensitivity);
      this.energy = clamp(this.energy + (Math.abs(dx) / w) * cfg.energy.moveGain);
    } else {
      // --- 2+ dedos: pellizco → aviva/sofoca, no mueve la posición ---
      const dist = this._pinchDistance();
      if (dist != null && this._pinchDist != null) {
        const dd = dist - this._pinchDist; // >0 separando, <0 juntando
        this.energy = clamp(this.energy + (dd / w) * cfg.energy.pinchGain);
      }
      this._pinchDist = dist;
    }
  };

  _onUp = (e) => {
    if (!this._pointers.has(e.pointerId)) return;
    this._pointers.delete(e.pointerId);
    this._lastInputTime = this._now();

    if (this._pointers.size < 2) this._pinchDist = null;
    if (this._pointers.size === 1) {
      // Vuelve al control de posición sin salto (el dedo restante sigue).
      this.target = this.value;
    }

    if (e.type === "pointerup" && !this.firstReleaseDone) {
      this.firstReleaseDone = true;
      this.onFirstRelease?.(); // fullscreen necesita pointerup (no pointerdown)
    }
  };

  /** Avanza un frame. dt en segundos. */
  update(dt) {
    const acfg = CONFIG.attract;
    const idle = this._pointers.size === 0;
    const idleFor = this._now() - this._lastInputTime;

    if (idle && idleFor > acfg.idleDelay) {
      // ---- Modo atracción: vaivén lento de la posición ----
      const mid = (acfg.min + acfg.max) / 2;
      const amp = (acfg.max - acfg.min) / 2;
      if (!this._attract) {
        this._attract = true;
        this._phase = Math.asin(clamp((this.value - mid) / amp, -1, 1));
      }
      this._phase += (dt * 2 * Math.PI) / acfg.period;
      this.target = mid + amp * Math.sin(this._phase);
    }

    // Decaimiento de la energía por falta de estímulo (exponencial)
    this.energy *= Math.exp(-CONFIG.energy.decay * dt);

    // Suavizado de la posición hacia el objetivo
    this.value = damp(this.value, this.target, CONFIG.interaction.smoothing, dt);
    return this.value;
  }
}
