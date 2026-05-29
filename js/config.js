/* ====================================================================
   config.js — TODA la dirección de arte/sonido vive acá.
   El motor es genérico: lee este archivo. Para cambiar la pieza
   (o reemplazar placeholders por assets reales) se edita esto, no el
   código del motor.

   Modelo: el valor continuo 0..1 (la posición del "slider invisible")
   recorre una línea de tiempo de KEYFRAMES sensoriales. El motor
   interpola (lerp + smoothstep) entre el keyframe anterior y el
   siguiente. No hay estados discretos: las "zonas" son solo regiones
   blandas dentro del continuo.

   Paleta: tierras del noroeste argentino — ocres, terracota, siena
   quemada, noche andina índigo, oro del fuego.
   ==================================================================== */

export const CONFIG = {
  /* ---- Interacción ------------------------------------------------ */
  interaction: {
    // Mapeo RELATIVO/acumulativo: cuánto cambia el valor por un arrastre
    // equivalente al ancho completo de la pantalla. 1.0 ≈ un swipe full
    // recorre todo el rango. <1 = gesto más "largo"/fino.
    sensitivity: 1.15,
    // Velocidad de aproximación del valor mostrado al valor objetivo.
    // Más alto = respuesta más inmediata; más bajo = más untuoso.
    // (independiente del framerate)
    smoothing: 9,
  },

  /* ---- Energía del fuego (estímulo) ------------------------------
     La energía (0..1) es la "vida" del fuego: NO la fija la posición,
     sino la actividad del visitante. Se alimenta con el movimiento de
     un dedo y con el pellizco de dos dedos; decae sola con el tiempo.
     El fuego visible = potencial(posición) · energía → en la quietud,
     se apaga a brasas (queda el `floor`).
     ---------------------------------------------------------------- */
  energy: {
    decay: 0.2, // ritmo de apagado por falta de estímulo (1/s) → más bajo = el fuego dura más
    moveGain: 3.2, // cuánto aviva el arrastre de un dedo
    pinchGain: 2.6, // cuánto aviva/sofoca el pellizco (separar/juntar)
    floor: 0.06, // brasa mínima que queda aunque no haya estímulo
  },

  /* ---- Modo atracción (reposo) ----------------------------------- */
  attract: {
    idleDelay: 6, // s sin tocar antes de activar el vaivén
    handoffDelay: 0.4, // s de gracia tras soltar antes de re-activar
    period: 26, // s que tarda un ciclo completo del vaivén
    min: 0.08, // valor mínimo del vaivén
    max: 0.82, // valor máximo del vaivén (no llega al clímax: invita)
  },

  /* ---- Línea de tiempo sensorial (keyframes) ---------------------
     Cada keyframe define el "estado del mundo" en una posición `at`
     del valor 0..1. Parámetros:
       skyTop/skyBottom : gradiente del cielo (RGB 0–255)
       mountainFar/Near : color de las siluetas andinas
       fireColor        : tinte base del fuego/brasa
       fireIntensity    : 0..1 presencia/altura del fuego
       emberRate        : 0..1 cantidad de chispas que ascienden
       textureAmount    : 0..1 presencia de la greca/cerámica
       light            : 0..1 resplandor/bloom general de la escena
       ambient          : 0..1 ganancia de la capa sonora de viento/calma
       climax           : 0..1 ganancia de la capa sonora envolvente
     ---------------------------------------------------------------- */
  keyframes: [
    {
      // 0% — Paisaje andino LATENTE: noche índigo, frío, en silencio.
      at: 0.0,
      skyTop: [16, 18, 34],
      skyBottom: [38, 34, 52],
      mountainFar: [30, 30, 48],
      mountainNear: [16, 16, 26],
      fireColor: [120, 70, 40],
      fireIntensity: 0.0,
      emberRate: 0.0,
      textureAmount: 0.04,
      light: 0.08,
      ambient: 0.85,
      climax: 0.0,
    },
    {
      // ~20% — Sigue calmo, primer tibio en el horizonte.
      at: 0.2,
      skyTop: [26, 24, 40],
      skyBottom: [78, 54, 56],
      mountainFar: [54, 42, 52],
      mountainNear: [24, 20, 28],
      fireColor: [170, 96, 50],
      fireIntensity: 0.04,
      emberRate: 0.05,
      textureAmount: 0.18,
      light: 0.16,
      ambient: 0.78,
      climax: 0.0,
    },
    {
      // ~38% — TRANSICIÓN: emergen texturas de cerámica, brasa incipiente.
      at: 0.38,
      skyTop: [44, 32, 46],
      skyBottom: [150, 86, 58],
      mountainFar: [92, 60, 56],
      mountainNear: [40, 28, 30],
      fireColor: [206, 120, 52],
      fireIntensity: 0.22,
      emberRate: 0.3,
      textureAmount: 0.7,
      light: 0.38,
      ambient: 0.55,
      climax: 0.08,
    },
    {
      // ~58% — INTENSIFICACIÓN: el fuego crece, el sonido se llena.
      at: 0.58,
      skyTop: [62, 34, 40],
      skyBottom: [206, 110, 50],
      mountainFar: [128, 72, 52],
      mountainNear: [52, 30, 28],
      fireColor: [232, 146, 56],
      fireIntensity: 0.58,
      emberRate: 0.62,
      textureAmount: 0.92,
      light: 0.66,
      ambient: 0.32,
      climax: 0.4,
    },
    {
      // ~76% — CLÍMAX sensorial: máxima presencia de fuego, luz y sonido.
      at: 0.76,
      skyTop: [92, 38, 34],
      skyBottom: [248, 158, 70],
      mountainFar: [168, 92, 56],
      mountainNear: [70, 34, 28],
      fireColor: [255, 184, 92],
      fireIntensity: 1.0,
      emberRate: 1.0,
      textureAmount: 1.0,
      light: 1.0,
      ambient: 0.16,
      climax: 1.0,
    },
    {
      // ~90% — RELAJACIÓN: el fuego cede, vuelve la calma.
      at: 0.9,
      skyTop: [50, 34, 48],
      skyBottom: [150, 92, 74],
      mountainFar: [96, 66, 64],
      mountainNear: [40, 28, 32],
      fireColor: [210, 132, 70],
      fireIntensity: 0.34,
      emberRate: 0.4,
      textureAmount: 0.66,
      light: 0.46,
      ambient: 0.5,
      climax: 0.4,
    },
    {
      // 100% — RETORNO: noche tibia, continuidad/ciclo. Casi como el inicio
      // pero con memoria del fuego (índigo apenas templado).
      at: 1.0,
      skyTop: [20, 20, 38],
      skyBottom: [62, 46, 58],
      mountainFar: [44, 38, 52],
      mountainNear: [20, 18, 28],
      fireColor: [150, 88, 52],
      fireIntensity: 0.08,
      emberRate: 0.1,
      textureAmount: 0.28,
      light: 0.16,
      ambient: 0.8,
      climax: 0.06,
    },
  ],

  /* ---- Audio (síntesis por capas, reemplazable por buffers reales)
     Cada capa toma su ganancia de un parámetro de la escena o de una
     curva. master = tope de volumen de esa capa.
     ---------------------------------------------------------------- */
  audio: {
    masterVolume: 0.9,
    // Archivo de fuego real (loop). Si carga, reemplaza al crepitar
    // sintetizado; su volumen sigue la vida del fuego (capa "fire").
    // Dejar en null o que el archivo no exista → usa el sintetizado.
    fireSample: "assets/audio/fuego.mp3",
    layers: {
      wind: { master: 0.5, from: "ambient" }, // viento/altiplano
      drone: { master: 0.32, from: "ambient" }, // pedal grave de base
      texture: { master: 0.3, from: "textureAmount" }, // brillo cerámico
      fire: { master: 0.6, from: "fireIntensity" }, // fuego (real o sintetizado)
      climax: { master: 0.5, from: "climax" }, // sub envolvente
    },
  },

  /* ---- Render ----------------------------------------------------- */
  render: {
    maxDPR: 2, // tope de devicePixelRatio (perf en tablets)
    mountainSeed: 73, // semilla de las siluetas (reproducible)
    maxFlames: 240, // tope de partículas de llama
    maxEmbers: 120, // tope de chispas
  },
};
