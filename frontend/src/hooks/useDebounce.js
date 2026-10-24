import { useEffect, useState } from 'react';

/** Devuelve `valor` solo después de que deja de cambiar durante `ms` milisegundos. */
export function useDebounce(valor, ms = 400) {
  const [retrasado, setRetrasado] = useState(valor);
  useEffect(() => {
    const id = setTimeout(() => setRetrasado(valor), ms);
    return () => clearTimeout(id);
  }, [valor, ms]);
  return retrasado;
}
