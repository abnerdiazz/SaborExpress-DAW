/**
 * pedidos.js
 * ---------------------------------------------------------------------------
 * Modelo de pedidos: estados, normalización y operaciones puras sobre la lista.
 * ---------------------------------------------------------------------------
 */

export const CLAVE_PEDIDOS = 'saborExpressPedidos';

export const ESTADOS = ['Pendiente', 'Preparando', 'En camino', 'Entregado', 'Cancelado'];
/** Regla de negocio: Entregado y Cancelado son estados finales y ya no se pueden cambiar. */
export const ESTADOS_FINALES = ['Entregado', 'Cancelado'];

export const EMAIL_DEMO = 'demo@saborexpress.com';

const esDemoHeredado = pedido => String(pedido?.id ?? '').startsWith('DEMO-');
export const esPedidoDemo = pedido => String(pedido?.email || '').toLowerCase() === EMAIL_DEMO;

const normalizarFecha = valor => {
  if (!valor) return new Date();
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? new Date() : fecha;
};

const normalizarItem = crudo => ({
  productoId: crudo.productoId ?? crudo.productId ?? crudo.id ?? '',
  nombre: crudo.nombre ?? crudo.name ?? 'Producto',
  categoria: crudo.categoria ?? crudo.category ?? 'Otros',
  precio: Number(crudo.precio ?? crudo.price ?? 0),
  cantidad: Number(crudo.cantidad ?? crudo.quantity ?? 1)
});

export const normalizarPedido = crudo => ({
  id: crudo.id,
  estado: crudo.estado ?? crudo.status ?? 'Pendiente',
  total: Number(crudo.total ?? 0),
  subtotal: Number(crudo.subtotal ?? crudo.total ?? 0),
  envio: Number(crudo.envio ?? 0),
  cliente: crudo.cliente ?? crudo.nombre ?? '',
  email: String(crudo.email ?? '').toLowerCase(),
  telefono: crudo.telefono ?? '',
  direccion: crudo.direccion ?? '',
  referencia: crudo.referencia ?? '',
  pago: crudo.pago ?? '',
  ubicacion: crudo.ubicacion ?? null,
  creadoEn: normalizarFecha(crudo.creadoEn ?? crudo.createdAt ?? crudo.fecha),
  items: (crudo.items ?? crudo.productos ?? []).map(normalizarItem)
});

/** Convierte lo guardado en la lista que usa la interfaz (más recientes primero). */
export function prepararPedidos(crudos) {
  if (!Array.isArray(crudos)) return [];
  return crudos
    .filter(p => p && typeof p === 'object' && !esDemoHeredado(p))
    .map(normalizarPedido)
    .sort((a, b) => b.creadoEn - a.creadoEn);
}

/** Agrega un pedido nuevo (estado Pendiente) y devuelve la lista y el pedido creado. */
export function agregarPedido(crudos, datos) {
  const lista = Array.isArray(crudos) ? crudos.filter(p => !esDemoHeredado(p)) : [];
  const pedido = {
    ...datos,
    id: `SE-${String(lista.length + 1).padStart(4, '0')}`,
    estado: 'Pendiente',
    creadoEn: new Date().toISOString()
  };
  return { lista: [...lista, pedido], pedido };
}

/** Cambia el estado de un pedido. Devuelve la lista nueva o null si no existe. */
export function cambiarEstadoPedido(crudos, id, estado) {
  const lista = Array.isArray(crudos) ? crudos : [];
  if (!lista.some(p => p.id === id)) return null;
  return lista.map(p => (p.id === id ? { ...p, estado } : p));
}

/** Agrupa los estados en las etiquetas de los filtros del panel de pedidos. */
export function claveFiltroEstado(estado) {
  const valor = String(estado || '').toLowerCase();
  if (valor.includes('entreg')) return 'entregado';
  if (valor.includes('cancel')) return 'cancelado';
  if (valor.includes('camino') || valor.includes('prepara')) return 'preparando';
  return 'pendiente';
}
