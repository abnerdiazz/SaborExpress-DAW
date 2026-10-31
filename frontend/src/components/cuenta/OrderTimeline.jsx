const PASOS = [
  ['Pedido recibido', 'Tu orden ha sido registrada en el sistema de SaborExpress.', 'bi-check-lg'],
  ['En preparación', 'El maestro pupusero está cocinando tus pupusas a mano.', 'bi-egg-fried'],
  ['En camino', 'El repartidor va en camino a tu dirección.', 'bi-scooter'],
  ['Entregado', 'Pedido entregado con éxito. ¡Buen provecho!', 'bi-house-check']
];
const INDICE_ESTADO = { pendiente: 0, preparando: 1, 'en camino': 2, entregado: 3 };

export const indiceDeEstado = estado => INDICE_ESTADO[String(estado).toLowerCase()] ?? 0;

/** Línea de tiempo con los cuatro pasos de un pedido. */
export default function OrderTimeline({ estado }) {
  const indice = indiceDeEstado(estado);
  return (
    <ul className="order-steps">
      {PASOS.map(([titulo, descripcion, icono], i) => {
        const clase = i < indice || indice === 3 ? 'is-done' : i === indice ? 'is-current' : 'is-pending';
        return (
          <li className={`order-step ${clase}`} key={titulo}>
            <span className={`step-icon ${clase}`}><i className={`bi ${clase === 'is-done' ? 'bi-check-lg' : icono}`} /></span>
            <div>
              <p className="step-title mb-0">{titulo}{clase === 'is-current' ? ' (Actual)' : ''}</p>
              <p className="step-desc">{descripcion}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
