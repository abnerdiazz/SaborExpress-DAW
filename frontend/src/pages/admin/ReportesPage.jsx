import { useCallback, useMemo, useState } from 'react';
import CajaGrafica from '../../components/reportes/CajaGrafica.jsx';
import { GraficaCategorias, GraficaEstados, GraficaPedidosDia, GraficaVentas } from '../../components/reportes/Graficas.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { useOrders } from '../../context/OrdersContext.jsx';
import { aviso, confirmar, mostrar, toast } from '../../services/alertas.js';
import { esc } from '../../services/compra.js';
import {
  categoriasACsv, contarDemo, contarPorEstado, construirSerieDiaria, dinero, eliminarDatosDemo,
  generarDatosDemo, indicadores, pedidosDelDia, pedidosEnRango, rangoActual
} from '../../services/reportes.js';

const SIN_PERSONALIZAR = null;

/** Panel de reportes: indicadores, cuatro gráficas con Chart.js, detalle por día y exportación CSV. */
export default function ReportesPage() {
  const { pedidos } = useOrders();
  const [dias, setDias] = useState(7);
  const [personalizado, setPersonalizado] = useState(SIN_PERSONALIZAR);
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [borrador, setBorrador] = useState({ inicio: '', fin: '' });
  const [errorRango, setErrorRango] = useState(false);

  const rango = useMemo(() => rangoActual({ dias, personalizado }), [dias, personalizado]);
  const vigentes = useMemo(() => pedidosEnRango(pedidos, rango), [pedidos, rango]);
  const todosEnRango = useMemo(() => pedidosEnRango(pedidos, rango, { incluirCancelados: true }), [pedidos, rango]);
  const resumen = useMemo(() => indicadores(vigentes), [vigentes]);
  const serie = useMemo(
    () => construirSerieDiaria(vigentes, rango, { etiquetaCorta: dias <= 7 && !personalizado }),
    [vigentes, rango, dias, personalizado]
  );
  const conteoEstados = useMemo(() => contarPorEstado(todosEnRango), [todosEnRango]);
  const cantidadDemo = useMemo(() => contarDemo(pedidos), [pedidos]);

  const consulta = busqueda.trim().toLowerCase();
  const topProductos = resumen.productos.slice(0, 5).filter(p => p.nombre.toLowerCase().includes(consulta));
  const categoriasVisibles = resumen.categorias.filter(c => c.categoria.toLowerCase().includes(consulta));
  const totalUnidades = resumen.productos.reduce((suma, p) => suma + p.cantidad, 0) || 1;

  const etiquetaPeriodo = personalizado
    ? `(${rango.inicio.toLocaleDateString('es-SV')} – ${rango.fin.toLocaleDateString('es-SV')})`
    : dias === 7 ? '(Esta Semana)' : '(Último Mes)';

  /** Clic en una barra de ventas: muestra los pedidos de ese día. */
  const mostrarDetalleDia = useCallback(async indice => {
    const dia = serie.dias[indice];
    if (!dia) return;
    const delDia = pedidosDelDia(vigentes, dia);
    const titulo = dia.toLocaleDateString('es-SV', { weekday: 'long', day: 'numeric', month: 'long' });
    if (!delDia.length) {
      toast(`No hubo pedidos el ${titulo}.`, 'info');
      return;
    }
    const total = delDia.reduce((suma, p) => suma + Number(p.total || 0), 0);
    const filas = delDia.map(p => `
      <tr>
        <td>#${esc(p.id)}</td>
        <td>${p.creadoEn.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}</td>
        <td>${esc(p.cliente || 'Cliente')}</td>
        <td class="text-end">${dinero(p.total)}</td>
      </tr>`).join('');
    await mostrar({
      title: titulo.charAt(0).toUpperCase() + titulo.slice(1),
      html: `
        <p class="mb-2"><strong>${delDia.length}</strong> pedido(s) · <strong>${dinero(total)}</strong> en ventas</p>
        <div style="max-height:260px;overflow:auto;text-align:left">
          <table class="table table-sm align-middle mb-0">
            <thead><tr><th>ID</th><th>Hora</th><th>Cliente</th><th class="text-end">Total</th></tr></thead>
            <tbody>${filas}</tbody>
          </table>
        </div>`,
      confirmButtonText: 'Cerrar',
      width: 560
    });
  }, [serie, vigentes]);

  function exportarCsv() {
    const blob = new Blob([categoriasACsv(resumen.categorias)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `reporte-saborexpress-${new Date().toISOString().slice(0, 10)}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
    toast('Reporte CSV descargado.');
  }

  async function generarDemo() {
    const aceptar = await confirmar({
      titulo: '¿Generar datos de demostración?',
      texto: 'Se agregarán 45 pedidos de ejemplo de los últimos 30 días. Tus pedidos reales no se modifican y podrás quitar los de ejemplo cuando quieras.',
      confirmText: 'Generar datos'
    });
    if (!aceptar) return;
    toast(`Se generaron ${generarDatosDemo(45)} pedidos de demostración.`);
  }

  async function quitarDemo() {
    const aceptar = await confirmar({
      titulo: '¿Quitar los datos de demostración?',
      texto: 'Solo se eliminarán los pedidos de ejemplo. Los pedidos reales se conservan.',
      icon: 'warning',
      confirmText: 'Sí, quitar'
    });
    if (!aceptar) return;
    toast(`Se quitaron ${eliminarDatosDemo()} pedidos de demostración.`, 'info');
  }

  function aplicarRango() {
    const { inicio, fin } = borrador;
    if (!inicio || !fin || inicio > fin) {
      setErrorRango(true);
      aviso('Rango de fechas no válido', 'Elige una fecha inicial y una final, y que la inicial no sea posterior a la final.');
      return;
    }
    setErrorRango(false);
    setPersonalizado({ inicio, fin });
    setModalAbierto(false);
  }

  function elegirDias(valor) {
    setDias(valor);
    setPersonalizado(SIN_PERSONALIZAR);
  }

  return (
    <>
      <div className="d-flex flex-column flex-md-row align-items-md-start justify-content-between gap-3 mb-4">
        <div>
          <h1 className="admin-wireframe-title">Reportes</h1>
          <p className="admin-wireframe-subtitle">Rendimiento del negocio e ingresos semanales · Calculado con los pedidos confirmados por los clientes</p>
        </div>
      </div>

      <section className="surface-card range-toolbar mb-4" aria-label="Rango de fechas">
        <strong className="me-1"><i className="bi bi-calendar3 me-2 text-secondary" />Rango de fecha:</strong>
        <button className={`range-chip${!personalizado && dias === 7 ? ' active' : ''}`} aria-pressed={!personalizado && dias === 7} type="button" onClick={() => elegirDias(7)}>Última semana</button>
        <button className={`range-chip${!personalizado && dias === 30 ? ' active' : ''}`} aria-pressed={!personalizado && dias === 30} type="button" onClick={() => elegirDias(30)}>Último mes</button>
        <div className="d-flex flex-wrap gap-2 ms-lg-auto">
          <button className="btn btn-sm btn-outline-secondary" type="button" onClick={generarDemo}>
            <i className="bi bi-magic me-1" />Datos de demostración
          </button>
          <button className="btn btn-sm btn-outline-secondary" type="button" disabled={cantidadDemo === 0} onClick={quitarDemo}>
            <i className="bi bi-trash3 me-1" />Quitar demostración
          </button>
          <button className="btn btn-sm btn-outline-dark" type="button" onClick={() => { setErrorRango(false); setModalAbierto(true); }}>
            Personalizar rango
          </button>
        </div>
      </section>

      {cantidadDemo > 0 && (
        <div className="demo-banner mb-4" role="status">
          <i className="bi bi-info-circle me-2" />
          <span>Se están mostrando {cantidadDemo} pedidos de demostración mezclados con los pedidos reales.</span>
        </div>
      )}

      <section className="row g-3 mb-4" aria-label="Indicadores clave">
        <div className="col-12 col-md-4">
          <div className="surface-card metric-card wireframe-metric-card">
            <div className="metric-label">Pedidos</div>
            <div className="metric-value" data-testid="metrica-pedidos">{resumen.cantidad.toLocaleString('es-SV')}</div>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="surface-card metric-card wireframe-metric-card">
            <div className="metric-label">Ingresos</div>
            <div className="metric-value primary" data-testid="metrica-ingresos">{dinero(resumen.ingresos)}</div>
            <div className="metric-footnote">Ticket promedio: <strong>{dinero(resumen.ticketPromedio)}</strong></div>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="surface-card metric-card wireframe-metric-card">
            <div className="metric-label">Producto top</div>
            <div className="metric-value metric-product" data-testid="metrica-top">{resumen.productoTop}</div>
          </div>
        </div>
      </section>

      <section className="surface-card report-panel wireframe-chart-panel mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <h2 className="report-panel-title mb-0">Ventas por período <span className="text-secondary fw-normal">{etiquetaPeriodo}</span></h2>
          <small className="text-secondary"><i className="bi bi-hand-index me-1" />Haz clic en una barra para ver los pedidos de ese día</small>
        </div>
        <div className="wireframe-chart-container">
          <CajaGrafica vacio={vigentes.length === 0} icono="bi-bar-chart" mensaje="Sin ventas en este período">
            <GraficaVentas etiquetas={serie.etiquetas} valores={serie.valores} onDia={mostrarDetalleDia} />
          </CajaGrafica>
        </div>
      </section>

      <section className="row g-4 mb-4">
        <div className="col-lg-7">
          <div className="surface-card report-panel h-100">
            <h2 className="report-panel-title">Pedidos por día</h2>
            <CajaGrafica vacio={vigentes.length === 0} icono="bi-graph-up" mensaje="Sin pedidos en este período">
              <GraficaPedidosDia etiquetas={serie.etiquetas} cantidades={serie.cantidades} />
            </CajaGrafica>
          </div>
        </div>
        <div className="col-lg-5">
          <div className="surface-card report-panel h-100">
            <h2 className="report-panel-title">Estado de los pedidos</h2>
            <CajaGrafica vacio={todosEnRango.length === 0} icono="bi-pie-chart" mensaje="Sin pedidos en este período">
              <GraficaEstados conteos={conteoEstados} />
            </CajaGrafica>
          </div>
        </div>
      </section>

      <section className="row g-4 mb-4">
        <div className="col-lg-5">
          <div className="surface-card report-panel h-100">
            <h2 className="report-panel-title">Ingresos por categoría</h2>
            <CajaGrafica vacio={vigentes.length === 0} icono="bi-pie-chart" mensaje="Sin ventas en este período">
              <GraficaCategorias categorias={resumen.categorias} />
            </CajaGrafica>
          </div>
        </div>
        <div className="col-lg-7">
          <div className="surface-card report-panel h-100">
            <h2 className="report-panel-title">Productos más vendidos</h2>
            {topProductos.length ? topProductos.map(producto => {
              const porcentaje = Math.round((producto.cantidad / totalUnidades) * 100);
              return (
                <div className="product-progress-row" key={producto.nombre}>
                  <div className="product-progress-label"><strong>{producto.nombre}</strong><strong>{porcentaje}%</strong></div>
                  <div className="thin-progress"><span style={{ width: `${porcentaje}%` }} /></div>
                </div>
              );
            }) : <p className="text-secondary mb-0">No hay productos para mostrar.</p>}
          </div>
        </div>
      </section>

      <section className="mb-4">
        <div className="surface-card report-panel">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <h2 className="report-panel-title mb-0">Ventas por categoría</h2>
            <div className="d-flex flex-wrap gap-2">
              <div className="search-box admin-report-search">
                <i className="bi bi-search" />
                <input
                  className="form-control form-control-sm" type="search" placeholder="Buscar categoría..."
                  aria-label="Buscar categoría" value={busqueda} onChange={e => setBusqueda(e.target.value)}
                />
              </div>
              <button className="btn btn-sm btn-outline-dark" type="button" onClick={exportarCsv}>
                <i className="bi bi-download me-1" />CSV
              </button>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table admin-table align-middle">
              <thead><tr><th>Categoría</th><th className="text-end">Cantidad</th><th className="text-end">Total</th></tr></thead>
              <tbody>
                {categoriasVisibles.map(c => (
                  <tr key={c.categoria}>
                    <td><strong>{c.categoria}</strong></td>
                    <td className="text-end text-secondary">{c.cantidad} items</td>
                    <td className="text-end fw-bold">{dinero(c.ingreso)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {categoriasVisibles.length === 0 && consulta && (
            <div className="text-center text-secondary py-4">No se encontraron categorías con ese criterio.</div>
          )}
        </div>
      </section>

      <Modal
        abierto={modalAbierto}
        titulo="Personalizar rango"
        onCerrar={() => setModalAbierto(false)}
        pie={(
          <>
            <button type="button" className="btn btn-light" onClick={() => setModalAbierto(false)}>Cancelar</button>
            <button type="button" className="btn btn-brand" onClick={aplicarRango}>Aplicar rango</button>
          </>
        )}
      >
        <div className="row g-3">
          <div className="col-6">
            <label htmlFor="reportStart" className="form-label">Desde</label>
            <input id="reportStart" className="form-control" type="date" value={borrador.inicio}
              onChange={e => setBorrador(b => ({ ...b, inicio: e.target.value }))} />
          </div>
          <div className="col-6">
            <label htmlFor="reportEnd" className="form-label">Hasta</label>
            <input id="reportEnd" className="form-control" type="date" value={borrador.fin}
              onChange={e => setBorrador(b => ({ ...b, fin: e.target.value }))} />
          </div>
        </div>
        {errorRango && <div className="alert alert-danger py-2 mt-3 mb-0" role="alert">Selecciona un rango de fechas válido.</div>}
      </Modal>
    </>
  );
}
