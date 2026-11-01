import { useCallback, useEffect, useRef, useState } from 'react';
import { buscarDirecciones, direccionDesdeCoordenadas, mensajeDeError } from '../services/nominatim.js';
import { useDebounce } from './useDebounce.js';

/**
 * Búsqueda de direcciones bajo demanda (botón o Enter). Cancela la consulta anterior si se pide otra.
 * No se busca mientras se escribe: la política de Nominatim prohíbe el autocompletado.
 */
export function useBuscadorDirecciones() {
  const [estado, setEstado] = useState({ resultados: [], cargando: false, error: '', buscado: false });
  const control = useRef(null);

  const buscar = useCallback(async texto => {
    control.current?.abort();
    const actual = new AbortController();
    control.current = actual;
    setEstado({ resultados: [], cargando: true, error: '', buscado: true });
    try {
      const resultados = await buscarDirecciones(texto, { signal: actual.signal });
      setEstado({ resultados, cargando: false, error: '', buscado: true });
    } catch (error) {
      if (error.tipo === 'cancelado') return;
      setEstado({ resultados: [], cargando: false, error: mensajeDeError(error), buscado: true });
    }
  }, []);

  const limpiar = useCallback(() => {
    control.current?.abort();
    setEstado({ resultados: [], cargando: false, error: '', buscado: false });
  }, []);

  useEffect(() => () => control.current?.abort(), []);
  return { ...estado, buscar, limpiar };
}

/**
 * Dirección del punto marcado en el mapa (geocodificación inversa).
 * Espera a que el pin deje de moverse (`espera` ms) antes de consultar.
 */
export function useDireccionDeUbicacion(ubicacion, espera = 800) {
  const clave = ubicacion ? `${ubicacion.lat.toFixed(5)},${ubicacion.lng.toFixed(5)}` : '';
  const claveEstable = useDebounce(clave, espera);
  const [estado, setEstado] = useState({ direccion: null, cargando: false, error: '' });

  useEffect(() => {
    if (!claveEstable) {
      setEstado({ direccion: null, cargando: false, error: '' });
      return undefined;
    }
    const [lat, lng] = claveEstable.split(',').map(Number);
    const control = new AbortController();
    setEstado({ direccion: null, cargando: true, error: '' });
    direccionDesdeCoordenadas(lat, lng, { signal: control.signal })
      .then(direccion => setEstado({ direccion, cargando: false, error: '' }))
      .catch(error => {
        if (error.tipo === 'cancelado') return;
        setEstado({ direccion: null, cargando: false, error: mensajeDeError(error) });
      });
    return () => control.abort();
  }, [claveEstable]);

  // Mientras el pin se mueve (la clave aún no se estabilizó) se muestra "buscando".
  const moviendo = clave !== '' && clave !== claveEstable;
  return { ...estado, cargando: estado.cargando || moviendo };
}
