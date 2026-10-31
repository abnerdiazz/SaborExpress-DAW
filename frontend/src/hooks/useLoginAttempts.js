import { useCallback } from 'react';

// Seguridad básica: tras 5 intentos fallidos se bloquea el formulario 30 segundos.
export const MAX_INTENTOS = 5;
export const BLOQUEO_SEGUNDOS = 30;
const CLAVE_INTENTOS = 'saborExpressLoginIntentos';

function leerIntentos() {
  try {
    return JSON.parse(window.sessionStorage.getItem(CLAVE_INTENTOS)) || { fallos: 0, bloqueadoHasta: 0 };
  } catch {
    return { fallos: 0, bloqueadoHasta: 0 };
  }
}

/** Control de intentos fallidos de inicio de sesión (se guarda en sessionStorage: dura lo que la pestaña). */
export function useLoginAttempts() {
  const segundosDeBloqueo = useCallback(
    () => Math.max(0, Math.ceil((leerIntentos().bloqueadoHasta - Date.now()) / 1000)),
    []
  );

  /** Suma un intento fallido. Indica cuántos quedan y si este fallo activó el bloqueo. */
  const registrarFallo = useCallback(() => {
    const estado = leerIntentos();
    estado.fallos += 1;
    const bloqueado = estado.fallos >= MAX_INTENTOS;
    if (bloqueado) {
      estado.fallos = 0;
      estado.bloqueadoHasta = Date.now() + BLOQUEO_SEGUNDOS * 1000;
    }
    window.sessionStorage.setItem(CLAVE_INTENTOS, JSON.stringify(estado));
    return { quedan: MAX_INTENTOS - estado.fallos, bloqueado };
  }, []);

  const limpiar = useCallback(() => window.sessionStorage.removeItem(CLAVE_INTENTOS), []);

  return { segundosDeBloqueo, registrarFallo, limpiar };
}
