import { useEffect, useMemo, useState } from 'react';

/** Paginación de una lista en memoria. Si la lista se acorta, vuelve a una página válida. */
export function usePaginacion(lista, porPagina) {
  const [pagina, setPagina] = useState(1);
  const paginas = Math.max(1, Math.ceil(lista.length / porPagina));

  useEffect(() => {
    if (pagina > paginas) setPagina(paginas);
  }, [pagina, paginas]);

  const paginaActual = Math.min(pagina, paginas);
  const visibles = useMemo(() => {
    const inicio = (paginaActual - 1) * porPagina;
    return lista.slice(inicio, inicio + porPagina);
  }, [lista, paginaActual, porPagina]);

  return { pagina: paginaActual, setPagina, paginas, visibles, total: lista.length };
}
