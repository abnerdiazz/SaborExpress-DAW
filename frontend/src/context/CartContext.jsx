import { createContext, useCallback, useContext, useMemo } from 'react';
import { useStoredValue } from '../hooks/useStoredValue.js';
import { escribirJSON, leerJSON } from '../services/store.js';
import { MAX_POR_PRODUCTO, subtotalDe, totalUnidades } from '../services/compra.js';
import { CLAVE_CARRITO, normalizarItemCarrito, sincronizarCarrito } from '../services/catalogo.js';

const VACIO = [];
const CartContext = createContext(null);

/** Carrito más reciente, leído del almacenamiento (puede haber cambiado desde otra pestaña). */
const leerActual = () => {
  const datos = leerJSON(CLAVE_CARRITO, VACIO);
  return Array.isArray(datos) ? datos.filter(Boolean).map(normalizarItemCarrito) : [];
};

/** Carrito de compras. Toda la lógica de topes y cantidades vive aquí, no en las pantallas. */
export function CartProvider({ children }) {
  const crudo = useStoredValue(CLAVE_CARRITO, VACIO);
  const carrito = useMemo(
    () => (Array.isArray(crudo) ? crudo.filter(Boolean).map(normalizarItemCarrito) : VACIO),
    [crudo]
  );
  const subtotal = useMemo(() => subtotalDe(carrito), [carrito]);
  const unidades = useMemo(() => totalUnidades(carrito), [carrito]);

  const guardar = useCallback(lista => escribirJSON(CLAVE_CARRITO, lista), []);

  /**
   * Agrega unidades respetando el tope por producto.
   * Devuelve { agregadas, recortado } o { agregadas: 0, sinCambio: true } si ya estaba en el tope.
   */
  const agregar = useCallback((producto, cantidad) => {
    const carrito = leerActual();
    const actual = carrito.find(item => item.productoId === producto.id);
    const antes = actual ? actual.cantidad : 0;
    const nueva = Math.min(MAX_POR_PRODUCTO, antes + cantidad);
    if (nueva === antes) return { agregadas: 0, sinCambio: true };

    const lista = actual
      ? carrito.map(item => (item.productoId === producto.id ? { ...item, cantidad: nueva } : item))
      : [...carrito, {
          productoId: producto.id, nombre: producto.nombre, precio: producto.precio,
          imagen: producto.imagen, categoria: producto.categoria, cantidad: nueva
        }];
    guardar(lista);
    const agregadas = nueva - antes;
    return { agregadas, recortado: agregadas < cantidad };
  }, [guardar]);

  /** Sube una unidad. Devuelve false si ya está en el tope. */
  const incrementar = useCallback(productoId => {
    const carrito = leerActual();
    const item = carrito.find(i => i.productoId === productoId);
    if (!item || item.cantidad >= MAX_POR_PRODUCTO) return false;
    guardar(carrito.map(i => (i.productoId === productoId ? { ...i, cantidad: i.cantidad + 1 } : i)));
    return true;
  }, [guardar]);

  /** Baja una unidad; al llegar a 0 el producto sale del carrito. */
  const decrementar = useCallback(productoId => {
    guardar(
      leerActual()
        .map(i => (i.productoId === productoId ? { ...i, cantidad: i.cantidad - 1 } : i))
        .filter(i => i.cantidad > 0)
    );
  }, [guardar]);

  const quitar = useCallback(productoId => {
    guardar(leerActual().filter(i => i.productoId !== productoId));
  }, [guardar]);

  const vaciar = useCallback(() => guardar([]), [guardar]);

  /** Ajusta el carrito al menú vigente. Devuelve qué cambió ({ retirados, actualizados, cambio }). */
  const sincronizar = useCallback(productosActivos => {
    const resultado = sincronizarCarrito(leerActual(), productosActivos);
    if (resultado.cambio) guardar(resultado.carrito);
    return resultado;
  }, [guardar]);

  const valor = useMemo(
    () => ({ carrito, subtotal, unidades, agregar, incrementar, decrementar, quitar, vaciar, sincronizar }),
    [carrito, subtotal, unidades, agregar, incrementar, decrementar, quitar, vaciar, sincronizar]
  );
  return <CartContext.Provider value={valor}>{children}</CartContext.Provider>;
}

export function useCart() {
  const contexto = useContext(CartContext);
  if (!contexto) throw new Error('useCart debe usarse dentro de <CartProvider>.');
  return contexto;
}
