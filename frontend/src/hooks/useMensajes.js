import { useMemo } from 'react';
import { CLAVE_MENSAJES, contarNoLeidos, normalizarMensajes } from '../services/mensajes.js';
import { useStoredValue } from './useStoredValue.js';

const VACIO = [];

/**
 * Mensajes de contacto recibidos. Se actualizan solos cuando llega uno nuevo desde
 * otra pestaña (el cliente escribe en Contacto y el administrador lo ve sin recargar).
 */
export function useMensajes() {
  const crudos = useStoredValue(CLAVE_MENSAJES, VACIO);
  const mensajes = useMemo(() => normalizarMensajes(crudos), [crudos]);
  const noLeidos = useMemo(() => contarNoLeidos(mensajes), [mensajes]);
  return { mensajes, noLeidos };
}
