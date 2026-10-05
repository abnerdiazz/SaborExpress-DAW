/**
 * alertas.js
 * ---------------------------------------------------------------------------
 * Capa de diálogos de SaborExpress basada en SweetAlert2.
 *
 * - SweetAlert2 se carga desde el CDN la primera vez que hace falta, así que
 *   ninguna página necesita agregar un <script> adicional.
 * - Si no hay conexión con el CDN, todas las funciones usan los cuadros
 *   nativos del navegador (alert/confirm) para que la app nunca se rompa.
 * - Todas las funciones devuelven promesas: se usan con `await`.
 *
 * Nota de seguridad: cuando se pase `html`, quien llama debe escapar los datos
 * del usuario (ver esc() en compra-utils.js).
 * ---------------------------------------------------------------------------
 */

const SWAL_URL = 'https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js';
const COLOR_PRIMARIO = '#CE4B31';   // --se-primary
const COLOR_SECUNDARIO = '#746F69'; // --se-muted

let promesaSwal = null;

/** Carga SweetAlert2 una sola vez. Resuelve con `Swal` o con null si falla. */
function cargarSwal() {
    if (window.Swal) return Promise.resolve(window.Swal);
    if (!promesaSwal) {
        promesaSwal = new Promise(resolve => {
            const script = document.createElement('script');
            script.src = SWAL_URL;
            script.async = true;
            script.onload = () => resolve(window.Swal || null);
            script.onerror = () => resolve(null);
            document.head.appendChild(script);
        });
    }
    return promesaSwal;
}

const BASE = {
    confirmButtonColor: COLOR_PRIMARIO,
    cancelButtonColor: COLOR_SECUNDARIO,
    reverseButtons: true,
    focusConfirm: true
};

function textoPlano(opciones) {
    const html = opciones.html ? String(opciones.html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';
    return [opciones.title, opciones.text, html].filter(Boolean).join('\n');
}

/** Respaldo cuando SweetAlert2 no está disponible. */
function respaldoNativo(opciones) {
    const mensaje = textoPlano(opciones);
    if (opciones.toast) {
        const aviso = document.createElement('div');
        aviso.textContent = opciones.title || '';
        aviso.setAttribute('role', 'status');
        aviso.style.cssText = 'position:fixed;top:16px;right:16px;z-index:2000;background:#272421;color:#fff;padding:10px 16px;border-radius:8px;font-size:14px;';
        document.body.appendChild(aviso);
        setTimeout(() => aviso.remove(), opciones.timer || 2500);
        return { isConfirmed: true, isDenied: false, isDismissed: false };
    }
    if (opciones.showCancelButton) {
        const acepto = window.confirm(mensaje);
        return { isConfirmed: acepto, isDenied: false, isDismissed: !acepto, dismiss: acepto ? undefined : 'cancel' };
    }
    window.alert(mensaje);
    return { isConfirmed: true, isDenied: false, isDismissed: false };
}

/** Punto de entrada común: abre un diálogo con la configuración base de marca. */
export async function mostrar(opciones) {
    const Swal = await cargarSwal();
    if (!Swal) return respaldoNativo(opciones);
    return Swal.fire({ ...BASE, ...opciones });
}

export const exito = (titulo, texto = '') => mostrar({ icon: 'success', title: titulo, text: texto });
export const error = (titulo, texto = '') => mostrar({ icon: 'error', title: titulo, text: texto });
export const aviso = (titulo, texto = '') => mostrar({ icon: 'warning', title: titulo, text: texto });
export const info = (titulo, texto = '') => mostrar({ icon: 'info', title: titulo, text: texto });

/** Pregunta de sí/no. Devuelve true si la persona confirma. */
export async function confirmar({ titulo, texto = '', html = '', icon = 'question', confirmText = 'Confirmar', cancelText = 'Cancelar' }) {
    const opciones = { icon, title: titulo, showCancelButton: true, confirmButtonText: confirmText, cancelButtonText: cancelText };
    if (html) opciones.html = html; else opciones.text = texto;
    const resultado = await mostrar(opciones);
    return Boolean(resultado.isConfirmed);
}

/** Notificación breve que no interrumpe (esquina superior derecha). */
export function toast(mensaje, icon = 'success', ms = 2500) {
    return mostrar({
        toast: true,
        position: 'top-end',
        icon,
        title: mensaje,
        showConfirmButton: false,
        timer: ms,
        timerProgressBar: true
    });
}

/**
 * Cuadro con un formulario HTML dentro. `preConfirm` valida y devuelve el valor;
 * para rechazar, llama a mensajeValidacion('...') y devuelve false.
 * Resultado: { confirmado: boolean, valor }.
 */
export async function formulario({ titulo, html, confirmText = 'Guardar', cancelText = 'Cancelar', preConfirm }) {
    const Swal = await cargarSwal();
    if (!Swal) {
        window.alert('No se pudo cargar el cuadro de edición. Revisa tu conexión a internet.');
        return { confirmado: false, valor: null };
    }
    const resultado = await Swal.fire({
        ...BASE,
        title: titulo,
        html,
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        preConfirm
    });
    return { confirmado: Boolean(resultado.isConfirmed), valor: resultado.value ?? null };
}

/** Muestra un error dentro del cuadro abierto (úsalo dentro de preConfirm). */
export function mensajeValidacion(texto) {
    if (window.Swal) window.Swal.showValidationMessage(texto);
}

/** Cuadro de "procesando" con ruedita. Se cierra con cerrar(). */
export async function cargando(titulo = 'Procesando...') {
    const Swal = await cargarSwal();
    if (!Swal) return;
    Swal.fire({
        title: titulo,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading()
    });
}

export function cerrar() {
    if (window.Swal) window.Swal.close();
}

export const esperar = ms => new Promise(resolve => setTimeout(resolve, ms));
