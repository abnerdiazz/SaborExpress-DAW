import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

/** Solo clientes con sesión. Quien no la tiene va al login y vuelve después a donde iba. */
export function RutaCliente() {
  const { sesion } = useAuth();
  const ubicacion = useLocation();
  if (!sesion) return <Navigate to={`/login?redirect=${encodeURIComponent(ubicacion.pathname)}`} replace />;
  return <Outlet />;
}

/** Solo administradores con sesión. */
export function RutaAdmin() {
  const { sesionAdmin } = useAuth();
  const ubicacion = useLocation();
  if (!sesionAdmin) return <Navigate to={`/login?redirect=${encodeURIComponent(ubicacion.pathname)}`} replace />;
  return <Outlet />;
}
