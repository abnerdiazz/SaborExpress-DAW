import { createContext, useCallback, useContext, useMemo } from 'react';
import { useStoredValue } from '../hooks/useStoredValue.js';
import { escribirJSON, leerJSON } from '../services/store.js';
import {
  CLAVE_PEDIDOS, agregarPedido, cambiarEstadoPedido, normalizarPedido, prepararPedidos
} from '../services/pedidos.js';

const VACIO = [];
const OrdersContext = createContext(null);

/** Pedidos de todos los clientes (más recientes primero). Se actualizan solos entre pestañas. */
export function OrdersProvider({ children }) {
  const crudos = useStoredValue(CLAVE_PEDIDOS, VACIO);
  const pedidos = useMemo(() => prepararPedidos(crudos), [crudos]);

  /** Crea el pedido (estado Pendiente) y lo devuelve ya normalizado. */
  const crearPedido = useCallback(datos => {
    const { lista, pedido } = agregarPedido(leerJSON(CLAVE_PEDIDOS, []), datos);
    escribirJSON(CLAVE_PEDIDOS, lista);
    return normalizarPedido(pedido);
  }, []);

  /** Cambia el estado de un pedido. Devuelve false si no existe. */
  const actualizarEstado = useCallback((id, estado) => {
    const lista = cambiarEstadoPedido(leerJSON(CLAVE_PEDIDOS, []), id, estado);
    if (!lista) return false;
    escribirJSON(CLAVE_PEDIDOS, lista);
    return true;
  }, []);

  /** Lee un pedido directamente del almacenamiento (siempre actualizado, útil después de un `await`). */
  const buscarPedido = useCallback(
    id => prepararPedidos(leerJSON(CLAVE_PEDIDOS, [])).find(pedido => pedido.id === id) ?? null,
    []
  );

  const valor = useMemo(
    () => ({ pedidos, crearPedido, actualizarEstado, buscarPedido }),
    [pedidos, crearPedido, actualizarEstado, buscarPedido]
  );
  return <OrdersContext.Provider value={valor}>{children}</OrdersContext.Provider>;
}

export function useOrders() {
  const contexto = useContext(OrdersContext);
  if (!contexto) throw new Error('useOrders debe usarse dentro de <OrdersProvider>.');
  return contexto;
}
