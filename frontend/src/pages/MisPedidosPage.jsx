import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import OrderTimeline from '../components/cuenta/OrderTimeline.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useOrders } from '../context/OrdersContext.jsx';
import { aviso, confirmar, toast } from '../services/alertas.js';
import { money } from '../services/compra.js';

const hora = fecha => fecha.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' });
const FINALES = ['entregado', 'cancelado'];

function TarjetaPedido({ pedido, onCancelar }) {
  const desde = new Date(pedido.creadoEn.getTime() + 30 * 60000);
  const hasta = new Date(pedido.creadoEn.getTime() + 45 * 60000);
  const mensaje = encodeURIComponent(`Hola, quiero consultar sobre mi pedido #${pedido.id}`);
  return (
    <div className="surface-card p-4 mb-4" style={{ boxShadow: 'var(--se-shadow)' }}>
      <div className="order-header">
        <span className="order-number">ORDEN: #{pedido.id}</span>
        <span className="order-total">Total: {money(pedido.total)}</span>
      </div>
      <p className="order-meta">
        Fecha: {pedido.creadoEn.toLocaleDateString('es-SV')}, {hora(pedido.creadoEn)} &nbsp;·&nbsp; Pago: {pedido.pago}
      </p>
      <OrderTimeline estado={pedido.estado} />
      <div className="eta-box">
        <p className="eta-label mb-0">Estimación de llegada</p>
        <p className="eta-time mb-0">{hora(desde)} – {hora(hasta)}</p>
        <p className="eta-note">El tiempo aproximado varía según la demanda de la cocina.</p>
      </div>
      <a href={`https://wa.me/50322000000?text=${mensaje}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline-brand w-100">
        <i className="bi bi-whatsapp me-1" /> Contactar repartidor vía WhatsApp
      </a>
      {String(pedido.estado).toLowerCase() === 'pendiente' && (
        <button type="button" className="btn btn-outline-danger w-100 mt-2" onClick={() => onCancelar(pedido.id)}>
          <i className="bi bi-x-circle me-1" /> Cancelar pedido
        </button>
      )}
    </div>
  );
}

/** Seguimiento del pedido en curso e historial del cliente. Se actualiza solo cuando el administrador cambia un estado. */
export default function MisPedidosPage() {
  const { sesion } = useAuth();
  const { pedidos, actualizarEstado, buscarPedido } = useOrders();

  const propios = useMemo(
    () => (sesion ? pedidos.filter(p => p.email === sesion.email.toLowerCase()) : []),
    [pedidos, sesion]
  );
  const enCurso = propios.find(p => !FINALES.includes(String(p.estado).toLowerCase()));

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
    const actual = buscarPedido(id);
    if (!actual || String(actual.estado).toLowerCase() !== 'pendiente') {
      await aviso('Ya no se puede cancelar', 'Tu pedido ya está en preparación. Puedes contactar al repartidor por WhatsApp.');
      return;
    }
    actualizarEstado(id, 'Cancelado');
    toast(`Pedido #${id} cancelado.`, 'info');
  }

  return (
    <div className="container">
      <div className="orders-wrap">
        <section className="pt-2 pb-4">
          <h1 className="page-title mb-4">Pedido en Curso</h1>
          {!sesion ? (
            <EmptyState icono="bi-receipt" titulo="Inicia sesión para ver tus pedidos" texto="Necesitas una cuenta para hacer y seguir tus pedidos." className="mb-4">
              <div className="mt-3">
                <Link to="/login?redirect=%2Fmis-pedidos" className="btn btn-brand me-2">Iniciar sesión</Link>
                <Link to="/registro?redirect=%2Fmis-pedidos" className="btn btn-outline-brand">Crear cuenta</Link>
              </div>
            </EmptyState>
          ) : enCurso ? (
            <TarjetaPedido pedido={enCurso} onCancelar={cancelarPedido} />
          ) : (
            <EmptyState icono="bi-receipt" titulo="No tienes pedidos en curso" texto="Cuando confirmes un pedido lo verás aquí con su estado." className="mb-4">
              <Link to="/menu" className="btn btn-brand mt-3">Ver menú</Link>
            </EmptyState>
          )}
        </section>
      </div>

      {sesion && (
        <section className="pb-5">
          <h2 className="section-title mb-3">Historial de Pedidos</h2>
          <div className="surface-card p-0" style={{ boxShadow: 'var(--se-shadow)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="orders-table">
                <thead>
                  <tr><th>Número Pedido</th><th>Fecha</th><th>Productos</th><th>Total</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  {propios.length ? propios.map(pedido => {
                    const clase = pedido.estado === 'Entregado' ? 'success' : pedido.estado === 'Cancelado' ? 'error' : 'warning';
                    return (
                      <tr key={pedido.id}>
                        <td>#{pedido.id}</td>
                        <td>{pedido.creadoEn.toLocaleDateString('es-SV')}</td>
                        <td>{pedido.items.map(item => `${item.cantidad}× ${item.nombre}`).join(', ')}</td>
                        <td>{money(pedido.total)}</td>
                        <td><span className={`data-status ${clase}`}>{pedido.estado}</span></td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan="5" className="text-center text-secondary py-4">Aún no has realizado pedidos.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
