import { iniciarNavbar, leerSesion, obtenerPedidos, actualizarEstadoPedido } from './saborexpress-data.js';
import { money, esc } from './compra-utils.js';
import { aviso, confirmar, toast } from './alertas.js';

const hora = fecha => fecha.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' });

const PASOS = [
    ['Pedido recibido', 'Tu orden ha sido registrada en el sistema de SaborExpress.', 'bi-check-lg'],
    ['En preparación', 'El maestro pupusero está cocinando tus pupusas a mano.', 'bi-egg-fried'],
    ['En camino', 'El repartidor va en camino a tu dirección.', 'bi-scooter'],
    ['Entregado', 'Pedido entregado con éxito. ¡Buen provecho!', 'bi-house-check']
];
const INDICE_ESTADO = { pendiente: 0, preparando: 1, 'en camino': 2, entregado: 3 };

function tarjetaVacia(titulo, texto, enlaces) {
    return `<div class="surface-card p-4 mb-4 text-center" style="box-shadow: var(--se-shadow);">
        <i class="bi bi-receipt fs-1 text-brand"></i>
        <h2 class="h5 fw-bold mt-3">${titulo}</h2>
        <p class="text-secondary">${texto}</p>${enlaces}</div>`;
}

function tarjetaPedido(pedido) {
    const indice = INDICE_ESTADO[String(pedido.estado).toLowerCase()] ?? 0;
    const pasos = PASOS.map(([titulo, descripcion, icono], i) => {
        const estado = i < indice || indice === 3 ? 'is-done' : i === indice ? 'is-current' : 'is-pending';
        return `<li class="order-step ${estado}">
            <span class="step-icon ${estado}"><i class="bi ${estado === 'is-done' ? 'bi-check-lg' : icono}"></i></span>
            <div><p class="step-title mb-0">${titulo}${estado === 'is-current' ? ' (Actual)' : ''}</p><p class="step-desc">${descripcion}</p></div>
        </li>`;
    }).join('');
    const desde = new Date(pedido.creadoEn.getTime() + 30 * 60000);
    const hasta = new Date(pedido.creadoEn.getTime() + 45 * 60000);
    const mensaje = encodeURIComponent(`Hola, quiero consultar sobre mi pedido #${pedido.id}`);

    return `<div class="surface-card p-4 mb-4" style="box-shadow: var(--se-shadow);">
        <div class="order-header">
            <span class="order-number">ORDEN: #${esc(pedido.id)}</span>
            <span class="order-total">Total: ${money(pedido.total)}</span>
        </div>
        <p class="order-meta">Fecha: ${pedido.creadoEn.toLocaleDateString('es-SV')}, ${hora(pedido.creadoEn)} &nbsp;·&nbsp; Pago: ${esc(pedido.pago)}</p>
        <ul class="order-steps">${pasos}</ul>
        <div class="eta-box">
            <p class="eta-label mb-0">Estimación de llegada</p>
            <p class="eta-time mb-0">${hora(desde)} – ${hora(hasta)}</p>
            <p class="eta-note">El tiempo aproximado varía según la demanda de la cocina.</p>
        </div>
        <a href="https://wa.me/50322000000?text=${mensaje}" target="_blank" rel="noopener" class="btn btn-outline-brand w-100">
            <i class="bi bi-whatsapp me-1"></i> Contactar repartidor vía WhatsApp
        </a>
        ${String(pedido.estado).toLowerCase() === 'pendiente' ? `<button type="button" class="btn btn-outline-danger w-100 mt-2" data-cancelar="${esc(pedido.id)}">
            <i class="bi bi-x-circle me-1"></i> Cancelar pedido
        </button>` : ''}
    </div>`;
}

function filaHistorial(pedido) {
    const estado = String(pedido.estado);
    const clase = estado === 'Entregado' ? 'success' : estado === 'Cancelado' ? 'error' : 'warning';
    const productos = pedido.items.map(item => `${item.cantidad}× ${esc(item.nombre)}`).join(', ');
    return `<tr>
        <td>#${esc(pedido.id)}</td>
        <td>${pedido.creadoEn.toLocaleDateString('es-SV')}</td>
        <td>${productos}</td>
        <td>${money(pedido.total)}</td>
        <td><span class="data-status ${clase}">${esc(estado)}</span></td>
    </tr>`;
}

/** Lee los pedidos del cliente con sesión iniciada y pinta la página. */
async function cargar() {
    const actual = document.getElementById('pedidoActual');
    const historial = document.getElementById('historialSection');
    const sesion = leerSesion();

    if (!sesion) {
        historial.classList.add('d-none');
        actual.innerHTML = tarjetaVacia('Inicia sesión para ver tus pedidos', 'Necesitas una cuenta para hacer y seguir tus pedidos.',
            '<a href="login.html?redirect=mis-pedidos.html" class="btn btn-brand me-2">Iniciar sesión</a><a href="registro.html?redirect=mis-pedidos.html" class="btn btn-outline-brand">Crear cuenta</a>');
        return;
    }

    const { datos } = await obtenerPedidos();
    const propios = datos.filter(pedido => pedido.email === sesion.email.toLowerCase());
    const enCurso = propios.find(pedido => !['entregado', 'cancelado'].includes(String(pedido.estado).toLowerCase()));

    actual.innerHTML = enCurso ? tarjetaPedido(enCurso)
        : tarjetaVacia('No tienes pedidos en curso', 'Cuando confirmes un pedido lo verás aquí con su estado.', '<a href="menu.html" class="btn btn-brand">Ver menú</a>');
    document.getElementById('historialBody').innerHTML = propios.length ? propios.map(filaHistorial).join('')
        : '<tr><td colspan="5" class="text-center text-secondary py-4">Aún no has realizado pedidos.</td></tr>';
}

/** Regla de negocio: un pedido solo se puede cancelar mientras sigue Pendiente. */
async function cancelarPedido(id) {
    const acepto = await confirmar({
        titulo: '¿Cancelar este pedido?',
        texto: 'Solo puedes cancelarlo mientras no haya empezado a prepararse. Esta acción no se puede deshacer.',
        icon: 'warning',
        confirmText: 'Sí, cancelar pedido',
        cancelText: 'No, mantenerlo'
    });
    if (!acepto) return;

    // El administrador pudo haberlo cambiado de estado mientras decidías: se vuelve a comprobar.
    const { datos } = await obtenerPedidos();
    const pedido = datos.find(item => item.id === id);
    if (!pedido || String(pedido.estado).toLowerCase() !== 'pendiente') {
        await aviso('Ya no se puede cancelar', 'Tu pedido ya está en preparación. Puedes contactar al repartidor por WhatsApp.');
        await cargar();
        return;
    }

    actualizarEstadoPedido(id, 'Cancelado');
    toast(`Pedido #${id} cancelado.`, 'info');
    await cargar();
}

async function init() {
    iniciarNavbar();
    await cargar();

    document.getElementById('pedidoActual').addEventListener('click', evento => {
        const boton = evento.target.closest('[data-cancelar]');
        if (boton) cancelarPedido(boton.dataset.cancelar);
    });

    // Si el administrador cambia el estado desde otra pestaña, esta página se actualiza sola.
    window.addEventListener('storage', evento => {
        if (evento.key === 'saborExpressPedidos') cargar();
    });
}

document.addEventListener('DOMContentLoaded', init);
