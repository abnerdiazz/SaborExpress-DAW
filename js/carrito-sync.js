/**
 * carrito-sync.js
 * ---------------------------------------------------------------------------
 * Mantiene el carrito al día con el menú. Si el administrador oculta o elimina
 * un producto, o le cambia el precio, mientras alguien ya lo tenía en su carrito:
 *   - los productos que ya no están disponibles se quitan del carrito;
 *   - los precios se actualizan al precio vigente del menú.
 * Devuelve qué cambió para poder avisarle a la persona.
 * ---------------------------------------------------------------------------
 */

import { obtenerProductos, leerCarrito, guardarCarrito } from './saborexpress-data.js';

export async function sincronizarCarritoConMenu() {
    const { datos } = await obtenerProductos();
    const menu = new Map(datos.map(producto => [producto.id, producto]));

    const retirados = [];
    const actualizados = [];
    const vigente = [];

    leerCarrito().forEach(item => {
        const producto = menu.get(item.productoId);
        if (!producto) {
            retirados.push(item.nombre);
            return;
        }
        if (Number(producto.precio) !== Number(item.precio)) actualizados.push(producto.nombre);
        vigente.push({ ...item, nombre: producto.nombre, precio: producto.precio });
    });

    if (retirados.length || actualizados.length) guardarCarrito(vigente);
    return { retirados, actualizados };
}

/** Texto para avisar los cambios, o '' si no hubo ninguno. */
export function describirCambios({ retirados, actualizados }) {
    const partes = [];
    if (retirados.length) partes.push(`Ya no están disponibles y se quitaron de tu carrito: ${retirados.join(', ')}.`);
    if (actualizados.length) partes.push(`Cambió el precio de: ${actualizados.join(', ')}.`);
    return partes.join(' ');
}
