import { useMemo } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import './registrarChart.js';
import { COLORES_ESTADO, PALETA, dinero } from '../../services/reportes.js';

const EJES_BASE = {
  x: { grid: { display: false }, border: { display: false } }
};

/** Barras: ventas en dólares por día. Un clic en una barra avisa con el índice del día. */
export function GraficaVentas({ etiquetas, valores, onDia }) {
  const datos = useMemo(() => ({
    labels: etiquetas,
    datasets: [{ label: 'Ventas', data: valores, backgroundColor: '#CE4B31', borderRadius: 5, maxBarThickness: 30 }]
  }), [etiquetas, valores]);

  const opciones = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    onClick: (_evento, elementos) => { if (elementos.length && onDia) onDia(elementos[0].index); },
    onHover: (evento, elementos) => {
      if (evento.native?.target) evento.native.target.style.cursor = elementos.length ? 'pointer' : 'default';
    },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: contexto => dinero(contexto.raw), footer: () => 'Clic para ver el detalle' } }
    },
    scales: {
      ...EJES_BASE,
      y: { beginAtZero: true, ticks: { callback: valor => `$${valor}` }, grid: { color: '#F0E9DF' }, border: { display: false } }
    }
  }), [onDia]);

  return <Bar data={datos} options={opciones} aria-label="Gráfica de ventas por día" role="img" />;
}

/** Línea: cantidad de pedidos por día. */
export function GraficaPedidosDia({ etiquetas, cantidades }) {
  const datos = useMemo(() => ({
    labels: etiquetas,
    datasets: [{
      label: 'Pedidos', data: cantidades, borderColor: '#4F7058', backgroundColor: 'rgba(79, 112, 88, 0.15)',
      fill: true, tension: 0.35, pointRadius: 3, pointBackgroundColor: '#4F7058'
    }]
  }), [etiquetas, cantidades]);

  const opciones = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { ...EJES_BASE, y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#F0E9DF' }, border: { display: false } } }
  }), []);

  return <Line data={datos} options={opciones} aria-label="Gráfica de línea con la cantidad de pedidos por día" role="img" />;
}

const opcionesDona = formatoEtiqueta => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '62%',
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true } },
    tooltip: { callbacks: { label: formatoEtiqueta } }
  }
});

/** Dona: ingresos por categoría. `categorias` = [{ categoria, ingreso }]. */
export function GraficaCategorias({ categorias }) {
  const total = categorias.reduce((suma, c) => suma + c.ingreso, 0) || 1;
  const datos = useMemo(() => ({
    labels: categorias.map(c => c.categoria),
    datasets: [{
      data: categorias.map(c => Number(c.ingreso.toFixed(2))),
      backgroundColor: categorias.map((_, i) => PALETA[i % PALETA.length]),
      borderWidth: 2, borderColor: '#fff'
    }]
  }), [categorias]);
  const opciones = useMemo(
    () => opcionesDona(c => `${c.label}: ${dinero(c.raw)} (${Math.round((c.raw / total) * 100)}%)`),
    [total]
  );
  return <Doughnut data={datos} options={opciones} aria-label="Gráfica de dona con los ingresos por categoría" role="img" />;
}

/** Dona: cantidad de pedidos por estado. `conteos` = { Pendiente: 3, ... }. */
export function GraficaEstados({ conteos }) {
  const nombres = Object.keys(conteos).filter(nombre => conteos[nombre] > 0);
  const total = nombres.reduce((suma, nombre) => suma + conteos[nombre], 0) || 1;
  const datos = useMemo(() => ({
    labels: nombres,
    datasets: [{
      data: nombres.map(n => conteos[n]),
      backgroundColor: nombres.map(n => COLORES_ESTADO[n] || '#B0A8A0'),
      borderWidth: 2, borderColor: '#fff'
    }]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [conteos]);
  const opciones = useMemo(
    () => opcionesDona(c => `${c.label}: ${c.raw} pedido(s) (${Math.round((c.raw / total) * 100)}%)`),
    [total]
  );
  return <Doughnut data={datos} options={opciones} aria-label="Gráfica de dona con los pedidos por estado" role="img" />;
}
