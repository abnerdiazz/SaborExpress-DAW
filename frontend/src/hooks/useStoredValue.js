import { useCallback, useSyncExternalStore } from 'react';
import { instantanea, suscribir } from '../services/store.js';

/**
 * Lee un valor de localStorage y vuelve a dibujar el componente cuando cambia,
 * ya sea por una escritura de esta pestaña o de otra (evento `storage`).
 * `respaldo` debe ser una constante (misma referencia en cada llamada).
 */
export function useStoredValue(clave, respaldo) {
  const suscripcion = useCallback(oyente => suscribir(clave, oyente), [clave]);
  const leer = useCallback(() => instantanea(clave, respaldo), [clave, respaldo]);
  return useSyncExternalStore(suscripcion, leer, () => respaldo);
}
