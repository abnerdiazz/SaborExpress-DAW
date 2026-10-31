import { useEffect, useMemo, useRef, useState } from 'react';
import Pagination from '../../components/ui/Pagination.jsx';
import { useOrders } from '../../context/OrdersContext.jsx';
import { usePaginacion } from '../../hooks/usePaginacion.js';
import { confirmar, error as alertaError, toast } from '../../services/alertas.js';
import { money } from '../../services/compra.js';
import { EMAIL_DEMO, ESTADOS, ESTADOS_FINALES, claveFiltroEstado } from '../../services/pedidos.js';

const POR_PAGINA = 10;
const FILTROS = [['todos', 'Todos'], ['pendiente', 'Pendiente'], ['preparando', 'Preparando'], ['entregado', 'Entregado'], ['cancelado', 'Cancelado']];

/** Panel de pedidos: filtro por estado, búsqueda, paginación y cambio de estado (los finales piden confirmación). */
export default function PedidosPage() {
  const { pedidos, actualizarEstado } = useOrders();
  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  const filtrados = useMemo(() => {
    const consulta = busqueda.trim().toLowerCase();
    return pedidos.filter(p =>
      (filtro === 'todos' || claveFiltroEstado(p.estado) === filtro) &&
      `${p.id} ${p.cliente}`.toLowerCase().includes(consulta)
    );
  }, [pedidos, filtro, busqueda]);

  const { pagina, setPagina, paginas, visibles } = usePaginacion(filtrados, POR_PAGINA);

  // Si entra un pedido nuevo (de otra pestaña) se avisa sin recargar.
  const cantidadPrevia = useRef(null);
  useEffect(() => {
    if (cantidadPrevia.current !== null && pedidos.length > cantidadPrevia.current) {
      toast('Llegó un nuevo pedido.', 'info', 3000);
    }
    cantidadPrevia.current = pedidos.length;
  }, [pedidos.length]);

  /** Cambia el estado de un pedido. Los estados finales piden confirmación porque ya no se pueden revertir. */
  async function cambiarEstado(pedido, nuevo) {
    if (pedido.estado === nuevo) return;
    if (ESTADOS_FINALES.includes(nuevo)) {
      const acepto = await confirmar({
        titulo: `¿Marcar el pedido #${pedido.id} como ${nuevo}?`,
        texto: 'Es un estado final: después ya no podrás cambiarlo.',
        icon: nuevo === 'Cancelado' ? 'warning' : 'question',
        confirmText: `Sí, marcar como ${nuevo}`
      });
      if (!acepto) return;
    }
    if (!actualizarEstado(pedido.id, nuevo)) {
      await alertaError('No se pudo actualizar', 'No encontramos ese pedido. Recarga la página e inténtalo de nuevo.');
      return;
    }
    toast(`Pedido #${pedido.id}: ${nuevo}`);
  }

  return (
    <>
      <div className="d-flex flex-column flex-md-row align-items-md-start justify-content-between gap-3 mb-4">
        <div>
          <h1 className="admin-wireframe-title">Pedidos</h1>
          <p className="admin-wireframe-subtitle">Lista de transacciones y estados de órdenes activas.</p>
        </div>
      </div>

      <section className="surface-card range-toolbar mb-4" aria-label="Filtro de pedidos">
        <strong className="me-1"><i className="bi bi-funnel me-2 text-secondary" />Filtrar por estado:</strong>
        {FILTROS.map(([clave, texto]) => (
          <button key={clave} className={`range-chip${filtro === clave ? ' active' : ''}`} aria-pressed={filtro === clave} type="button"
            onClick={() => { setFiltro(clave); setPagina(1); }}>{texto}</button>
        ))}
        <div className="search-box admin-report-search ms-lg-auto">
          <i className="bi bi-search" />
          <input className="form-control form-control-sm" type="search" placeholder="Buscar cliente o ID..." aria-label="Buscar pedido"
            value={busqueda} onChange={e => { setBusqueda(e.target.value); setPagina(1); }} />
        </div>
      </section>

      <section className="surface-card report-panel wireframe-chart-panel">
        <div className="table-responsive">
          <table className="table admin-table align-middle">
            <thead>
              <tr><th>ID</th><th>Fecha</th><th>Cliente</th><th>Productos</th><th className="text-end">Total</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {visibles.map(pedido => {
                const final = ESTADOS_FINALES.includes(pedido.estado);
                return (
                  <tr key={pedido.id}>
                    <td>#{pedido.id}</td>
                    <td>{pedido.creadoEn.toLocaleDateString('es-SV')} {pedido.creadoEn.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>
                      {pedido.cliente || 'Cliente web'}
                      {pedido.email === EMAIL_DEMO && <> <span className="badge text-bg-secondary">demo</span></>}
                      <br /><small className="text-secondary">{pedido.telefono}</small>
                    </td>
                    <td className="small">{pedido.items.map(item => `${item.cantidad}× ${item.nombre}`).join(', ')}</td>
                    <td className="text-end">{money(pedido.total)}</td>
                    <td>
                      <select
                        className="form-select form-select-sm"
                        aria-label={`Estado del pedido ${pedido.id}`}
                        value={pedido.estado}
                        disabled={final}
                        title={final ? 'Estado final: ya no se puede cambiar' : undefined}
                        onChange={evento => cambiarEstado(pedido, evento.target.value)}
                      >
                        {ESTADOS.map(estado => <option key={estado} value={estado}>{estado}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtrados.length === 0 && (
          <div className="text-center text-secondary py-4">
            {pedidos.length
              ? 'No se encontraron pedidos con ese criterio.'
              : 'Aún no hay pedidos. Aparecerán aquí cuando un cliente confirme uno desde el checkout.'}
          </div>
        )}
        <Pagination pagina={pagina} paginas={paginas} onCambiar={setPagina} etiqueta="Paginación de pedidos" />
      </section>
    </>
  );
}
