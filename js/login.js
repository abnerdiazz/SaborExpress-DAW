import { ADMIN_DEMO, leerSesion, guardarSesion, leerUsuarios } from './saborexpress-data.js';
import { reglas, validarCampo, vincularValidacion, mostrarError, enfocarPrimerError } from './validaciones.js';
import { aviso, confirmar, toast } from './alertas.js';

// Seguridad básica: tras 5 intentos fallidos se bloquea el formulario 30 segundos.
const MAX_INTENTOS = 5;
const BLOQUEO_SEGUNDOS = 30;
const CLAVE_INTENTOS = 'saborExpressLoginIntentos';

function leerIntentos() {
    try {
        return JSON.parse(sessionStorage.getItem(CLAVE_INTENTOS)) || { fallos: 0, bloqueadoHasta: 0 };
    } catch {
        return { fallos: 0, bloqueadoHasta: 0 };
    }
}

function segundosDeBloqueo() {
    return Math.max(0, Math.ceil((leerIntentos().bloqueadoHasta - Date.now()) / 1000));
}

/** Suma un intento fallido. Indica cuántos quedan y si este fallo activó el bloqueo. */
function registrarFallo() {
    const estado = leerIntentos();
    estado.fallos += 1;
    const bloqueado = estado.fallos >= MAX_INTENTOS;
    if (bloqueado) {
        estado.fallos = 0;
        estado.bloqueadoHasta = Date.now() + BLOQUEO_SEGUNDOS * 1000;
    }
    sessionStorage.setItem(CLAVE_INTENTOS, JSON.stringify(estado));
    return { quedan: MAX_INTENTOS - estado.fallos, bloqueado };
}

function limpiarIntentos() {
    sessionStorage.removeItem(CLAVE_INTENTOS);
}

// Devuelve la página a la que debe ir cada rol (ignora destinos que no le corresponden).
function paginaDestino(rol) {
    const redirect = new URLSearchParams(window.location.search).get('redirect');
    const valida = Boolean(redirect && /^[a-zA-Z0-9_-]+\.html$/.test(redirect));
    const esPanel = valida && redirect.startsWith('admin-');
    if (rol === 'admin') return esPanel ? redirect : 'admin-reportes.html';
    return valida && !esPanel ? redirect : 'mis-pedidos.html';
}

function entrar(usuario, rol) {
    limpiarIntentos();
    guardarSesion(usuario);
    toast(`¡Bienvenido, ${usuario.name.split(' ')[0]}!`, 'success', 1200);
    setTimeout(() => { window.location.href = paginaDestino(rol); }, 900);
}

/** True cuando se llega desde un panel de administración (login.html?redirect=admin-...). */
function vieneDeUnPanel() {
    const redirect = new URLSearchParams(window.location.search).get('redirect');
    return Boolean(redirect && /^admin-[a-zA-Z0-9_-]+\.html$/.test(redirect));
}

function init() {
    // Un cliente con sesión no necesita ver el login, salvo que venga de un panel de
    // administración: así puede iniciar como admin sin cerrar la sesión de cliente.
    if (leerSesion() && !vieneDeUnPanel()) {
        window.location.replace(paginaDestino('cliente'));
        return;
    }

    const enlaceRegistro = document.querySelector('a[href="registro.html"]');
    if (enlaceRegistro) enlaceRegistro.search = window.location.search;

    const form = document.getElementById('loginForm');
    const correo = document.getElementById('loginCorreo');
    const password = document.getElementById('loginPassword');
    correo.setAttribute('autocomplete', 'username');
    password.setAttribute('autocomplete', 'current-password');

    vincularValidacion(correo, reglas.correo);
    vincularValidacion(password, reglas.passwordLogin);

    form.addEventListener('submit', async event => {
        event.preventDefault();

        const restante = segundosDeBloqueo();
        if (restante > 0) {
            await aviso('Demasiados intentos', `Por seguridad, espera ${restante} segundos antes de volver a intentar.`);
            return;
        }

        const correoValido = validarCampo(correo, reglas.correo);
        const passwordValida = validarCampo(password, reglas.passwordLogin);
        if (!correoValido || !passwordValida) {
            enfocarPrimerError(form);
            return;
        }

        const correoTexto = correo.value.trim().toLowerCase();

        if (correoTexto === ADMIN_DEMO.email && password.value === ADMIN_DEMO.password) {
            entrar(ADMIN_DEMO, 'admin');
            return;
        }

        const usuario = leerUsuarios().find(u => u.email === correoTexto);
        if (!usuario) {
            const crear = await confirmar({
                titulo: 'No encontramos tu cuenta',
                texto: 'No existe una cuenta con ese correo. ¿Quieres crearla ahora?',
                icon: 'info',
                confirmText: 'Crear cuenta',
                cancelText: 'Reintentar'
            });
            if (crear) window.location.href = `registro.html${window.location.search}`;
            return;
        }

        if (usuario.password !== password.value) {
            const { quedan, bloqueado } = registrarFallo();
            mostrarError(password, bloqueado
                ? 'Contraseña incorrecta.'
                : `Contraseña incorrecta. Te quedan ${quedan} intento(s).`);
            if (bloqueado) {
                await aviso('Formulario bloqueado', `Superaste ${MAX_INTENTOS} intentos. Espera ${BLOQUEO_SEGUNDOS} segundos.`);
            }
            password.focus();
            return;
        }

        entrar({ name: usuario.name, email: usuario.email, role: 'cliente' }, 'cliente');
    });
}

document.addEventListener('DOMContentLoaded', init);
