import { iniciarNavbar, leerCarrito, guardarCarrito, vaciarCarrito, leerSesion } from './saborexpress-data.js';
import { ENVIO, MAX_POR_PRODUCTO, money, esc, subtotalDe, esCliente } from './compra-utils.js';
import { aviso, confirmar, toast } from './alertas.js';
import { describirCambios, sincronizarCarritoConMenu } from './carrito-sync.js';

async function initCarrito() {
    const tbody = document.getElementById('cart-table-body');
    if (!tbody) return;

    const enlaceCheckout = document.querySelector('a[href="checkout.html"]');
    if (enlaceCheckout && !esCliente(leerSesion())) enlaceCheckout.href = 'login.html?redirect=checkout.html';
    const botonVaciar = document.getElementById('btn-vaciar-carrito');

    function render() {
        const carrito = leerCarrito();
        const subtotal = subtotalDe(carrito);
        tbody.innerHTML = carrito.length ? carrito.map((item, i) => `
            <tr class="cart-item">
                <td class="ps-4 cart-product-title">${esc(item.nombre)}</td>
                <td class="text-center">
                    <div class="qty-pill-container">
                        <button type="button" class="qty-btn btn-minus" data-index="${i}" aria-label="Disminuir cantidad de ${esc(item.nombre)}">-</button>
                        <span class="qty-val">${Number(item.cantidad)}</span>
                        <button type="button" class="qty-btn btn-plus" data-index="${i}" aria-label="Aumentar cantidad de ${esc(item.nombre)}">+</button>
                    </div>
                </td>
                <td class="cart-price-text">${money(item.precio)}</td>
                <td class="pe-4 cart-subtotal-text">${money(item.precio * item.cantidad)}</td>
            </tr>`).join('') : `
            <tr><td colspan="4" class="text-center py-5 text-muted">Tu carrito está vacío.<br>
            <a href="menu.html" class="fw-bold text-decoration-none" style="color: var(--se-primary);">Ir a ver el menú</a></td></tr>`;

        document.getElementById('cart-subtotal').textContent = money(subtotal);
        document.getElementById('cart-shipping').textContent = money(carrito.length ? ENVIO : 0);
        document.getElementById('cart-total').textContent = money(carrito.length ? subtotal + ENVIO : 0);
        if (enlaceCheckout) {
            enlaceCheckout.style.pointerEvents = carrito.length ? '' : 'none';
            enlaceCheckout.style.opacity = carrito.length ? '' : '.5';
        }
        botonVaciar?.classList.toggle('d-none', carrito.length === 0);
    }

    tbody.addEventListener('click', async event => {
        const boton = event.target.closest('.btn-plus, .btn-minus');
        if (!boton) return;
        const carrito = leerCarrito();
        const item = carrito[Number(boton.dataset.index)];
        if (!item) return;

        if (boton.classList.contains('btn-plus')) {
            if (item.cantidad >= MAX_POR_PRODUCTO) {
                toast(`Máximo ${MAX_POR_PRODUCTO} unidades de "${item.nombre}" por pedido.`, 'warning', 3500);
                return;
            }
            item.cantidad += 1;
        } else if (item.cantidad === 1) {
            // Bajar de 1 a 0 quita el producto: se pide confirmación.
            const quitar = await confirmar({
                titulo: '¿Quitar este producto?',
                texto: `"${item.nombre}" se eliminará de tu carrito.`,
                icon: 'warning',
                confirmText: 'Sí, quitar',
                cancelText: 'Mantener'
            });
            if (!quitar) return;
            item.cantidad = 0;
            toast(`"${item.nombre}" quitado del carrito.`, 'info');
        } else {
            item.cantidad -= 1;
        }

        guardarCarrito(carrito.filter(producto => producto.cantidad > 0));
        render();
    });

    botonVaciar?.addEventListener('click', async () => {
        const vaciar = await confirmar({
            titulo: '¿Vaciar el carrito?',
            texto: 'Se quitarán todos los productos de tu carrito.',
            icon: 'warning',
            confirmText: 'Sí, vaciar',
            cancelText: 'Cancelar'
        });
        if (!vaciar) return;
        vaciarCarrito();
        render();
        toast('Carrito vaciado.', 'info');
    });

    // Si el administrador cambió el menú, el carrito se ajusta y se avisa.
    const cambios = await sincronizarCarritoConMenu();
    render();
    const texto = describirCambios(cambios);
    if (texto) await aviso('Actualizamos tu carrito', texto);
}

document.addEventListener('DOMContentLoaded', () => {
    iniciarNavbar();
    initCarrito();
});
