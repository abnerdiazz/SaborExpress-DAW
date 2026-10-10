import { obtenerPedidos, iniciarAdmin } from './saborexpress-data.js';
import { aviso, confirmar, error as alertaError, mostrar, toast } from './alertas.js';
import {
    chartDisponible,
    graficarCategorias,
    graficarEstados,
    graficarPedidosPorDia,
    graficarVentas
} from './reportes-graficas.js';
import { contarDemo, eliminarDatosDemo, generarDatosDemo } from './reportes-demo.js';

const state = {
    pedidos: [],
    rango: 7,
    inicioPersonalizado: null,
    finPersonalizado: null,
    busqueda: '',
    dias: [] // fechas de la serie de ventas actual (para el detalle al hacer clic en una barra)
};

const ESTADOS = ['Pendiente', 'Preparando', 'En camino', 'Entregado', 'Cancelado'];

const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));

function inicioDia(date) {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
}

function finDia(date) {
    const copy = new Date(date);
    copy.setHours(23, 59, 59, 999);
    return copy;
}

function rangoActual() {
    if (state.inicioPersonalizado && state.finPersonalizado) {
        return {
            inicio: inicioDia(new Date(`${state.inicioPersonalizado}T00:00:00`)),
            fin: finDia(new Date(`${state.finPersonalizado}T00:00:00`))
        };
    }
    const fin = finDia(new Date());
    const inicio = inicioDia(new Date());
    inicio.setDate(inicio.getDate() - state.rango + 1);
    return { inicio, fin };
}

/** Pedidos dentro del rango. Las ventas no cuentan los cancelados; el gráfico de estados sí. */
function pedidosEnRango({ incluirCancelados = false } = {}) {
    const { inicio, fin } = rangoActual();
    return state.pedidos.filter(pedido => {
        const fecha = new Date(pedido.creadoEn);
        const cancelado = String(pedido.estado).toLowerCase() === 'cancelado';
        return fecha >= inicio && fecha <= fin && (incluirCancelados || !cancelado);
    });
}

function normalizarEstado(valor) {
    const texto = String(valor || '').toLowerCase();
    if (texto.startsWith('prepar') || texto === 'en preparación') return 'Preparando';
    if (texto === 'en camino') return 'En camino';
    if (texto === 'entregado') return 'Entregado';
    if (texto === 'cancelado') return 'Cancelado';
    return 'Pendiente';
}

function contarPorEstado(pedidos) {
    const conteos = Object.fromEntries(ESTADOS.map(estado => [estado, 0]));
    pedidos.forEach(pedido => { conteos[normalizarEstado(pedido.estado)] += 1; });
    return conteos;
}

function agrupar(pedidos) {
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
function construirSerieDiaria(pedidos) {
    const { inicio, fin } = rangoActual();
    const etiquetas = [];
    const valores = [];
    const cantidades = [];
    const dias = [];
    const cursor = new Date(inicio);
    const formatoCorto = state.rango <= 7 && !state.inicioPersonalizado ? { weekday: 'short' } : { day: '2-digit', month: 'short' };

    while (cursor <= fin) {
        const dayStart = inicioDia(cursor);
        const dayEnd = finDia(cursor);
        const delDia = pedidos.filter(pedido => pedido.creadoEn >= dayStart && pedido.creadoEn <= dayEnd);
        etiquetas.push(cursor.toLocaleDateString('es-SV', formatoCorto).replace('.', ''));
        valores.push(Number(delDia.reduce((sum, pedido) => sum + Number(pedido.total || 0), 0).toFixed(2)));
        cantidades.push(delDia.length);
        dias.push(new Date(dayStart));
        cursor.setDate(cursor.getDate() + 1);
    }
    return { etiquetas, valores, cantidades, dias };
}

function renderProductos(productos) {
    const container = document.getElementById('topProducts');
    const totalUnidades = productos.reduce((sum, p) => sum + p.cantidad, 0) || 1;
    const top = productos.slice(0, 5).filter(producto => producto.nombre.toLowerCase().includes(state.busqueda.toLowerCase()));

    container.innerHTML = top.length ? top.map(producto => {
        const porcentaje = Math.round((producto.cantidad / totalUnidades) * 100);
        return `
        <div class="product-progress-row">
            <div class="product-progress-label">
                <strong>${esc(producto.nombre)}</strong>
                <strong>${porcentaje}%</strong>
            </div>
            <div class="thin-progress"><span style="width:${porcentaje}%"></span></div>
        </div>`;
    }).join('') : '<p class="text-secondary mb-0">No hay productos para mostrar.</p>';
}

function renderCategorias(categorias) {
    const tbody = document.getElementById('categorySalesBody');
    const query = state.busqueda.toLowerCase();
    const visibles = categorias.filter(item => item.categoria.toLowerCase().includes(query));
    tbody.innerHTML = visibles.map(item => `
        <tr>
            <td><strong>${esc(item.categoria)}</strong></td>
            <td class="text-end text-secondary">${item.cantidad} items</td>
            <td class="text-end fw-bold">${money(item.ingreso)}</td>
        </tr>`).join('');
    document.getElementById('reportNoResults').classList.toggle('d-none', visibles.length !== 0 || !query);
}

function actualizarBannerDemo() {
    const cantidad = contarDemo();
    document.getElementById('demoBanner')?.classList.toggle('d-none', cantidad === 0);
    const texto = document.getElementById('demoBannerTexto');
    if (texto) texto.textContent = `Se están mostrando ${cantidad} pedidos de demostración mezclados con los pedidos reales.`;
    const quitar = document.getElementById('btnDemoQuitar');
    if (quitar) quitar.disabled = cantidad === 0;
}

function render() {
    const pedidos = pedidosEnRango();
    const ingresos = pedidos.reduce((sum, pedido) => sum + Number(pedido.total || 0), 0);
    const { productos, categorias } = agrupar(pedidos);

    document.getElementById('metricOrders').textContent = pedidos.length.toLocaleString('es-SV');
    document.getElementById('metricRevenue').textContent = money(ingresos);
    document.getElementById('metricAverage').textContent = money(pedidos.length ? ingresos / pedidos.length : 0);
    document.getElementById('metricTopProduct').textContent = productos[0]?.nombre || '—';

    const { inicio, fin } = rangoActual();
    document.getElementById('salesPeriodLabel').textContent = state.inicioPersonalizado
        ? `(${inicio.toLocaleDateString('es-SV')} – ${fin.toLocaleDateString('es-SV')})`
        : state.rango === 7 ? '(Esta Semana)' : '(Último Mes)';

    // Mensaje "sin datos" sobre cada gráfica que corresponda.
    const todosEnRango = pedidosEnRango({ incluirCancelados: true });
    document.querySelectorAll('[data-empty="pedidos"]').forEach(nodo => nodo.classList.toggle('d-none', pedidos.length > 0));
    document.querySelectorAll('[data-empty="estados"]').forEach(nodo => nodo.classList.toggle('d-none', todosEnRango.length > 0));

    if (chartDisponible()) {
        const serie = construirSerieDiaria(pedidos);
        state.dias = serie.dias;
        graficarVentas(document.getElementById('ventasChart'), { etiquetas: serie.etiquetas, valores: serie.valores }, mostrarDetalleDia);
        graficarPedidosPorDia(document.getElementById('pedidosDiaChart'), { etiquetas: serie.etiquetas, cantidades: serie.cantidades });
        graficarCategorias(document.getElementById('categoriasChart'), categorias);
        graficarEstados(document.getElementById('estadosChart'), contarPorEstado(todosEnRango));
    }

    renderProductos(productos);
    renderCategorias(categorias);
    actualizarBannerDemo();
}

/** Clic en una barra de ventas: muestra los pedidos de ese día. */
async function mostrarDetalleDia(indice) {
    const dia = state.dias[indice];
    if (!dia) return;
    const inicio = inicioDia(dia);
    const fin = finDia(dia);
    const delDia = pedidosEnRango().filter(pedido => pedido.creadoEn >= inicio && pedido.creadoEn <= fin);
    const titulo = dia.toLocaleDateString('es-SV', { weekday: 'long', day: 'numeric', month: 'long' });

    if (!delDia.length) {
        toast(`No hubo pedidos el ${titulo}.`, 'info');
        return;
    }

    const total = delDia.reduce((sum, pedido) => sum + Number(pedido.total || 0), 0);
    const filas = delDia
        .sort((a, b) => a.creadoEn - b.creadoEn)
        .map(pedido => `
            <tr>
                <td>#${esc(pedido.id)}</td>
                <td>${pedido.creadoEn.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}</td>
                <td>${esc(pedido.cliente || 'Cliente')}</td>
                <td class="text-end">${money(pedido.total)}</td>
            </tr>`).join('');

    await mostrar({
        title: titulo.charAt(0).toUpperCase() + titulo.slice(1),
        html: `
            <p class="mb-2"><strong>${delDia.length}</strong> pedido(s) · <strong>${money(total)}</strong> en ventas</p>
            <div style="max-height:260px;overflow:auto;text-align:left">
                <table class="table table-sm align-middle mb-0">
                    <thead><tr><th>ID</th><th>Hora</th><th>Cliente</th><th class="text-end">Total</th></tr></thead>
                    <tbody>${filas}</tbody>
                </table>
            </div>`,
        confirmButtonText: 'Cerrar',
        width: 560
    });
}

function exportarCsv() {
    const pedidos = pedidosEnRango();
    const { categorias } = agrupar(pedidos);
    const rows = [['Categoría', 'Ordenado (cant.)', 'Total recaudado'], ...categorias.map(item => [item.categoria, item.cantidad, item.ingreso.toFixed(2)])];
    const csv = rows.map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte-saborexpress-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast('Reporte CSV descargado.');
}

async function recargarPedidos() {
    const { datos } = await obtenerPedidos();
    state.pedidos = datos;
    render();
}

async function generarDemo() {
    const aceptar = await confirmar({
        titulo: '¿Generar datos de demostración?',
        texto: 'Se agregarán 45 pedidos de ejemplo de los últimos 30 días. Tus pedidos reales no se modifican y podrás quitar los de ejemplo cuando quieras.',
        confirmText: 'Generar datos'
    });
    if (!aceptar) return;
    const creados = generarDatosDemo(45);
    await recargarPedidos();
    toast(`Se generaron ${creados} pedidos de demostración.`);
}

async function quitarDemo() {
    const aceptar = await confirmar({
        titulo: '¿Quitar los datos de demostración?',
        texto: 'Solo se eliminarán los pedidos de ejemplo. Los pedidos reales se conservan.',
        icon: 'warning',
        confirmText: 'Sí, quitar'
    });
    if (!aceptar) return;
    const quitados = eliminarDatosDemo();
    await recargarPedidos();
    toast(`Se quitaron ${quitados} pedidos de demostración.`, 'info');
}

async function init() {
    if (!iniciarAdmin('admin-reportes.html')) return;

    if (!chartDisponible()) {
        await alertaError('No se pudieron cargar las gráficas', 'Revisa tu conexión a internet y recarga la página.');
    }

    try {
        const { datos, origen } = await obtenerPedidos();
        state.pedidos = datos;
        console.info(`Fuente de reportes: ${origen}`);
        render();
    } catch (error) {
        console.error(error);
        await alertaError('No se pudieron leer los pedidos', 'Revisa el almacenamiento del navegador.');
    }

    document.querySelectorAll('[data-range]').forEach(button => button.addEventListener('click', () => {
        document.querySelectorAll('[data-range]').forEach(item => item.classList.remove('active'));
        button.classList.add('active');
        state.rango = Number(button.dataset.range);
        state.inicioPersonalizado = null;
        state.finPersonalizado = null;
        render();
    }));

    document.getElementById('applyCustomRange').addEventListener('click', () => {
        const inicio = document.getElementById('reportStart').value;
        const fin = document.getElementById('reportEnd').value;
        const feedback = document.getElementById('rangeFeedback');
        if (!inicio || !fin || inicio > fin) {
            feedback.classList.remove('d-none');
            aviso('Rango de fechas no válido', 'Elige una fecha inicial y una final, y que la inicial no sea posterior a la final.');
            return;
        }
        feedback.classList.add('d-none');
        state.inicioPersonalizado = inicio;
        state.finPersonalizado = fin;
        document.querySelectorAll('[data-range]').forEach(item => item.classList.remove('active'));
        bootstrap.Modal.getOrCreateInstance(document.getElementById('customRangeModal')).hide();
        render();
    });

    document.getElementById('reportSearch').addEventListener('input', event => {
        state.busqueda = event.target.value.trim();
        render();
    });
    document.getElementById('exportReportCsv').addEventListener('click', exportarCsv);
    document.getElementById('btnDemoGenerar')?.addEventListener('click', generarDemo);
    document.getElementById('btnDemoQuitar')?.addEventListener('click', quitarDemo);

    // Si se confirma un pedido en otra pestaña, el reporte se actualiza solo.
    window.addEventListener('storage', evento => {
        if (evento.key === 'saborExpressPedidos') recargarPedidos();
    });
}

document.addEventListener('DOMContentLoaded', init);
