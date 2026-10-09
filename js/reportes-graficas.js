/**
 * reportes-graficas.js
 * ---------------------------------------------------------------------------
 * Gráficas del panel de reportes, hechas con Chart.js 4.
 *
 * Cada función crea la gráfica la primera vez y, en las siguientes llamadas
 * (por ejemplo al cambiar el rango de fechas), solo actualiza sus datos: así
 * Chart.js anima la transición en lugar de redibujar todo desde cero.
 * ---------------------------------------------------------------------------
 */

const PALETA = ['#CE4B31', '#4F7058', '#E2A33B', '#746F69', '#B83D27', '#9CB8A0'];

export const COLORES_ESTADO = {
    Pendiente: '#E2A33B',
    Preparando: '#CE4B31',
    'En camino': '#746F69',
    Entregado: '#4F7058',
    Cancelado: '#B0A8A0'
};

const dinero = valor => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(valor || 0));

const graficas = {};

export const chartDisponible = () => typeof window.Chart !== 'undefined';

/** Crea la gráfica o, si ya existe sobre ese canvas, actualiza sus datos. */
function upsert(clave, canvas, config) {
    const existente = graficas[clave];
    if (existente && existente.canvas === canvas) {
        existente.data.labels = config.data.labels;
        existente.data.datasets = config.data.datasets;
        existente.update();
        return existente;
    }
    graficas[clave] = new window.Chart(canvas, config);
    return graficas[clave];
}

/** Barras: ventas en dólares por día. Al hacer clic en una barra se avisa con el índice del día. */
export function graficarVentas(canvas, { etiquetas, valores }, alClicDia) {
    return upsert('ventas', canvas, {
        type: 'bar',
        data: {
            labels: etiquetas,
            datasets: [{ label: 'Ventas', data: valores, backgroundColor: '#CE4B31', borderRadius: 5, maxBarThickness: 30 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            onClick: (_evento, elementos) => {
                if (elementos.length && alClicDia) alClicDia(elementos[0].index);
            },
            onHover: (evento, elementos) => {
                evento.native.target.style.cursor = elementos.length ? 'pointer' : 'default';
            },
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: contexto => dinero(contexto.raw), footer: () => 'Clic para ver el detalle' } }
            },
            scales: {
                x: { grid: { display: false }, border: { display: false } },
                y: { beginAtZero: true, ticks: { callback: valor => `$${valor}` }, grid: { color: '#F0E9DF' }, border: { display: false } }
            }
        }
    });
}

/** Línea: cantidad de pedidos por día. */
export function graficarPedidosPorDia(canvas, { etiquetas, cantidades }) {
    return upsert('pedidosDia', canvas, {
        type: 'line',
        data: {
            labels: etiquetas,
            datasets: [{
                label: 'Pedidos',
                data: cantidades,
                borderColor: '#4F7058',
                backgroundColor: 'rgba(79, 112, 88, 0.15)',
                fill: true,
                tension: 0.35,
                pointRadius: 3,
                pointBackgroundColor: '#4F7058'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, border: { display: false } },
                y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#F0E9DF' }, border: { display: false } }
            }
        }
    });
}

function opcionesDona(formatoEtiqueta) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true } },
            tooltip: { callbacks: { label: formatoEtiqueta } }
        }
    };
}

/** Dona: ingresos por categoría. `categorias` = [{ categoria, ingreso }]. */
export function graficarCategorias(canvas, categorias) {
    const total = categorias.reduce((suma, c) => suma + c.ingreso, 0) || 1;
    return upsert('categorias', canvas, {
        type: 'doughnut',
        data: {
            labels: categorias.map(c => c.categoria),
            datasets: [{ data: categorias.map(c => Number(c.ingreso.toFixed(2))), backgroundColor: categorias.map((_, i) => PALETA[i % PALETA.length]), borderWidth: 2, borderColor: '#fff' }]
        },
        options: opcionesDona(contexto => `${contexto.label}: ${dinero(contexto.raw)} (${Math.round((contexto.raw / total) * 100)}%)`)
    });
}

/** Dona: cantidad de pedidos por estado. `conteos` = { Pendiente: 3, ... }. */
export function graficarEstados(canvas, conteos) {
    const nombres = Object.keys(conteos).filter(nombre => conteos[nombre] > 0);
    const total = nombres.reduce((suma, nombre) => suma + conteos[nombre], 0) || 1;
    return upsert('estados', canvas, {
        type: 'doughnut',
        data: {
            labels: nombres,
            datasets: [{ data: nombres.map(nombre => conteos[nombre]), backgroundColor: nombres.map(nombre => COLORES_ESTADO[nombre] || '#B0A8A0'), borderWidth: 2, borderColor: '#fff' }]
        },
        options: opcionesDona(contexto => `${contexto.label}: ${contexto.raw} pedido(s) (${Math.round((contexto.raw / total) * 100)}%)`)
    });
}
