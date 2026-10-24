/**
 * alertas.js
 * ---------------------------------------------------------------------------
 * Capa delgada sobre SweetAlert2 para que toda la aplicación use los mismos
 * diálogos (confirmaciones, avisos breves y formularios emergentes).
 * ---------------------------------------------------------------------------
 */
import Swal from 'sweetalert2';

const COLOR_PRIMARIO = '#CE4B31';

const BASE = {
  confirmButtonColor: COLOR_PRIMARIO,
  cancelButtonColor: '#746F69',
  denyButtonColor: '#4F7058',
  reverseButtons: true,
  focusConfirm: true
};

export const mostrar = opciones => Swal.fire({ ...BASE, ...opciones });

export const exito = (titulo, texto = '') => mostrar({ icon: 'success', title: titulo, text: texto });
export const error = (titulo, texto = '') => mostrar({ icon: 'error', title: titulo, text: texto });
export const aviso = (titulo, texto = '') => mostrar({ icon: 'warning', title: titulo, text: texto });
export const info = (titulo, texto = '') => mostrar({ icon: 'info', title: titulo, text: texto });

/** Cuadro de confirmación. Devuelve true solo si la persona acepta. */
export async function confirmar({
  titulo,
  texto = '',
  html = '',
  icon = 'question',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar'
}) {
  const opciones = {
    icon,
    title: titulo,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText
  };
  if (html) opciones.html = html;
  else opciones.text = texto;
  const resultado = await mostrar(opciones);
  return Boolean(resultado?.isConfirmed);
}

/** Aviso breve en una esquina que se cierra solo. */
export function toast(mensaje, icon = 'success', ms = 2500) {
  return mostrar({
    toast: true,
    position: 'top-end',
    icon,
    title: mensaje,
    showConfirmButton: false,
    showCancelButton: false,
    timer: ms,
    timerProgressBar: true
  });
}

/** Cuadro con formulario propio; `preConfirm` valida antes de cerrar. */
export async function formulario({ titulo, html, confirmText = 'Guardar', cancelText = 'Cancelar', preConfirm }) {
  const resultado = await mostrar({
    title: titulo,
    html,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    preConfirm
  });
  return { confirmado: Boolean(resultado?.isConfirmed), valor: resultado?.value ?? null };
}

export const mensajeValidacion = texto => Swal.showValidationMessage(texto);

/** Cuadro de "procesando" sin botones; se cierra con cerrar(). */
export function cargando(titulo = 'Procesando...') {
  return mostrar({
    title: titulo,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => Swal.showLoading()
  });
}

export const cerrar = () => Swal.close();

export const esperar = ms => new Promise(resolver => setTimeout(resolver, ms));
