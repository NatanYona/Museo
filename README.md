# PequeMuseo — Pieza interactiva sensorial

Experiencia audiovisual inmersiva vinculada a la **memoria, el territorio y la
identidad de los pueblos originarios del noroeste argentino**.

Toda la pantalla es un **slider invisible**: al deslizar el dedo en horizontal,
el visitante modula un valor continuo (0–100 %) que transforma progresivamente
el paisaje y el sonido. No hay botones, barras ni instrucciones.

> Paisaje andino latente → emergen texturas de cerámica → el fuego se
> intensifica → **clímax** sensorial → retorno a la calma (ciclo).

## Cómo se siente el gesto

- **Mapeo relativo / acumulativo**: el valor cambia según _cuánto_ se arrastra,
  no según _dónde_ se toca. No existen "posiciones correctas".
- **Interpolación suave** (lerp exponencial + smoothstep) → respuesta en tiempo
  real sin saltos.
- **Modo atracción**: tras unos segundos sin uso, la escena respira sola para
  invitar; el primer contacto retoma el control sin salto.
- **Audio en capas** (Web Audio API) cuyo volumen sigue al mismo valor:
  viento de altiplano, pedal grave, brillo cerámico, crepitar del fuego y un
  sub envolvente en el clímax.

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
  main.js            # bucle principal que une todo
assets/img|audio     # (vacío) destino del material real
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
- **`attract`**: tiempo de espera y amplitud del vaivén de reposo.
- **`audio.layers`**: a qué parámetro de la escena se liga cada capa y su tope
  de volumen.

## Reemplazar placeholders por material real

Los gráficos actuales son **procedurales** (placeholders). Para integrar
material definitivo:

- **Imágenes / video**: reemplazar el dibujo procedural de `visual.js` por
  capas `<img>`/`<video>` o `drawImage` de assets cargados, usando
  `scene.value` para el crossfade entre capas y los parámetros de escena
  (`fireIntensity`, `textureAmount`, `light`) para opacidades/filtros. La
  interfaz `sampleScene(valor)` no cambia.
- **Audio**: en `audio.js`, cambiar los osciladores/ruido de cada capa por
  `AudioBufferSourceNode` con los archivos de `assets/audio`, conservando el
  `GainNode` de la capa y la lógica de `update(scene)`.
