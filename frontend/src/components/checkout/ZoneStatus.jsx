import { RADIO_COBERTURA_KM, evaluarCobertura } from '../../services/cobertura.js';

/** Dice si la ubicación marcada está dentro de la zona de entrega. */
export default function ZoneStatus({ ubicacion, error = '' }) {
  if (error) {
    return <div className="zone-status zone-out" role="status" aria-live="polite">{error}</div>;
  }
  if (!ubicacion) {
    return (
      <div className="zone-status zone-pending" role="status" aria-live="polite">
        <i className="bi bi-geo-alt me-1" />Mueve el pin hasta tu dirección o toca el mapa para comprobar si llegamos.
      </div>
    );
  }
  const { distanciaKm, dentro } = evaluarCobertura(ubicacion.lat, ubicacion.lng);
  return dentro ? (
    <div className="zone-status zone-ok" role="status" aria-live="polite">
      <i className="bi bi-check-circle-fill me-1" />¡Llegamos a tu ubicación! Estás a {distanciaKm.toFixed(1)} km del local.
    </div>
  ) : (
    <div className="zone-status zone-out" role="status" aria-live="polite">
      <i className="bi bi-x-circle-fill me-1" />Fuera de la zona de cobertura: estás a {distanciaKm.toFixed(1)} km y entregamos hasta {RADIO_COBERTURA_KM} km.
    </div>
  );
}
