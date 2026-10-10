import { iniciarNavbar } from './saborexpress-data.js';
import { reglas, validarCampo, vincularValidacion, limpiarCampo, enfocarPrimerError, formatearTelefono } from './validaciones.js';
import { cargando, cerrar, esperar, exito } from './alertas.js';

const CLAVE_MENSAJES = 'saborExpressMensajes';
const MAX_MENSAJE = 500;
const MAX_GUARDADOS = 20;

const reglaAsunto = reglas.texto('el asunto', 5, 80);
const reglaMensaje = reglas.texto('tu mensaje', 10, MAX_MENSAJE);

/** Localiza los campos por tipo: el HTML del formulario no usa identificadores. */
function localizarCampos(form) {
    const textos = [...form.querySelectorAll('input[type="text"]')];
    return {
        nombre: textos[0],
        asunto: textos[1],
        correo: form.querySelector('input[type="email"]'),
        telefono: form.querySelector('input[type="tel"]'),
        mensaje: form.querySelector('textarea')
    };
}

function guardarMensaje(datos) {
    let guardados = [];
    try {
        guardados = JSON.parse(localStorage.getItem(CLAVE_MENSAJES)) || [];
    } catch {
        guardados = [];
    }
    guardados.unshift({ ...datos, enviadoEn: new Date().toISOString() });
    localStorage.setItem(CLAVE_MENSAJES, JSON.stringify(guardados.slice(0, MAX_GUARDADOS)));
}

function initFormulario() {
    const form = document.getElementById('contactForm');
    if (!form) return;
    form.noValidate = true; // la validación la hace validaciones.js, con mensajes propios

    const { nombre, correo, telefono, asunto, mensaje } = localizarCampos(form);
    if (!nombre || !correo || !telefono || !asunto || !mensaje) return;

    mensaje.maxLength = MAX_MENSAJE;
    const contador = document.createElement('small');
    contador.className = 'text-secondary d-block text-end mt-1';
    mensaje.insertAdjacentElement('afterend', contador);
    const actualizarContador = () => { contador.textContent = `${mensaje.value.length}/${MAX_MENSAJE}`; };
    actualizarContador();
    mensaje.addEventListener('input', actualizarContador);

    telefono.addEventListener('input', () => { telefono.value = formatearTelefono(telefono.value); });

    const campos = [
        [nombre, reglas.nombre],
        [correo, reglas.correo],
        [telefono, reglas.telefonoOpcional],
        [asunto, reglaAsunto],
        [mensaje, reglaMensaje]
    ];
    campos.forEach(([campo, regla]) => vincularValidacion(campo, regla));

    form.addEventListener('submit', async event => {
        event.preventDefault();

        const resultados = campos.map(([campo, regla]) => validarCampo(campo, regla));
        if (resultados.includes(false)) {
            enfocarPrimerError(form);
            return;
        }

        const boton = form.querySelector('button[type="submit"]');
        boton.disabled = true;
        await cargando('Enviando tu mensaje...');
        await esperar(900); // simula el envío: todavía no hay servidor
        guardarMensaje({
            nombre: nombre.value.trim(),
            correo: correo.value.trim(),
            telefono: telefono.value.trim(),
            asunto: asunto.value.trim(),
            mensaje: mensaje.value.trim()
        });
        cerrar();

        await exito('¡Mensaje enviado!', `Gracias, ${nombre.value.trim().split(' ')[0]}. Te responderemos pronto a ${correo.value.trim()}.`);

        form.reset();
        campos.forEach(([campo]) => limpiarCampo(campo));
        actualizarContador();
        boton.disabled = false;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    iniciarNavbar();
    initFormulario();
});
