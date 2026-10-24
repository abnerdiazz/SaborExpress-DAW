/**
 * auth.js
 * ---------------------------------------------------------------------------
 * Sesión y usuarios. Hay dos sesiones independientes: la del cliente (tienda)
 * y la del administrador (paneles). Una nunca se refleja en la otra.
 * ---------------------------------------------------------------------------
 */

export const CLAVE_SESION = 'saborExpressSession';
export const CLAVE_SESION_ADMIN = 'saborExpressAdminSession';
export const CLAVE_USUARIOS = 'saborExpressUsers';

/** Cuenta de demostración del administrador (credenciales públicas, solo para pruebas). */
export const ADMIN_DEMO = {
  email: 'admin@saborexpress.com',
  password: 'Admin123',
  name: 'Carlos M.',
  role: 'admin'
};

export const CORREO_RESERVADO = ADMIN_DEMO.email;

/** Devuelve la sesión solo si tiene el rol esperado. */
export function sesionConRol(valor, rol) {
  return valor && typeof valor === 'object' && valor.role === rol ? valor : null;
}

export function crearSesion(usuario) {
  return {
    name: usuario.name,
    email: usuario.email,
    role: usuario.role,
    loginAt: new Date().toISOString()
  };
}

export const claveSesion = rol => (rol === 'admin' ? CLAVE_SESION_ADMIN : CLAVE_SESION);

/**
 * Valida el destino al que se vuelve después de iniciar sesión: solo rutas internas.
 * Un cliente nunca es enviado a un panel de administración, ni al revés.
 */
export function destinoSeguro(redirect, rol) {
  const valida = typeof redirect === 'string' && /^\/[a-zA-Z0-9/_-]*$/.test(redirect) && !redirect.startsWith('//');
  const esPanel = valida && redirect.startsWith('/admin');
  if (rol === 'admin') return esPanel ? redirect : '/admin/reportes';
  return valida && !esPanel ? redirect : '/mis-pedidos';
}

export const vieneDeUnPanel = redirect =>
  typeof redirect === 'string' && /^\/admin(\/|$)/.test(redirect);
