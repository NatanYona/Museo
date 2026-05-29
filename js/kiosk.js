/* ====================================================================
   kiosk.js — utilidades para uso en kiosco/tablet dedicada.
   Todo es "best effort": si el navegador no soporta algo, se ignora
   sin romper la experiencia. Varias APIs requieren un gesto del
   usuario, por eso se invocan desde el primer toque.
   ==================================================================== */

/** Entra a pantalla completa (requiere gesto del usuario). */
export async function enterFullscreen() {
  const el = document.documentElement;
  try {
    if (el.requestFullscreen) await el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  } catch (_) {
    /* iOS Safari no permite fullscreen programático: se ignora */
  }
}

/** Bloquea la orientación en horizontal (si el navegador lo permite). */
export async function lockLandscape() {
  try {
    if (screen.orientation?.lock) await screen.orientation.lock("landscape");
  } catch (_) {
    /* no soportado o requiere fullscreen previo: se ignora */
  }
}

/** Evita que la pantalla se apague (Screen Wake Lock API). */
export async function keepAwake() {
  let lock = null;
  const request = async () => {
    try {
      lock = await navigator.wakeLock?.request("screen");
    } catch (_) {
      /* sin permiso/soporte */
    }
  };
  await request();
  // Re-adquirir si el sistema lo libera al volver de segundo plano
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") request();
  });
}

/** Bloquea gestos del navegador que competirían con el slider. */
export function suppressBrowserGestures() {
  // Doble-tap zoom / pinch en iOS
  document.addEventListener("gesturestart", (e) => e.preventDefault());
  document.addEventListener("dblclick", (e) => e.preventDefault());
  // Evita scroll/pull-to-refresh con multitáctil
  document.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length > 1) e.preventDefault();
    },
    { passive: false }
  );
}
