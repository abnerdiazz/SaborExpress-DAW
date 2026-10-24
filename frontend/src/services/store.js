/**
 * store.js
 * ---------------------------------------------------------------------------
 * Capa de almacenamiento reactivo sobre localStorage.
 *
 * React necesita saber cuándo cambia un dato externo. Aquí se resuelve con el
 * patrón "suscripción": quien lee un dato se suscribe a su clave y se le avisa
 * cuando cambia, ya sea por una escritura de esta pestaña o por el evento
 * `storage` que el navegador dispara cuando OTRA pestaña escribe. Así, un
 * cambio del administrador aparece en la pestaña del cliente sin recargar.
 *
 * El hook `useStoredValue` (hooks/useStoredValue.js) usa estas funciones con
 * `useSyncExternalStore`, la API de React pensada para este caso.
 * ---------------------------------------------------------------------------
 */

const oyentes = new Map();     // clave -> Set de funciones a avisar
const memoria = new Map();     // clave -> { crudo, valor } (mantiene estable la referencia leída)
let escuchandoStorage = false;

function leerCrudo(clave) {
  try {
    return window.localStorage.getItem(clave);
  } catch {
    return null;
  }
}

function avisar(clave) {
  oyentes.get(clave)?.forEach(oyente => oyente());
}

function escucharOtrasPestanas() {
  if (escuchandoStorage || typeof window === 'undefined') return;
  escuchandoStorage = true;
  window.addEventListener('storage', evento => {
    // `key` es null cuando se vació todo el almacenamiento.
    if (evento.key === null) oyentes.forEach((_, clave) => avisar(clave));
    else avisar(evento.key);
  });
}

/** Lee y convierte un valor JSON. Si falta o está dañado, devuelve `respaldo`. */
export function leerJSON(clave, respaldo) {
  const crudo = leerCrudo(clave);
  if (crudo === null) return respaldo;
  try {
    return JSON.parse(crudo);
  } catch {
    return respaldo;
  }
}

/** Guarda un valor y avisa a quienes lo estén leyendo. */
export function escribirJSON(clave, valor) {
  window.localStorage.setItem(clave, JSON.stringify(valor));
  avisar(clave);
}

export function borrarClave(clave) {
  window.localStorage.removeItem(clave);
  avisar(clave);
}

export function existeClave(clave) {
  return leerCrudo(clave) !== null;
}

/** Suscripción para useSyncExternalStore. Devuelve la función que cancela. */
export function suscribir(clave, oyente) {
  escucharOtrasPestanas();
  if (!oyentes.has(clave)) oyentes.set(clave, new Set());
  oyentes.get(clave).add(oyente);
  return () => oyentes.get(clave)?.delete(oyente);
}

/**
 * "Instantánea" del valor: si el texto guardado no cambió, devuelve EXACTAMENTE
 * el mismo objeto de la lectura anterior. React compara por referencia; sin esto
 * volvería a dibujar la pantalla sin parar.
 */
export function instantanea(clave, respaldo) {
  const crudo = leerCrudo(clave);
  const previo = memoria.get(clave);
  if (previo && previo.crudo === crudo) return previo.valor;
  let valor = respaldo;
  if (crudo !== null) {
    try {
      valor = JSON.parse(crudo);
    } catch {
      valor = respaldo;
    }
  }
  memoria.set(clave, { crudo, valor });
  return valor;
}

/** Solo para pruebas: olvida lo leído. */
export function reiniciarMemoria() {
  memoria.clear();
}
