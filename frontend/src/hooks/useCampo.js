import { useCallback, useRef, useState } from 'react';

/**
 * Estado y validación de un campo de formulario.
 *  - `regla(valor)` devuelve '' si es válido o el mensaje de error (ver services/validaciones.js).
 *  - Valida al salir del campo y, una vez mostrado un error, mientras se corrige.
 *  - `formatear` transforma lo escrito (por ejemplo el teléfono 7777-7777).
 */
export function useCampo(regla, inicial = '', { formatear } = {}) {
  const [valor, setValorEstado] = useState(inicial);
  const [error, setError] = useState('');
  const [tocado, setTocado] = useState(false);
  const valorRef = useRef(inicial);
  const reglaRef = useRef(regla);
  reglaRef.current = regla;

  const setValor = useCallback(nuevo => {
    valorRef.current = nuevo;
    setValorEstado(nuevo);
  }, []);

  const validar = useCallback(() => {
    const mensaje = reglaRef.current(valorRef.current);
    setError(mensaje);
    setTocado(true);
    return mensaje === '';
  }, []);

  const alCambiar = useCallback(evento => {
    let nuevo = evento.target.value;
    if (formatear) nuevo = formatear(nuevo);
    setValor(nuevo);
    if (tocado) setError(reglaRef.current(nuevo));
  }, [formatear, setValor, tocado]);

  const reiniciar = useCallback((nuevo = '') => {
    setValor(nuevo);
    setError('');
    setTocado(false);
  }, [setValor]);

  const mostrarError = useCallback(mensaje => {
    setError(mensaje);
    setTocado(true);
  }, []);

  return {
    valor,
    error,
    tocado,
    estado: error ? 'invalido' : tocado ? 'valido' : '',
    setValor,
    validar,
    reiniciar,
    mostrarError,
    props: { value: valor, onChange: alCambiar, onBlur: validar }
  };
}

/** Valida varios campos a la vez; devuelve true solo si todos son válidos (no se corta en el primero). */
export const validarTodos = campos => campos.map(campo => campo.validar()).every(Boolean);

/** Lleva el foco al primer campo con error de un formulario (después de que React pinte los errores). */
export function enfocarPrimerError(contenedor) {
  setTimeout(() => contenedor?.querySelector('.is-invalid')?.focus(), 0);
}
