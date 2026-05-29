/* ====================================================================
   visual.js — render procedural en Canvas 2D.

   Capas (de atrás hacia adelante):
     1. Cielo (gradiente índigo→ocre según el valor)
     2. Estrellas (presentes en calma, se apagan con la luz)
     3. Resplandor de horizonte / bloom cálido
     4. Montañas andinas (dos siluetas, lejana y cercana)
     5. Fuego: glow + partículas de llama (aditivas)
     6. Brasas/chispas ascendentes
     7. Greca escalonada (textura cerámica) que emerge con textureAmount
     8. Viñeta

   Todo es placeholder procedural: reemplazable luego por imágenes/video
   reales sin tocar la lógica de interacción ni de audio.
   ==================================================================== */

import { CONFIG } from "./config.js";
import { clamp, lerp, rgb, seededRandom } from "./utils.js";

export class VisualEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.flames = [];
    this.embers = [];
    this._emitFlame = 0;
    this._emitEmber = 0;
    this._t = 0;

    this._flameSprite = this._makeRadialSprite([
      [0.0, "rgba(255,255,245,1)"],
      [0.2, "rgba(255,224,150,0.95)"],
      [0.5, "rgba(244,150,52,0.55)"],
      [1.0, "rgba(180,60,20,0)"],
    ]);
    this._emberSprite = this._makeRadialSprite([
      [0.0, "rgba(255,246,210,1)"],
      [0.5, "rgba(255,170,70,0.7)"],
      [1.0, "rgba(255,120,40,0)"],
    ]);

    this.resize();
    window.addEventListener("resize", () => this.resize());
    window.addEventListener("orientationchange", () => this.resize());
  }

  /** Sprite circular suave pre-renderizado (se dibuja con 'lighter'). */
  _makeRadialSprite(stops, size = 128) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    );
    for (const [o, col] of stops) grad.addColorStop(o, col);
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    return c;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, CONFIG.render.maxDPR);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._buildMountains();
    this._buildStars();
  }

  /** Genera una cresta de montaña reproducible (ruido suavizado). */
  _ridge(seed, baseY, amp, points) {
    const rnd = seededRandom(seed);
    const ctrl = [];
    for (let i = 0; i <= points; i++) ctrl.push(rnd());
    const path = [];
    const cols = 64;
    for (let i = 0; i <= cols; i++) {
      const x = (i / cols) * this.w;
      const fp = (i / cols) * points;
      const i0 = Math.floor(fp);
      const f = fp - i0;
      // Interpolación coseno entre puntos de control → cresta suave
      const a = ctrl[i0];
      const b = ctrl[Math.min(i0 + 1, points)];
      const ft = (1 - Math.cos(f * Math.PI)) / 2;
      const n = a + (b - a) * ft;
      const y = baseY * this.h - n * amp * this.h;
      path.push([x, y]);
    }
    return path;
  }

  _buildMountains() {
    const s = CONFIG.render.mountainSeed;
    // Lejana: más arriba, suave. Cercana: más abajo, recortada.
    this._mtnFar = this._ridge(s, 0.74, 0.22, 7);
    this._mtnNear = this._ridge(s + 11, 0.9, 0.16, 5);
  }

  _buildStars() {
    const rnd = seededRandom(CONFIG.render.mountainSeed + 99);
    const n = Math.round((this.w * this.h) / 12000);
    this._stars = [];
    for (let i = 0; i < n; i++) {
      this._stars.push({
        x: rnd() * this.w,
        y: rnd() * this.h * 0.7, // solo en el cielo
        r: 0.4 + rnd() * 1.1,
        tw: rnd() * Math.PI * 2, // fase de centelleo
      });
    }
  }

  _fillRidge(path, color) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, this.h);
    for (const [x, y] of path) ctx.lineTo(x, y);
    ctx.lineTo(this.w, this.h);
    ctx.closePath();
    ctx.fill();
  }

  /** Greca escalonada andina (frieze cerámico) tileada horizontalmente. */
  _drawGreca(y, unit, alpha, color, lw, drift) {
    if (alpha <= 0.01) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.lineJoin = "miter";
    ctx.lineCap = "square";
    const s = unit; // tamaño del escalón
    ctx.beginPath();
    for (let x = -s * 2 + (drift % (s * 4)); x < this.w + s * 2; x += s * 4) {
      // Meandro escalonado (greca): sube, avanza, baja, avanza
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - s);
      ctx.lineTo(x + s, y - s);
      ctx.lineTo(x + s, y - s * 2);
      ctx.lineTo(x + s * 2, y - s * 2);
      ctx.lineTo(x + s * 2, y);
      ctx.lineTo(x + s * 3, y);
      ctx.lineTo(x + s * 3, y - s);
      ctx.lineTo(x + s * 4, y - s);
    }
    ctx.stroke();
    ctx.restore();
  }

  _spawnFlame(scene) {
    const baseW = this.w * (0.06 + 0.12 * scene.fireIntensity);
    const cx = this.w * 0.5 + (Math.random() - 0.5) * baseW;
    const baseY = this.h * 0.92;
    const speed = this.h * (0.12 + 0.22 * scene.fireIntensity);
    this.flames.push({
      x: cx,
      y: baseY,
      vx: (Math.random() - 0.5) * this.w * 0.02,
      vy: -speed * (0.7 + Math.random() * 0.6),
      life: 0,
      max: 0.7 + Math.random() * 0.8,
      size: this.h * (0.04 + 0.05 * Math.random()) * (0.6 + scene.fireIntensity),
      seed: Math.random() * 6.28,
    });
  }

  _spawnEmber(scene) {
    const baseW = this.w * 0.1;
    this.embers.push({
      x: this.w * 0.5 + (Math.random() - 0.5) * baseW,
      y: this.h * 0.9,
      vx: (Math.random() - 0.5) * this.w * 0.04,
      vy: -this.h * (0.16 + Math.random() * 0.22),
      life: 0,
      max: 1.4 + Math.random() * 1.6,
      size: 1.5 + Math.random() * 2.5,
      seed: Math.random() * 6.28,
    });
  }

  _updateParticles(scene, dt) {
    const r = CONFIG.render;
    // Emisión proporcional a la intensidad/brasas
    this._emitFlame += scene.fireIntensity * 220 * dt;
    while (this._emitFlame >= 1 && this.flames.length < r.maxFlames) {
      this._emitFlame -= 1;
      this._spawnFlame(scene);
    }
    this._emitEmber += scene.emberRate * 40 * dt;
    while (this._emitEmber >= 1 && this.embers.length < r.maxEmbers) {
      this._emitEmber -= 1;
      this._spawnEmber(scene);
    }

    for (const p of this.flames) {
      p.life += dt;
      p.x += (p.vx + Math.sin(this._t * 3 + p.seed) * this.w * 0.01) * dt;
      p.y += p.vy * dt;
      p.vy *= 1 - 0.4 * dt; // desaceleración al subir
    }
    for (const p of this.embers) {
      p.life += dt;
      p.x += (p.vx + Math.sin(this._t * 2 + p.seed) * this.w * 0.02) * dt;
      p.y += p.vy * dt;
      p.vy *= 1 - 0.2 * dt;
    }
    this.flames = this.flames.filter((p) => p.life < p.max);
    this.embers = this.embers.filter((p) => p.life < p.max);
  }

  render(scene, dt) {
    this._t += dt;
    const ctx = this.ctx;
    const { w, h } = this;

    // ---- 1. Cielo ----
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, rgb(scene.skyTop));
    sky.addColorStop(1, rgb(scene.skyBottom));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // ---- 2. Estrellas (se apagan cuando sube la luz) ----
    const starA = clamp(1 - scene.light * 1.6);
    if (starA > 0.02) {
      ctx.fillStyle = "#fff";
      for (const s of this._stars) {
        const tw = 0.6 + 0.4 * Math.sin(this._t * 1.5 + s.tw);
        ctx.globalAlpha = starA * tw * 0.8;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 6.2832);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // ---- 3. Resplandor de horizonte / bloom cálido ----
    // Ligado al fuego VIVO (fireIntensity ya incluye la energía): si el
    // fuego se apaga por falta de estímulo, el resplandor también baja.
    const fg = scene.fireIntensity;
    if (fg > 0.01) {
      const gx = w * 0.5;
      const gy = h * 0.92;
      const gr = h * (0.35 + fg * 0.65);
      const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      glow.addColorStop(0, rgb(scene.fireColor, 0.6 * fg));
      glow.addColorStop(0.5, rgb(scene.fireColor, 0.22 * fg));
      glow.addColorStop(1, rgb(scene.fireColor, 0));
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // ---- 4. Montañas ----
    this._fillRidge(this._mtnFar, rgb(scene.mountainFar));
    this._fillRidge(this._mtnNear, rgb(scene.mountainNear));

    // ---- 5. Fuego (glow base + partículas aditivas) ----
    this._updateParticles(scene, dt);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const p of this.flames) {
      const lifeT = p.life / p.max;
      const a = Math.sin(lifeT * Math.PI) * 0.5; // aparece y se apaga
      const size = p.size * (0.6 + lifeT * 0.9);
      ctx.globalAlpha = clamp(a);
      ctx.drawImage(
        this._flameSprite,
        p.x - size / 2,
        p.y - size / 2,
        size,
        size
      );
    }
    // ---- 6. Brasas ----
    for (const p of this.embers) {
      const lifeT = p.life / p.max;
      const a = Math.sin(lifeT * Math.PI) * (0.7 + 0.3 * Math.sin(this._t * 12 + p.seed));
      const size = p.size * 4;
      ctx.globalAlpha = clamp(a);
      ctx.drawImage(
        this._emberSprite,
        p.x - size / 2,
        p.y - size / 2,
        size,
        size
      );
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    // ---- 7. Greca cerámica (dos frisos con leve parallax/shimmer) ----
    const terracota = "#c2622f";
    const shimmer = 0.85 + 0.15 * Math.sin(this._t * 1.2);
    const unit = Math.max(10, h * 0.022);
    this._drawGreca(
      h * 0.8,
      unit,
      scene.textureAmount * 0.5 * shimmer,
      terracota,
      Math.max(1.5, unit * 0.14),
      this._t * 8
    );
    this._drawGreca(
      h * 0.965,
      unit * 1.4,
      scene.textureAmount * 0.7 * shimmer,
      "#a84e26",
      Math.max(2, unit * 0.18),
      -this._t * 5
    );

    // ---- 8. Viñeta ----
    const vig = ctx.createRadialGradient(
      w / 2,
      h * 0.55,
      h * 0.3,
      w / 2,
      h * 0.5,
      h * 0.85
    );
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, `rgba(0,0,0,${0.45 - scene.light * 0.15})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }
}
