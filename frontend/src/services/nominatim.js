/**
 * nominatim.js
 * ---------------------------------------------------------------------------
 * Cliente de la API externa Nominatim (geocodificación de OpenStreetMap).
 *
 *   - buscarDirecciones(texto)         dirección escrita  → lugares con coordenadas
 *   - direccionDesdeCoordenadas(l, g)  pin en el mapa     → dirección legible
 *
 * Cumple la política de uso de la instancia pública:
 *   · como máximo 1 petición por segundo (cola con espera entre consultas);
 *   · sin "autocompletar" mientras se escribe (la búsqueda se pide con un botón);
 *   · resultados repetidos salen de una caché en memoria, sin volver a consultar.
 * No necesita clave de API, así que no hay credenciales que proteger.
 *
 * Los errores se convierten en un objeto ErrorApi con `tipo` ('red', 'servidor',
 * 'limite', 'tiempo' o 'cancelado') para que la pantalla muestre un mensaje claro.
 * ---------------------------------------------------------------------------
 */

export const URL_BASE = 'https://nominatim.openstreetmap.org';
export const ESPERA_ENTRE_PETICIONES_MS = 1100;
export const TIEMPO_MAXIMO_MS = 8000;
const PAIS = 'sv'; // solo El Salvador

export class ErrorApi extends Error {
  constructor(tipo, mensaje) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.tipo = tipo;
  }
}

/** Mensaje para mostrar a la persona según el tipo de error. */
export function mensajeDeError(error) {
  switch (error?.tipo) {
    case 'red': return 'No hay conexión con el servicio de mapas. Revisa tu internet o escribe la dirección manualmente.';
    case 'tiempo': return 'El servicio de mapas tardó demasiado en responder. Inténtalo de nuevo.';
    case 'limite': return 'Hay muchas consultas en este momento. Espera unos segundos e inténtalo de nuevo.';
    case 'servidor': return 'El servicio de mapas no está disponible ahora. Puedes escribir la dirección manualmente.';
    default: return 'No se pudo consultar el servicio de mapas.';
  }
}

/* ---------------------------- cola de peticiones ---------------------------- */
let ultimaPeticion = 0;
let cola = Promise.resolve();

const dormir = (ms, signal) => new Promise((resolver, rechazar) => {
  if (signal?.aborted) { rechazar(new ErrorApi('cancelado', 'Cancelado')); return; }
  const id = setTimeout(resolver, ms);
  signal?.addEventListener('abort', () => { clearTimeout(id); rechazar(new ErrorApi('cancelado', 'Cancelado')); }, { once: true });
});

/** Espera su turno para respetar el máximo de una petición por segundo. */
function esperarTurno(signal) {
  const turno = cola.then(async () => {
    // La espera nunca pasa del intervalo: si el reloj del dispositivo retrocede, no se bloquea la consulta.
    const espera = Math.min(ESPERA_ENTRE_PETICIONES_MS, Math.max(0, ultimaPeticion + ESPERA_ENTRE_PETICIONES_MS - Date.now()));
    if (espera) await dormir(espera, signal);
    ultimaPeticion = Date.now();
  });
  cola = turno.catch(() => {});
  return turno;
}

/* --------------------------------- caché ----------------------------------- */
const cache = new Map();
export const vaciarCache = () => cache.clear();

/** Solo para pruebas: deja el servicio como recién iniciado (caché y cola vacías). */
export function reiniciarServicio() {
  cache.clear();
  ultimaPeticion = 0;
  cola = Promise.resolve();
}

/* ------------------------------ petición base ------------------------------- */
async function pedir(ruta, parametros, signal) {
  const clave = `${ruta}?${parametros.toString()}`;
  if (cache.has(clave)) return cache.get(clave);

  await esperarTurno(signal);

  // El tiempo máximo y la cancelación del usuario se combinan en una sola señal.
  const limite = new AbortController();
  const temporizador = setTimeout(() => limite.abort(new ErrorApi('tiempo', 'Tiempo agotado')), TIEMPO_MAXIMO_MS);
  const cancelar = () => limite.abort(new ErrorApi('cancelado', 'Cancelado'));
  signal?.addEventListener('abort', cancelar, { once: true });

  try {
    const respuesta = await fetch(`${URL_BASE}${ruta}?${parametros.toString()}`, {
      signal: limite.signal,
      headers: { Accept: 'application/json' }
    });
    if (respuesta.status === 429) throw new ErrorApi('limite', 'Demasiadas consultas');
    if (!respuesta.ok) throw new ErrorApi('servidor', `Error ${respuesta.status}`);
    const datos = await respuesta.json();
    cache.set(clave, datos);
    return datos;
  } catch (error) {
    if (error instanceof ErrorApi) throw error;
    if (limite.signal.aborted && limite.signal.reason instanceof ErrorApi) throw limite.signal.reason;
    throw new ErrorApi('red', 'Sin conexión');
  } finally {
    clearTimeout(temporizador);
    signal?.removeEventListener('abort', cancelar);
  }
}

/* ------------------------------- respuestas -------------------------------- */
/** Arma una dirección corta y legible con las partes que Nominatim reconoce. */
export function formatearDireccion(lugar) {
  const a = lugar?.address ?? {};
  const calle = [a.road ?? a.pedestrian ?? a.footway, a.house_number].filter(Boolean).join(' ');
  const zona = a.neighbourhood ?? a.suburb ?? a.quarter ?? a.village;
  const ciudad = a.city ?? a.town ?? a.municipality ?? a.county;
  const partes = [calle, zona, ciudad, a.state].filter(Boolean);
  const texto = partes.join(', ');
  return texto || String(lugar?.display_name ?? '').split(',').slice(0, 3).join(',').trim();
}

const aLugar = crudo => ({
  id: String(crudo.place_id ?? `${crudo.lat},${crudo.lon}`),
  texto: formatearDireccion(crudo),
  completo: crudo.display_name ?? '',
  lat: Number(crudo.lat),
  lng: Number(crudo.lon)
});

/** Busca una dirección escrita. Devuelve hasta `limite` lugares de El Salvador. */
export async function buscarDirecciones(texto, { signal, limite = 5 } = {}) {
  const consulta = String(texto ?? '').trim();
  if (consulta.length < 3) return [];
  const parametros = new URLSearchParams({
    q: consulta, format: 'jsonv2', addressdetails: '1', limit: String(limite),
    countrycodes: PAIS, 'accept-language': 'es'
  });
  const datos = await pedir('/search', parametros, signal);
  return Array.isArray(datos) ? datos.map(aLugar).filter(l => Number.isFinite(l.lat) && Number.isFinite(l.lng)) : [];
}

/** Dirección legible de un punto del mapa, o null si Nominatim no encuentra nada ahí. */
export async function direccionDesdeCoordenadas(lat, lng, { signal } = {}) {
  const parametros = new URLSearchParams({
    lat: Number(lat).toFixed(5), lon: Number(lng).toFixed(5), format: 'jsonv2',
    addressdetails: '1', zoom: '18', 'accept-language': 'es'
  });
  const datos = await pedir('/reverse', parametros, signal);
  if (!datos || datos.error) return null;
  const texto = formatearDireccion(datos);
  return texto ? { texto, completo: datos.display_name ?? texto } : null;
}
