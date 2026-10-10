import { guardarSesion, leerUsuarios } from './saborexpress-data.js';
import {
    reglas,
    validarCampo,
    vincularValidacion,
    enfocarPrimerError,
    formatearTelefono,
    pintarMedidorPassword
} from './validaciones.js';
import { mostrar } from './alertas.js';

const CORREO_RESERVADO = 'admin@saborexpress.com';

function guardarUsuarios(usuarios) {
    localStorage.setItem('saborExpressUsers', JSON.stringify(usuarios));
}

function paginaDestino() {
    const redirect = new URLSearchParams(window.location.search).get('redirect');
    const valida = redirect && /^[a-zA-Z0-9_-]+\.html$/.test(redirect) && !redirect.startsWith('admin-');
    return valida ? redirect : 'mis-pedidos.html';
}

/** Regla del correo en el registro: formato válido, no reservado y no repetido. */
function reglaCorreoDisponible(valor) {
    const mensaje = reglas.correo(valor);
    if (mensaje) return mensaje;
    const correo = valor.trim().toLowerCase();
    if (correo === CORREO_RESERVADO) return 'Ese correo está reservado. Usa otro.';
    if (leerUsuarios().some(usuario => usuario.email === correo)) {
        return 'Ya existe una cuenta con ese correo. Inicia sesión en su lugar.';
    }
    return '';
}

function init() {
    const enlaceLogin = document.querySelector('a[href="login.html"]');
    if (enlaceLogin) enlaceLogin.search = window.location.search;

    const form = document.getElementById('registroForm');
    if (!form) return;

    const nombre = document.getElementById('registroNombre');
    const correo = document.getElementById('registroCorreo');
    const telefono = document.getElementById('registroTelefono');
    const password = document.getElementById('registroPassword');
    const confirmar = document.getElementById('registroConfirmar');
    const medidor = document.getElementById('passwordMeter');

    const reglaConfirmar = reglas.coincide(() => password.value);

    vincularValidacion(nombre, reglas.nombre);
    vincularValidacion(correo, reglaCorreoDisponible);
    vincularValidacion(telefono, reglas.telefono);
    vincularValidacion(password, reglas.passwordNueva);
    vincularValidacion(confirmar, reglaConfirmar);

    // Formato automático 7777-7777 mientras se escribe.
    telefono.addEventListener('input', () => {
        telefono.value = formatearTelefono(telefono.value);
    });

    // Barra de seguridad y revalidación de la confirmación al cambiar la contraseña.
    password.addEventListener('input', () => {
        pintarMedidorPassword(medidor, password.value);
        if (confirmar.value) validarCampo(confirmar, reglaConfirmar);
    });

    form.addEventListener('submit', async event => {
        event.preventDefault();

        const resultados = [
            validarCampo(nombre, reglas.nombre),
            validarCampo(correo, reglaCorreoDisponible),
            validarCampo(telefono, reglas.telefono),
            validarCampo(password, reglas.passwordNueva),
            validarCampo(confirmar, reglaConfirmar)
        ];
        if (resultados.includes(false)) {
            enfocarPrimerError(form);
            return;
        }

        const nuevoUsuario = {
            name: nombre.value.trim(),
            email: correo.value.trim().toLowerCase(),
            phone: telefono.value.trim(),
            password: password.value
        };
        const usuarios = leerUsuarios();
        usuarios.push(nuevoUsuario);
        guardarUsuarios(usuarios);
        guardarSesion({ name: nuevoUsuario.name, email: nuevoUsuario.email, role: 'cliente' });

        await mostrar({
            icon: 'success',
            title: '¡Cuenta creada!',
            text: `Bienvenido a SaborExpress, ${nuevoUsuario.name.split(' ')[0]}.`,
            timer: 1600,
            timerProgressBar: true,
            showConfirmButton: false
        });
        window.location.href = paginaDestino();
    });
}

document.addEventListener('DOMContentLoaded', init);
