# PequeMuseo — Pieza interactiva sensorial

Experiencia audiovisual inmersiva vinculada a la **memoria, el territorio y la
identidad de los pueblos originarios del noroeste argentino**.

Toda la pantalla es un **slider invisible**: al deslizar el dedo en horizontal,
el visitante modula un valor continuo (0–100 %) que transforma progresivamente
el paisaje y el sonido. No hay botones, barras ni instrucciones.

> Paisaje andino latente → emergen texturas de cerámica → el fuego se
> intensifica → **clímax** sensorial → retorno a la calma (ciclo).

**En línea:** https://natanyona.github.io/Museo/ (GitHub Pages, HTTPS).

## Cómo se siente el gesto

- **1 dedo (arrastre horizontal)**: recorre el paisaje. Mapeo **relativo /
  acumulativo** — el valor cambia según _cuánto_ se arrastra, no según _dónde_
  se toca. No existen "posiciones correctas". Además, el movimiento **aviva el
  fuego** (lo alimenta de energía).
- **2 dedos (pellizco)**: separar = **avivar** el fuego, juntar = **sofocarlo**.
  Actúa solo sobre la intensidad, sin mover la posición.
- **Energía / estímulo**: el fuego está vivo según la actividad del visitante y
  **se apaga a brasas por falta de estímulo**. La posición define cuánto fuego
  es _posible_ en ese paisaje (el "combustible"); la energía, cuánto está vivo.
- **Interpolación suave** (lerp exponencial + smoothstep) → respuesta en tiempo
  real sin saltos.
- **Modo atracción**: tras unos segundos sin uso, la escena respira sola para
  invitar; el primer contacto retoma el control sin salto.
- **Audio en capas** (Web Audio API) que sigue al estado en tiempo real:
  - **viento** de altiplano y **pedal grave** ligados a la calma del paisaje;
  - **fuego**: archivo real (`assets/audio/fuego.mp3`) en **bucle**, con volumen
    ligado a la vida del fuego;
  - **cerámica**: secuencia **generativa y melódica** (notas de campana en
    escala pentatónica La menor) que va **de la mano del fuego** — más fuego =
    notas menos espaciadas y en **registro más agudo** (sube hacia el clímax);
    sin fuego, no suena;
  - **sub envolvente** en el clímax (paneo lento).

## Ejecutar (entorno local / kiosco)

Al usar módulos ES, hay que servir por HTTP (no abrir el `index.html` con
`file://`). Cualquiera de estas opciones:

```powershell
# Python
python -m http.server 8080

# o Node
npx serve -l 8080
```

Luego abrir `http://localhost:8080` y **tocar la pantalla una vez** (ese gesto
desbloquea el audio, entra a pantalla completa y bloquea la orientación, según
lo permita el navegador).

### Notas de kiosco

- Pensado para **tablet horizontal** a pantalla completa.
- Activa Screen Wake Lock para que la pantalla no se apague.
- Silencia el audio si la pestaña pierde foco y lo reanuda al volver.
- En iOS, el bloqueo de orientación y el fullscreen programático están
  limitados por el sistema; conviene fijar la orientación desde el SO o usar la
  app en modo "pantalla completa" / acceso guiado.

### Detalles de plataforma (mobile)

- **Audio**: el `AudioContext` se crea en el **primer toque** (políticas de
  autoplay) y se **reanuda en cada toque** por si la transición a fullscreen lo
  suspende (común en Android).
- **Fullscreen**: se solicita al **levantar el dedo** (`pointerup`); Chrome lo
  ignora si se pide en `pointerdown`. En iOS no existe la API para páginas web:
  usar "Agregar a pantalla de inicio".
- **Sonido en iPhone**: Web Audio respeta el **interruptor de silencio** físico.

## Despliegue (GitHub Pages)

Publicado en **https://natanyona.github.io/Museo/** desde la rama `main` (raíz).
Incluye `.nojekyll` para servir los archivos tal cual. Para publicar cambios:

```bash
git add -A && git commit -m "..." && git push
```

Pages reconstruye solo en ~1 min. Es un sitio 100 % estático: cualquier host
estático con HTTPS sirve igual.

## Estructura

```
index.html          # superficie de interacción + compuerta de arranque
css/styles.css       # reset, anti-zoom/scroll, latido de invitación
js/
  config.js          # ★ dirección de arte y sonido (keyframes, audio, params)
  scene.js           # interpola los keyframes → "estado del mundo" según el valor
  interaction.js     # el slider invisible: gesto relativo + suavizado + atracción
  visual.js          # render procedural en Canvas (cielo, montañas, fuego, greca)
  audio.js           # síntesis por capas (Web Audio API)
  kiosk.js           # fullscreen, orientación, wake lock, anti-gestos
  utils.js           # lerp, clamp, smoothstep, color, PRNG
  main.js            # bucle principal (combina posición × energía) que une todo
assets/
  audio/fuego.mp3    # sonido de fuego real (loop)
  img/               # (vacío) destino de imágenes reales
```

## Ajustar la pieza (sin tocar el motor)

Casi todo se controla desde **`js/config.js`**:

- **`keyframes`**: la línea de tiempo sensorial. Cada keyframe define, en una
  posición del valor (`at` 0–1), el color del cielo y montañas, el color e
  intensidad del fuego, las chispas, la textura cerámica, la luz y las
  ganancias de audio (`ambient`, `climax`). El motor interpola entre keyframes,
  así que las "zonas" son regiones blandas, no estados rígidos. Agregar o quitar
  keyframes redibuja toda la curva.
- **`interaction.sensitivity` / `smoothing`**: largo del gesto y untuosidad de
  la respuesta.
- **`energy`**: la "vida del fuego" por estímulo. `decay` (más bajo = el fuego
  dura más), `moveGain` (cuánto aviva el arrastre), `pinchGain` (cuánto el
  pellizco), `floor` (brasa mínima que nunca se apaga del todo).
- **`attract`**: tiempo de espera y amplitud del vaivén de reposo.
- **`audio.layers`**: a qué parámetro de la escena se liga cada capa y su tope
  de volumen. **`audio.fireSample`**: ruta del archivo de fuego (poner `null`
  para no usarlo).
- **`debug`**: `true` muestra un panel en pantalla (estado del audio, energía,
  valor) útil para diagnosticar en mobile.

## Reemplazar placeholders por material real

Los gráficos actuales son **procedurales** (placeholders). Para integrar
material definitivo:

- **Imágenes / video**: reemplazar el dibujo procedural de `visual.js` por
  capas `<img>`/`<video>` o `drawImage` de assets cargados, usando
  `scene.value` para el crossfade entre capas y los parámetros de escena
  (`fireIntensity`, `textureAmount`, `light`) para opacidades/filtros. La
  interfaz `sampleScene(valor)` no cambia.
- **Audio**: el fuego ya usa un archivo real (`audio.fireSample`). Para las
  demás capas, cambiar los osciladores/ruido por `AudioBufferSourceNode` con
  archivos de `assets/audio`, conservando el `GainNode` de la capa y la lógica
  de `update(scene)`.
