/**
 * reportes.js
 * ---------------------------------------------------------------------------
 * Cálculos del panel de reportes. Son funciones puras: reciben la lista de
 * pedidos ya normalizada y devuelven los números que dibujan las gráficas.
 * Al no depender de React ni del navegador, se prueban por separado.
 *
 * También contiene el generador de pedidos de demostración (usa el
 * almacenamiento solo en esas tres funciones, al final del archivo).
 * ---------------------------------------------------------------------------
 */
import { ENVIO } from './compra.js';
import { PRODUCTOS_INICIALES } from './catalogo.js';
import { EMAIL_DEMO, CLAVE_PEDIDOS, ESTADOS, esPedidoDemo } from './pedidos.js';
import { escribirJSON, leerJSON } from './store.js';

export const COLORES_ESTADO = {
  Pendiente: '#E2A33B',
  Preparando: '#CE4B31',
  'En camino': '#746F69',
  Entregado: '#4F7058',
  Cancelado: '#B0A8A0'
};
export const PALETA = ['#CE4B31', '#4F7058', '#E2A33B', '#746F69', '#B83D27', '#9CB8A0'];

export const dinero = valor =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(valor || 0));

export const inicioDia = fecha => { const copia = new Date(fecha); copia.setHours(0, 0, 0, 0); return copia; };
export const finDia = fecha => { const copia = new Date(fecha); copia.setHours(23, 59, 59, 999); return copia; };

/** Rango de fechas: los últimos `dias` días, o el rango personalizado { inicio, fin } ('AAAA-MM-DD'). */
export function rangoActual({ dias = 7, personalizado = null } = {}, ahora = new Date()) {
  if (personalizado?.inicio && personalizado?.fin) {
    return {
      inicio: inicioDia(new Date(`${personalizado.inicio}T00:00:00`)),
      fin: finDia(new Date(`${personalizado.fin}T00:00:00`))
    };
  }
  const fin = finDia(ahora);
  const inicio = inicioDia(ahora);
  inicio.setDate(inicio.getDate() - dias + 1);
  return { inicio, fin };
}

/** Pedidos dentro del rango. Las ventas no cuentan los cancelados; el gráfico de estados sí. */
export function pedidosEnRango(pedidos, rango, { incluirCancelados = false } = {}) {
  const { inicio, fin } = rango;
  return pedidos.filter(pedido => {
    const cancelado = String(pedido.estado).toLowerCase() === 'cancelado';
    return pedido.creadoEn >= inicio && pedido.creadoEn <= fin && (incluirCancelados || !cancelado);
  });
}

export function normalizarEstado(valor) {
  const texto = String(valor || '').toLowerCase();
  if (texto.startsWith('prepar') || texto === 'en preparación') return 'Preparando';
  if (texto === 'en camino') return 'En camino';
  if (texto === 'entregado') return 'Entregado';
  if (texto === 'cancelado') return 'Cancelado';
  return 'Pendiente';
}

export function contarPorEstado(pedidos) {
  const conteos = Object.fromEntries(ESTADOS.map(estado => [estado, 0]));
  pedidos.forEach(pedido => { conteos[normalizarEstado(pedido.estado)] += 1; });
  return conteos;
}

/** Agrupa las líneas de los pedidos por producto y por categoría. */
export function agrupar(pedidos) {
  const productos = new Map();
  const categorias = new Map();
  pedidos.forEach(pedido => {
    pedido.items.forEach(item => {
      const cantidad = Number(item.cantidad || 0);
      const ingreso = Number(item.precio || 0) * cantidad;
      const p = productos.get(item.nombre) || { nombre: item.nombre, cantidad: 0, ingreso: 0 };
      p.cantidad += cantidad;
      p.ingreso += ingreso;
      productos.set(item.nombre, p);
      const c = categorias.get(item.categoria) || { categoria: item.categoria, cantidad: 0, ingreso: 0 };
      c.cantidad += cantidad;
      c.ingreso += ingreso;
      categorias.set(item.categoria, c);
    });
  });
  return {
    productos: [...productos.values()].sort((a, b) => b.cantidad - a.cantidad),
    categorias: [...categorias.values()].sort((a, b) => b.ingreso - a.ingreso)
  };
}

/** Serie diaria: ventas ($) y cantidad de pedidos por cada día del rango. */
export function construirSerieDiaria(pedidos, rango, { etiquetaCorta = false } = {}) {
  const etiquetas = [];
  const valores = [];
  const cantidades = [];
  const dias = [];
  const cursor = new Date(rango.inicio);
  const formato = etiquetaCorta ? { weekday: 'short' } : { day: '2-digit', month: 'short' };
  while (cursor <= rango.fin) {
    const desde = inicioDia(cursor);
    const hasta = finDia(cursor);
    const delDia = pedidos.filter(p => p.creadoEn >= desde && p.creadoEn <= hasta);
    etiquetas.push(cursor.toLocaleDateString('es-SV', formato).replace('.', ''));
    valores.push(Number(delDia.reduce((suma, p) => suma + Number(p.total || 0), 0).toFixed(2)));
    cantidades.push(delDia.length);
    dias.push(new Date(desde));
    cursor.setDate(cursor.getDate() + 1);
  }
  return { etiquetas, valores, cantidades, dias };
}

/** Resumen de los indicadores principales. */
export function indicadores(pedidos) {
  const ingresos = pedidos.reduce((suma, p) => suma + Number(p.total || 0), 0);
  const { productos, categorias } = agrupar(pedidos);
  return {
    cantidad: pedidos.length,
    ingresos,
    ticketPromedio: pedidos.length ? ingresos / pedidos.length : 0,
    productoTop: productos[0]?.nombre || '—',
    productos,
    categorias
  };
}

/** Pedidos de un día concreto, en orden cronológico. */
export function pedidosDelDia(pedidos, dia) {
  const desde = inicioDia(dia);
  const hasta = finDia(dia);
  return pedidos.filter(p => p.creadoEn >= desde && p.creadoEn <= hasta).sort((a, b) => a.creadoEn - b.creadoEn);
}

/** Contenido CSV (con BOM para que Excel respete los acentos). */
export function categoriasACsv(categorias) {
  const filas = [
    ['Categoría', 'Ordenado (cant.)', 'Total recaudado'],
    ...categorias.map(c => [c.categoria, c.cantidad, c.ingreso.toFixed(2)])
  ];
  const csv = filas.map(fila => fila.map(celda => `"${String(celda).replaceAll('"', '""')}"`).join(',')).join('\n');
  return `\uFEFF${csv}`;
}

/* -------------------------------------------------------------------------- */
/* Pedidos de demostración (el único código de este archivo que usa storage)  */
/* -------------------------------------------------------------------------- */
const aleatorio = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const elegir = lista => lista[aleatorio(0, lista.length - 1)];

function estadoSegunAntiguedad(diasAtras) {
  if (diasAtras >= 1) return Math.random() < 0.92 ? 'Entregado' : 'Cancelado';
  return elegir(['Pendiente', 'Preparando', 'En camino', 'Entregado', 'Entregado']);
}

function crearPedidoDemo(numero) {
  const diasAtras = aleatorio(0, 29);
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - diasAtras);
  fecha.setHours(aleatorio(10, 20), aleatorio(0, 59), 0, 0);

  const elegidos = [...PRODUCTOS_INICIALES].sort(() => Math.random() - 0.5).slice(0, aleatorio(1, 3));
  const items = elegidos.map(p => ({
    productoId: p.id, nombre: p.nombre, categoria: p.categoria, precio: p.precio, cantidad: aleatorio(1, 5)
  }));
  const subtotal = items.reduce((suma, item) => suma + item.precio * item.cantidad, 0);
  return {
    id: `SE-D${String(numero).padStart(3, '0')}`,
    cliente: 'Cliente demo',
    email: EMAIL_DEMO,
    telefono: '7000-0000',
    direccion: 'Dirección de demostración, San Salvador',
    referencia: '',
    pago: elegir(['efectivo', 'transferencia', 'tarjeta']),
    items,
    subtotal: Number(subtotal.toFixed(2)),
    envio: ENVIO,
    total: Number((subtotal + ENVIO).toFixed(2)),
    estado: estadoSegunAntiguedad(diasAtras),
    creadoEn: fecha.toISOString(),
    ubicacion: null
  };
}

const leerCrudos = () => {
  const datos = leerJSON(CLAVE_PEDIDOS, []);
  return Array.isArray(datos) ? datos : [];
};

export const contarDemo = pedidos => pedidos.filter(esPedidoDemo).length;

/** Reemplaza los pedidos de demostración anteriores por `cantidad` nuevos. */
export function generarDatosDemo(cantidad = 45) {
  const reales = leerCrudos().filter(p => String(p?.email || '').toLowerCase() !== EMAIL_DEMO);
  const demo = Array.from({ length: cantidad }, (_, i) => crearPedidoDemo(i + 1));
  escribirJSON(CLAVE_PEDIDOS, [...reales, ...demo]);
  return demo.length;
}

/** Elimina solo los pedidos de demostración. Devuelve cuántos quitó. */
export function eliminarDatosDemo() {
  const todos = leerCrudos();
  const reales = todos.filter(p => String(p?.email || '').toLowerCase() !== EMAIL_DEMO);
  escribirJSON(CLAVE_PEDIDOS, reales);
  return todos.length - reales.length;
}
