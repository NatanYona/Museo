/* ====================================================================
   audio.js — paisaje sonoro por capas (Web Audio API).

   Todo es SÍNTESIS (no requiere archivos): cada capa es un instrumento
   simple cuya ganancia se liga a un parámetro de la escena. Así el
   sonido sigue al valor en tiempo real y queda sincronizado con la
   imagen.

   Capas:
     wind    — ruido filtrado (viento del altiplano)  ← ambient
     drone   — pedal grave índigo                      ← ambient
     texture — brillo metálico/cerámico                ← textureAmount
     fire    — crepitar (banda alta) + rumor grave     ← fireIntensity
     climax  — sub envolvente con paneo lento          ← climax

   Para reemplazar por audio real: cargar buffers en cada capa en lugar
   de los osciladores/ruido, manteniendo el mismo nodo de ganancia.
   El AudioContext se crea en el primer gesto (políticas de autoplay).
   ==================================================================== */

import { CONFIG } from "./config.js";

export class AudioEngine {
  constructor() {
    this.ready = false;
    this.ctx = null;
    this.layers = {};
    this.sampleStatus = "none"; // none | loading | loaded | failed
  }

  /** Reanuda el contexto si quedó suspendido (común tras fullscreen en
   *  mobile) y restaura el volumen maestro. Llamar en cada toque. */
  wake() {
    if (!this.ready) return;
    if (this.ctx.state !== "running") this.ctx.resume().catch(() => {});
    this.master.gain.setTargetAtTime(
      CONFIG.audio.masterVolume,
      this.ctx.currentTime,
      0.1
    );
  }

  /** Estado para el panel de debug. */
  getDebug() {
    if (!this.ready) return { state: "no-init", sample: this.sampleStatus };
    return {
      state: this.ctx.state,
      sample: this.sampleStatus,
      master: +this.master.gain.value.toFixed(2),
      fire: +this.layers.fire.gain.value.toFixed(2),
    };
  }

  init() {
    if (this.ready) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return; // navegador sin Web Audio: la pieza sigue funcionando muda
    this.ctx = new AC();

    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = CONFIG.audio.masterVolume;
    this.master.connect(ctx.destination);

    // El grafo se construye con el contexto aún suspendido: crear nodos y
    // arrancar fuentes NO requiere que esté "running"; sonarán al reanudar.
    // (Clave en mobile: antes esperábamos resume() y se colgaba, dejando
    // la inicialización a medias.)
    this._buildWind();
    this._buildDrone();
    this._buildTexture();
    this._buildFire();
    this._buildClimax();

    this.ready = true;

    // Reanudar (sin await) y reintentar en cada toque vía wake().
    this.ctx.resume().catch(() => {});

    // Cargar el fuego real en segundo plano (no bloquea el arranque).
    this._loadFireSample();
  }

  // --- helpers --------------------------------------------------------
  _noiseBuffer(seconds = 2) {
    const ctx = this.ctx;
    const len = ctx.sampleRate * seconds;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  _noiseSource() {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer();
    src.loop = true;
    return src;
  }

  _gain(v = 0) {
    const g = this.ctx.createGain();
    g.gain.value = v;
    return g;
  }

  _osc(type, freq) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    return o;
  }

  /** LFO que modula un AudioParam alrededor de su valor base. */
  _lfo(param, freq, depth, base) {
    const o = this._osc("sine", freq);
    const g = this._gain(depth);
    param.value = base;
    o.connect(g).connect(param);
    o.start();
  }

  // --- capas ----------------------------------------------------------
  _buildWind() {
    const ctx = this.ctx;
    const src = this._noiseSource();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 0.6;
    const g = this._gain(0);
    src.connect(lp).connect(g).connect(this.master);
    this._lfo(lp.frequency, 0.07, 240, 480); // respiración del viento
    src.start();
    this.layers.wind = g;
  }

  _buildDrone() {
    const ctx = this.ctx;
    const mix = this._gain(0);
    [55, 55.3, 82.5].forEach((f, i) => {
      const o = this._osc(i === 2 ? "triangle" : "sine", f);
      const og = this._gain(i === 2 ? 0.35 : 0.6);
      o.connect(og).connect(mix);
      o.start();
    });
    mix.connect(this.master);
    this.layers.drone = mix;
  }

  _buildTexture() {
    const ctx = this.ctx;
    const mix = this._gain(0); // ganancia de la capa (la controla update())
    // Brillo cerámico: tríada cálida una octava más grave que antes,
    // suave y SIN trémolo pulsante (eso era lo que sonaba a alarma).
    // Solo un vibrato muy leve para que respire. Lowpass para redondear.
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1100;
    lp.Q.value = 0.5;
    lp.connect(mix).connect(this.master);
    [330, 495, 660].forEach((f) => {
      const o = this._osc("sine", f);
      const og = this._gain(0.12);
      this._lfo(o.detune, 0.15 + Math.random() * 0.2, 4, 0); // vibrato sutil
      o.connect(og).connect(lp);
      o.start();
    });
    this.layers.texture = mix;
  }

  _buildFire() {
    // Bus del fuego → master. La ganancia (= vida del fuego) la fija
    // update(). El sonido entra desde el archivo real (ver _loadFireSample);
    // ya no hay crepitar sintetizado.
    const g = this._gain(0);
    g.connect(this.master);
    this.layers.fire = g;
  }

  /** Carga el archivo de fuego real y lo pone en loop, conectándolo al
   *  bus de fuego. Su volumen lo controla update() (= vida del fuego).
   *  Si falla (no existe / formato no soportado), el fuego queda mudo. */
  async _loadFireSample() {
    const url = CONFIG.audio.fireSample;
    if (!url) return;
    this.sampleStatus = "loading";
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true; // bucle continuo
      src.connect(this.layers.fire);
      src.start();
      this.sampleStatus = "loaded";
    } catch (_) {
      this.sampleStatus = "failed";
    }
  }

  _buildClimax() {
    const ctx = this.ctx;
    const g = this._gain(0);
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const sub = this._osc("sine", 44);
    const fifth = this._osc("sine", 66);
    const subg = this._gain(0.7);
    const fifg = this._gain(0.4);
    sub.connect(subg).connect(g);
    fifth.connect(fifg).connect(g);
    // Pad cálido y ancho
    const pad = this._osc("sawtooth", 132);
    const padlp = ctx.createBiquadFilter();
    padlp.type = "lowpass";
    padlp.frequency.value = 600;
    const padg = this._gain(0.12);
    pad.connect(padlp).connect(padg).connect(g);
    sub.start();
    fifth.start();
    pad.start();
    if (pan) {
      g.connect(pan).connect(this.master);
      this._lfo(pan.pan, 0.08, 0.8, 0); // paneo lento → envolvente
    } else {
      g.connect(this.master);
    }
    this.layers.climax = g;
  }

  /** Llamado cada frame: ajusta ganancias según la escena. */
  update(scene) {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    const L = CONFIG.audio.layers;
    for (const [name, node] of Object.entries(this.layers)) {
      const cfg = L[name];
      const target = cfg.master * scene[cfg.from];
      node.gain.setTargetAtTime(target, now, 0.08);
    }
  }

  /** Silenciar/recuperar (p. ej. al perder foco la pestaña del kiosco). */
  setMuted(muted) {
    if (!this.ready) return;
    this.master.gain.setTargetAtTime(
      muted ? 0 : CONFIG.audio.masterVolume,
      this.ctx.currentTime,
      0.2
    );
  }
}
