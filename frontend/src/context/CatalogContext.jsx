import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useStoredValue } from '../hooks/useStoredValue.js';
import { escribirJSON, existeClave } from '../services/store.js';
import { CLAVE_PRODUCTOS, PRODUCTOS_INICIALES, normalizarProducto } from '../services/catalogo.js';

const CatalogContext = createContext(null);

/** Catálogo del menú: `productos` son los visibles al público; `todos` incluye los ocultos. */
export function CatalogProvider({ children }) {
  const crudo = useStoredValue(CLAVE_PRODUCTOS, null);

  const todos = useMemo(
    () => (Array.isArray(crudo) ? crudo : PRODUCTOS_INICIALES).filter(Boolean).map(normalizarProducto),
    [crudo]
  );
  const productos = useMemo(() => todos.filter(p => p.activo !== false), [todos]);

  // La primera vez se guarda el catálogo base; una lista vacía es un valor válido.
  useEffect(() => {
    if (!existeClave(CLAVE_PRODUCTOS)) escribirJSON(CLAVE_PRODUCTOS, PRODUCTOS_INICIALES);
  }, []);

  const guardar = useCallback(lista => escribirJSON(CLAVE_PRODUCTOS, lista), []);

  const valor = useMemo(() => ({ productos, todos, guardar }), [productos, todos, guardar]);
  return <CatalogContext.Provider value={valor}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const contexto = useContext(CatalogContext);
  if (!contexto) throw new Error('useCatalog debe usarse dentro de <CatalogProvider>.');
  return contexto;
}
