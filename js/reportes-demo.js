/**
 * reportes-demo.js
 * ---------------------------------------------------------------------------
 * Datos de demostración para el panel de reportes.
 *
 * Los pedidos reales nacen "hoy", así que sin historial las gráficas se ven
 * casi vacías. Este módulo agrega pedidos de ejemplo repartidos en los últimos
 * 30 días. Quedan identificados con el correo demo@saborexpress.com y se
 * pueden eliminar con un clic sin tocar ningún pedido real.
 * ---------------------------------------------------------------------------
 */

import { PRODUCTOS_INICIALES } from './saborexpress-data.js';

const CLAVE_PEDIDOS = 'saborExpressPedidos';
export const EMAIL_DEMO = 'demo@saborexpress.com';
const ENVIO = 1.00;

const leerCrudo = () => {
    try {
        const datos = JSON.parse(localStorage.getItem(CLAVE_PEDIDOS));
        return Array.isArray(datos) ? datos : [];
    } catch {
        return [];
    }
};

const esDemo = pedido => String(pedido?.email || '').toLowerCase() === EMAIL_DEMO;
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

    const lineas = aleatorio(1, 3);
    const elegidos = [...PRODUCTOS_INICIALES].sort(() => Math.random() - 0.5).slice(0, lineas);
    const items = elegidos.map(producto => ({
        productoId: producto.id,
        nombre: producto.nombre,
        categoria: producto.categoria,
        precio: producto.precio,
        cantidad: aleatorio(1, 5)
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

export function contarDemo() {
    return leerCrudo().filter(esDemo).length;
}

/** Reemplaza los pedidos de demostración anteriores por `cantidad` nuevos. */
export function generarDatosDemo(cantidad = 45) {
    const reales = leerCrudo().filter(pedido => !esDemo(pedido));
    const demo = Array.from({ length: cantidad }, (_, indice) => crearPedidoDemo(indice + 1));
    localStorage.setItem(CLAVE_PEDIDOS, JSON.stringify([...reales, ...demo]));
    return demo.length;
}

/** Elimina solo los pedidos de demostración. Devuelve cuántos quitó. */
export function eliminarDatosDemo() {
    const todos = leerCrudo();
    const reales = todos.filter(pedido => !esDemo(pedido));
    localStorage.setItem(CLAVE_PEDIDOS, JSON.stringify(reales));
    return todos.length - reales.length;
}
