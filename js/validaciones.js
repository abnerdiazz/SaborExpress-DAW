/**
 * validaciones.js
 * ---------------------------------------------------------------------------
 * Validación de formularios de SaborExpress.
 *
 * Dos partes:
 *   1. `reglas`: funciones puras. Reciben el valor y devuelven un mensaje de
 *      error, o '' si el valor es válido. No tocan el DOM (se pueden probar solas).
 *   2. Ayudas de interfaz: marcan el campo con las clases is-invalid / is-valid
 *      de Bootstrap y muestran el mensaje debajo del campo.
 *
 * Uso típico:
 *   vincularValidacion(input, reglas.correo);   // valida al salir del campo y mientras se corrige
 *   if (!validarCampo(input, reglas.correo)) ...  // al enviar el formulario
 * ---------------------------------------------------------------------------
 */

export const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const REGEX_TELEFONO = /^(\+?503[\s-]?)?\d{4}[\s-]?\d{4}$/;
export const REGEX_NOMBRE = /^[\p{L}][\p{L}\s'.-]{2,59}$/u;

const limpio = valor => String(valor ?? '').trim();

export const esCorreoValido = valor => REGEX_CORREO.test(limpio(valor));
export const esTelefonoValido = valor => REGEX_TELEFONO.test(limpio(valor));
export const esNombreValido = valor => REGEX_NOMBRE.test(limpio(valor));

/** Convierte lo que se escribe en el formato 7777-7777 (acepta +503 al inicio). */
export function formatearTelefono(valor) {
    let digitos = String(valor ?? '').replace(/\D/g, '');
    // El prefijo del país (503) solo se quita cuando sobran dígitos: un número local de 8 dígitos no se toca.
    if (digitos.length > 8 && digitos.startsWith('503')) digitos = digitos.slice(3);
    digitos = digitos.slice(0, 8);
    return digitos.length > 4 ? `${digitos.slice(0, 4)}-${digitos.slice(4)}` : digitos;
}

/**
 * Evalúa qué tan segura es una contraseña (0 a 4) y si cumple el mínimo
 * exigido al registrarse: 8 caracteres, con al menos una letra y un número.
 */
export function evaluarPassword(password) {
    const texto = String(password ?? '');
    const reglasPassword = {
        longitud: texto.length >= 8,
        letra: /[A-Za-z]/.test(texto),
        numero: /\d/.test(texto),
        mayuscula: /[A-Z]/.test(texto),
        simbolo: /[^A-Za-z0-9]/.test(texto)
    };
    let puntaje = 0;
    if (reglasPassword.longitud) puntaje += 1;
    if (reglasPassword.letra && reglasPassword.numero) puntaje += 1;
    if (reglasPassword.mayuscula) puntaje += 1;
    if (reglasPassword.simbolo || texto.length >= 12) puntaje += 1;
    const etiquetas = ['Muy débil', 'Débil', 'Aceptable', 'Buena', 'Fuerte'];
    return {
        puntaje,
        etiqueta: etiquetas[puntaje],
        valida: reglasPassword.longitud && reglasPassword.letra && reglasPassword.numero,
        reglas: reglasPassword
    };
}

/* ------------------------------------------------------------------------- */
/* Reglas: devuelven '' si es válido, o el mensaje de error                    */
/* ------------------------------------------------------------------------- */
export const reglas = {
    nombre(valor) {
        const texto = limpio(valor);
        if (!texto) return 'Ingresa tu nombre completo.';
        if (!esNombreValido(texto)) return 'Usa solo letras y espacios (entre 3 y 60 caracteres).';
        return '';
    },
    correo(valor) {
        const texto = limpio(valor);
        if (!texto) return 'Ingresa tu correo electrónico.';
        if (!esCorreoValido(texto)) return 'Escribe un correo válido, por ejemplo nombre@correo.com.';
        return '';
    },
    telefono(valor) {
        const texto = limpio(valor);
        if (!texto) return 'Ingresa tu teléfono.';
        if (!esTelefonoValido(texto)) return 'Escribe 8 dígitos, por ejemplo 7777-7777.';
        return '';
    },
    telefonoOpcional(valor) {
        return limpio(valor) ? reglas.telefono(valor) : '';
    },
    passwordNueva(valor) {
        const texto = String(valor ?? '');
        if (!texto) return 'Crea una contraseña.';
        if (!evaluarPassword(texto).valida) return 'Mínimo 8 caracteres, con al menos una letra y un número.';
        return '';
    },
    passwordLogin(valor) {
        return String(valor ?? '') ? '' : 'Ingresa tu contraseña.';
    },
    coincide(valorOriginal) {
        return valor => {
            if (!String(valor ?? '')) return 'Repite la contraseña.';
            return valor === valorOriginal() ? '' : 'Las contraseñas no coinciden.';
        };
    },
    texto(etiqueta, min, max) {
        return valor => {
            const texto = limpio(valor);
            if (!texto) return `Ingresa ${etiqueta}.`;
            if (texto.length < min) return `Escribe al menos ${min} caracteres.`;
            if (texto.length > max) return `Máximo ${max} caracteres.`;
            return '';
        };
    },
    textoOpcional(max) {
        return valor => (limpio(valor).length > max ? `Máximo ${max} caracteres.` : '');
    },
    precio(valor) {
        const numero = Number(valor);
        if (String(valor ?? '').trim() === '' || !Number.isFinite(numero)) return 'Ingresa un precio válido.';
        if (numero <= 0) return 'El precio debe ser mayor que 0.';
        if (numero > 99) return 'El precio máximo es $99.00.';
        return '';
    }
};

/* ------------------------------------------------------------------------- */
/* Ayudas de interfaz (Bootstrap 5)                                            */
/* ------------------------------------------------------------------------- */
function obtenerFeedback(input) {
    let feedback = input.nextElementSibling;
    if (!feedback || !feedback.classList.contains('invalid-feedback')) {
        feedback = document.createElement('div');
        feedback.className = 'invalid-feedback';
        input.insertAdjacentElement('afterend', feedback);
    }
    return feedback;
}

export function mostrarError(input, mensaje) {
    input.classList.remove('is-valid');
    input.classList.add('is-invalid');
    obtenerFeedback(input).textContent = mensaje;
    input.setAttribute('aria-invalid', 'true');
}

export function marcarValido(input) {
    input.classList.remove('is-invalid');
    input.classList.add('is-valid');
    obtenerFeedback(input).textContent = '';
    input.removeAttribute('aria-invalid');
}

export function limpiarCampo(input) {
    input.classList.remove('is-invalid', 'is-valid');
    const siguiente = input.nextElementSibling;
    if (siguiente && siguiente.classList.contains('invalid-feedback')) siguiente.textContent = '';
    input.removeAttribute('aria-invalid');
}

/** Valida un campo con una regla. Devuelve true si es válido. */
export function validarCampo(input, regla) {
    const mensaje = regla(input.value);
    if (mensaje) {
        mostrarError(input, mensaje);
        return false;
    }
    marcarValido(input);
    return true;
}

/** Valida al salir del campo y, si ya tenía error, mientras la persona lo corrige. */
export function vincularValidacion(input, regla) {
    input.addEventListener('blur', () => validarCampo(input, regla));
    input.addEventListener('input', () => {
        if (input.classList.contains('is-invalid')) validarCampo(input, regla);
    });
}

/** Lleva el cursor al primer campo con error. */
export function enfocarPrimerError(contenedor) {
    const campo = contenedor.querySelector('.is-invalid');
    if (campo) campo.focus();
}

/** Dibuja la barra de seguridad de la contraseña dentro de `contenedor`. */
export function pintarMedidorPassword(contenedor, password) {
    if (!password) {
        contenedor.innerHTML = '';
        return;
    }
    const { puntaje, etiqueta } = evaluarPassword(password);
    const colores = ['#C0392B', '#E67E22', '#E2A33B', '#7FB069', '#2E7D32'];
    contenedor.innerHTML = `
        <div class="password-meter-bar"><span style="width:${(puntaje + 1) * 20}%;background:${colores[puntaje]}"></span></div>
        <small class="password-meter-label">Seguridad: <strong>${etiqueta}</strong></small>`;
}
