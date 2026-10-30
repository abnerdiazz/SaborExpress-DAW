import { escribirJSON, leerJSON } from './store.js';

export const CLAVE_MENSAJES = 'saborExpressMensajes';
export const MAX_MENSAJE = 500;
const MAX_GUARDADOS = 20;

/** Guarda el mensaje de contacto (todavía no hay servidor: queda en este navegador). */
export function guardarMensaje(datos) {
  const actuales = leerJSON(CLAVE_MENSAJES, []);
  const lista = Array.isArray(actuales) ? actuales : [];
  lista.unshift({ ...datos, enviadoEn: new Date().toISOString() });
  escribirJSON(CLAVE_MENSAJES, lista.slice(0, MAX_GUARDADOS));
}
