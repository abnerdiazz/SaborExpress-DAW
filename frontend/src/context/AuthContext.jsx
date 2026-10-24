import { createContext, useCallback, useContext, useMemo } from 'react';
import { useStoredValue } from '../hooks/useStoredValue.js';
import { borrarClave, escribirJSON, leerJSON } from '../services/store.js';
import {
  CLAVE_SESION, CLAVE_SESION_ADMIN, CLAVE_USUARIOS,
  claveSesion, crearSesion, sesionConRol
} from '../services/auth.js';

const VACIO = [];
const AuthContext = createContext(null);

/** Sesión del cliente, sesión del administrador y cuentas registradas. */
export function AuthProvider({ children }) {
  const sesionCliente = useStoredValue(CLAVE_SESION, null);
  const sesionAdminCruda = useStoredValue(CLAVE_SESION_ADMIN, null);
  const usuariosCrudos = useStoredValue(CLAVE_USUARIOS, VACIO);

  const sesion = useMemo(() => sesionConRol(sesionCliente, 'cliente'), [sesionCliente]);
  const sesionAdmin = useMemo(() => sesionConRol(sesionAdminCruda, 'admin'), [sesionAdminCruda]);
  const usuarios = useMemo(() => (Array.isArray(usuariosCrudos) ? usuariosCrudos : VACIO), [usuariosCrudos]);

  const iniciarSesion = useCallback(usuario => {
    escribirJSON(claveSesion(usuario.role), crearSesion(usuario));
  }, []);

  const cerrarSesion = useCallback((rol = 'cliente') => borrarClave(claveSesion(rol)), []);

  /** Guarda la cuenta nueva y deja la sesión iniciada. */
  const registrarUsuario = useCallback(nuevo => {
    const actuales = leerJSON(CLAVE_USUARIOS, []);
    escribirJSON(CLAVE_USUARIOS, [...(Array.isArray(actuales) ? actuales : []), nuevo]);
    escribirJSON(CLAVE_SESION, crearSesion({ name: nuevo.name, email: nuevo.email, role: 'cliente' }));
  }, []);

  const valor = useMemo(
    () => ({ sesion, sesionAdmin, usuarios, iniciarSesion, cerrarSesion, registrarUsuario }),
    [sesion, sesionAdmin, usuarios, iniciarSesion, cerrarSesion, registrarUsuario]
  );
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  return contexto;
}
