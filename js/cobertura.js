/**
 * cobertura.js
 * ---------------------------------------------------------------------------
 * Zona de cobertura del negocio (Etapa 1, punto 6): SaborExpress solo entrega
 * dentro de un radio fijo alrededor del local, con tarifa de envío fija.
 *
 * Funciones puras (no tocan el DOM ni el mapa), por eso se pueden probar solas.
 * ---------------------------------------------------------------------------
 */

/** Ubicación del local (aproximada: Colonia Escalón, San Salvador). Ajustar si cambia la dirección. */
export const NEGOCIO = { lat: 13.7006, lng: -89.2406, nombre: 'SaborExpress' };

/** Radio máximo de entrega, en kilómetros. */
export const RADIO_COBERTURA_KM = 5;

const aRadianes = grados => (grados * Math.PI) / 180;

/** Distancia en km entre dos puntos {lat, lng} (fórmula de Haversine). */
export function distanciaKm(a, b) {
    const RADIO_TIERRA_KM = 6371;
    const dLat = aRadianes(b.lat - a.lat);
    const dLng = aRadianes(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2
        + Math.cos(aRadianes(a.lat)) * Math.cos(aRadianes(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * RADIO_TIERRA_KM * Math.asin(Math.sqrt(h));
}

/** Indica a cuántos km está un punto del local y si queda dentro de la zona de cobertura. */
export function evaluarCobertura(lat, lng) {
    const distancia = distanciaKm(NEGOCIO, { lat, lng });
    return { distanciaKm: distancia, dentro: distancia <= RADIO_COBERTURA_KM };
}
