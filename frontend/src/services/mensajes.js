/**
 * mensajes.js
 * ---------------------------------------------------------------------------
 * Mensajes del formulario de Contacto y la bandeja del administrador.
 *
 * Todavía no hay servidor: los mensajes se guardan en este navegador
 * (localStorage). El administrador los lee, los marca como leídos o los elimina
 * desde el panel "Mensajes". Cada mensaje lleva un identificador y un estado
 * de lectura para poder gestionarlo.
 * ---------------------------------------------------------------------------
 */
import { escribirJSON, leerJSON } from './store.js';

export const CLAVE_MENSAJES = 'saborExpressMensajes';
export const MAX_MENSAJE = 500;
const MAX_GUARDADOS = 20;

/** Identificador único y legible de un mensaje nuevo, por ejemplo "MSG-lq3k9x2a". */
export const nuevoIdMensaje = () => `MSG-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

/**
 * Deja la lista lista para mostrar: ignora entradas dañadas y completa lo que falte.
 * Los mensajes guardados antes de existir la bandeja no tenían id ni estado de lectura:
 * se les da un id estable (fecha + correo) y se consideran sin leer.
 */
export function normalizarMensajes(crudos) {
  if (!Array.isArray(crudos)) return [];
  return crudos
    .filter(m => m && typeof m === 'object')
    .map(m => ({
      ...m,
      id: m.id || `${m.enviadoEn || 'sin-fecha'}|${m.correo || ''}`,
      leido: m.leido === true,
      enviadoEn: m.enviadoEn || null
    }));
}

/** Guarda el mensaje de contacto como "sin leer" (los más recientes primero). */
export function guardarMensaje(datos) {
  const actuales = normalizarMensajes(leerJSON(CLAVE_MENSAJES, []));
  actuales.unshift({ ...datos, id: nuevoIdMensaje(), leido: false, enviadoEn: new Date().toISOString() });
  escribirJSON(CLAVE_MENSAJES, actuales.slice(0, MAX_GUARDADOS));
}

/** Cambia el estado de lectura de un mensaje. Devuelve false si no existe. */
export function marcarMensaje(id, leido = true) {
  const lista = normalizarMensajes(leerJSON(CLAVE_MENSAJES, []));
  if (!lista.some(m => m.id === id)) return false;
  escribirJSON(CLAVE_MENSAJES, lista.map(m => (m.id === id ? { ...m, leido } : m)));
  return true;
}

/** Elimina un mensaje. Devuelve false si no existe. */
export function eliminarMensaje(id) {
  const lista = normalizarMensajes(leerJSON(CLAVE_MENSAJES, []));
  if (!lista.some(m => m.id === id)) return false;
  escribirJSON(CLAVE_MENSAJES, lista.filter(m => m.id !== id));
  return true;
}

export const contarNoLeidos = lista => lista.filter(m => !m.leido).length;

/* -------------------------------------------------------------------------- */
/* Respuesta al cliente                                                        */
/* -------------------------------------------------------------------------- */

/** Correo del negocio: es el que aparece en el pie de página y en Contacto. */
export const CORREO_NEGOCIO = 'soporte@saborexpress.com';

/** Frases generales de agradecimiento (cortas y sin hablar de comida); se elige una al azar. */
export const AGRADECIMIENTOS = [
  'Muchas gracias por escribirnos. Agradecemos tu confianza y esperamos atenderte muy pronto.',
  'Gracias por contactarnos y por ser parte de SaborExpress. Estamos para servirte.',
  'Gracias por tu mensaje. Valoramos mucho que nos hayas tomado en cuenta.',
  'Agradecemos que nos hayas escrito. Si necesitas algo más, con gusto te ayudamos.',
  'Gracias por tu preferencia. Tu opinión nos ayuda a mejorar cada día.'
];

const codificar = texto => encodeURIComponent(texto);

/**
 * Arma la respuesta que se abre desde la bandeja: destinatario, asunto, cuerpo y los dos enlaces.
 * - mailto: abre el programa de correo del equipo con todo ya escrito.
 * - gmail: abre Gmail en una pestaña nueva eligiendo la cuenta del negocio (authuser) si ya está iniciada.
 * Un enlace mailto no puede fijar el remitente: sale desde la cuenta que tenga el programa de correo.
 * `azar` se puede cambiar para probar: devuelve un número entre 0 y 1.
 */
export function armarRespuesta(mensaje, azar = Math.random) {
  const para = mensaje.correo || '';
  const asunto = `Re: ${mensaje.asunto || 'Tu mensaje a SaborExpress'}`;
  const primerNombre = String(mensaje.nombre || '').trim().split(/\s+/)[0] || 'cliente';
  const agradecimiento = AGRADECIMIENTOS[Math.min(Math.floor(azar() * AGRADECIMIENTOS.length), AGRADECIMIENTOS.length - 1)];
  const cuerpo = [`Hola ${primerNombre},`, '', agradecimiento, '', 'Un saludo cordial,', 'Equipo SaborExpress', CORREO_NEGOCIO].join('\r\n');
  return {
    de: CORREO_NEGOCIO,
    para,
    asunto,
    cuerpo,
    mailto: `mailto:${codificar(para)}?subject=${codificar(asunto)}&body=${codificar(cuerpo)}`,
    gmail: `https://mail.google.com/mail/?view=cm&fs=1&authuser=${codificar(CORREO_NEGOCIO)}&to=${codificar(para)}&su=${codificar(asunto)}&body=${codificar(cuerpo)}`
  };
}
