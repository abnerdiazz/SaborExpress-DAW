import { obtenerPedidos, iniciarAdmin, actualizarEstadoPedido } from './saborexpress-data.js';
import { confirmar, toast, error as alertaError } from './alertas.js';

const ESTADOS = ['Pendiente', 'Preparando', 'En camino', 'Entregado', 'Cancelado'];
// Regla de negocio: Entregado y Cancelado son estados finales y ya no se pueden cambiar.
const ESTADOS_FINALES = ['Entregado', 'Cancelado'];
const POR_PAGINA = 10;
const EMAIL_DEMO = 'demo@saborexpress.com'; // pedidos de ejemplo generados desde Reportes

const state = { pedidos: [], estado: 'todos', busqueda: '', pagina: 1 };

const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));

// Agrupa los estados en las etiquetas de los filtros del panel.
function claveEstado(estado) {
    const valor = String(estado || '').toLowerCase();
    if (valor.includes('entreg')) return 'entregado';
    if (valor.includes('cancel')) return 'cancelado';
    if (valor.includes('camino') || valor.includes('prepara')) return 'preparando';
    return 'pendiente';
}

function pedidosFiltrados() {
    const query = state.busqueda.toLowerCase();
    return state.pedidos.filter(pedido => {
        const coincideEstado = state.estado === 'todos' || claveEstado(pedido.estado) === state.estado;
        return coincideEstado && `${pedido.id} ${pedido.cliente}`.toLowerCase().includes(query);
    });
}

function renderPaginacion(total) {
    const ul = document.getElementById('pedidosPagination');
    if (!ul) return;
    const paginas = Math.ceil(total / POR_PAGINA);
    ul.innerHTML = '';
    if (paginas <= 1) return;

    const prevDisabled = state.pagina === 1 ? 'disabled' : '';
    ul.insertAdjacentHTML('beforeend', `<li class="page-item ${prevDisabled}"><button class="page-link" data-page="${state.pagina - 1}" aria-label="Página anterior"><i class="bi bi-chevron-left"></i></button></li>`);
    for (let page = 1; page <= paginas; page += 1) {
        ul.insertAdjacentHTML('beforeend', `<li class="page-item ${page === state.pagina ? 'active' : ''}"><button class="page-link" data-page="${page}">${page}</button></li>`);
    }
    const nextDisabled = state.pagina === paginas ? 'disabled' : '';
    ul.insertAdjacentHTML('beforeend', `<li class="page-item ${nextDisabled}"><button class="page-link" data-page="${state.pagina + 1}" aria-label="Página siguiente"><i class="bi bi-chevron-right"></i></button></li>`);
}

function render() {
    const visibles = pedidosFiltrados();
    const paginas = Math.max(1, Math.ceil(visibles.length / POR_PAGINA));
    if (state.pagina > paginas) state.pagina = paginas;
    const inicio = (state.pagina - 1) * POR_PAGINA;
    const pagina = visibles.slice(inicio, inicio + POR_PAGINA);

    document.getElementById('pedidosBody').innerHTML = pagina.map(pedido => {
        const final = ESTADOS_FINALES.includes(pedido.estado);
        const opciones = ESTADOS.map(estado => `<option ${estado === pedido.estado ? 'selected' : ''}>${estado}</option>`).join('');
        const productos = pedido.items.map(item => `${item.cantidad}× ${esc(item.nombre)}`).join(', ');
        const etiquetaDemo = pedido.email === EMAIL_DEMO ? ' <span class="badge text-bg-secondary">demo</span>' : '';
        return `
        <tr>
            <td>#${esc(pedido.id)}</td>
            <td>${pedido.creadoEn.toLocaleDateString('es-SV')} ${pedido.creadoEn.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}</td>
            <td>${esc(pedido.cliente || 'Cliente web')}${etiquetaDemo}<br><small class="text-secondary">${esc(pedido.telefono)}</small></td>
            <td class="small">${productos}</td>
            <td class="text-end">${money(pedido.total)}</td>
            <td><select class="form-select form-select-sm" data-estado-id="${esc(pedido.id)}" aria-label="Estado del pedido ${esc(pedido.id)}" ${final ? 'disabled title="Estado final: ya no se puede cambiar"' : ''}>${opciones}</select></td>
        </tr>`;
    }).join('');

    const aviso = document.getElementById('pedidosNoResults');
    aviso.textContent = state.pedidos.length
        ? 'No se encontraron pedidos con ese criterio.'
        : 'Aún no hay pedidos. Aparecerán aquí cuando un cliente confirme uno desde el checkout.';
    aviso.classList.toggle('d-none', visibles.length !== 0);

    renderPaginacion(visibles.length);
}

/** Cambia el estado de un pedido. Los estados finales piden confirmación. */
async function cambiarEstado(select) {
    const id = select.dataset.estadoId;
    const nuevo = select.value;
    const pedido = state.pedidos.find(item => item.id === id);
    if (!pedido || pedido.estado === nuevo) return;
    const anterior = pedido.estado;

    if (ESTADOS_FINALES.includes(nuevo)) {
        const acepto = await confirmar({
            titulo: `¿Marcar el pedido #${id} como ${nuevo}?`,
            texto: 'Es un estado final: después ya no podrás cambiarlo.',
            icon: nuevo === 'Cancelado' ? 'warning' : 'question',
            confirmText: `Sí, marcar como ${nuevo}`
        });
        if (!acepto) {
            select.value = anterior;
            return;
        }
    }

    if (!actualizarEstadoPedido(id, nuevo)) {
        select.value = anterior;
        await alertaError('No se pudo actualizar', 'No encontramos ese pedido. Recarga la página e inténtalo de nuevo.');
        return;
    }
    pedido.estado = nuevo;
    toast(`Pedido #${id}: ${nuevo}`);
    render();
}

async function recargar() {
    const cantidadAnterior = state.pedidos.length;
    state.pedidos = (await obtenerPedidos()).datos;
    if (state.pedidos.length > cantidadAnterior) toast('Llegó un nuevo pedido.', 'info', 3000);
    render();
}

async function init() {
    if (!iniciarAdmin('admin-pedidos.html')) return;

    try {
        state.pedidos = (await obtenerPedidos()).datos;
        render();
    } catch (error) {
        console.error(error);
        await alertaError('No se pudieron leer los pedidos', 'Revisa el almacenamiento del navegador.');
    }

    document.querySelectorAll('[data-status]').forEach(button => button.addEventListener('click', () => {
        document.querySelectorAll('[data-status]').forEach(item => item.classList.remove('active'));
        button.classList.add('active');
        state.estado = button.dataset.status;
        state.pagina = 1;
        render();
    }));

    document.getElementById('pedidosSearch').addEventListener('input', event => {
        state.busqueda = event.target.value.trim();
        state.pagina = 1;
        render();
    });

    document.getElementById('pedidosPagination')?.addEventListener('click', event => {
        const boton = event.target.closest('[data-page]');
        if (!boton || boton.closest('.disabled')) return;
        state.pagina = Number(boton.dataset.page);
        render();
    });

    // Cambiar el estado de un pedido (se refleja en Mis Pedidos del cliente)
    document.getElementById('pedidosBody').addEventListener('change', event => {
        const select = event.target.closest('[data-estado-id]');
        if (select) cambiarEstado(select);
    });

    // Cuando un cliente confirma un pedido en otra pestaña, aparece aquí sin recargar.
    window.addEventListener('storage', evento => {
        if (evento.key === 'saborExpressPedidos') recargar();
    });
}

document.addEventListener('DOMContentLoaded', init);
