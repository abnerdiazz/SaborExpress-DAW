import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { confirmar, toast } from '../../services/alertas.js';

const claseEnlace = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

/** Barra de navegación de los paneles de administración. */
export default function AdminNavbar() {
  const { sesionAdmin, cerrarSesion } = useAuth();
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [cuentaAbierta, setCuentaAbierta] = useState(false);
  const cuentaRef = useRef(null);

  useEffect(() => {
    setMenuAbierto(false);
    setCuentaAbierta(false);
  }, [ubicacion.pathname]);

  useEffect(() => {
    if (!cuentaAbierta) return undefined;
    const alHacerClic = evento => {
      if (cuentaRef.current && !cuentaRef.current.contains(evento.target)) setCuentaAbierta(false);
    };
    document.addEventListener('mousedown', alHacerClic);
    return () => document.removeEventListener('mousedown', alHacerClic);
  }, [cuentaAbierta]);

  async function salir() {
    setCuentaAbierta(false);
    const acepto = await confirmar({ titulo: '¿Cerrar sesión?', texto: 'Saldrás del panel de administración.', confirmText: 'Sí, cerrar sesión' });
    if (!acepto) return;
    cerrarSesion('admin');
    toast('Sesión cerrada.', 'info');
    navegar('/login');
  }

  return (
    <nav className="navbar navbar-expand-lg admin-wireframe-navbar sticky-top" aria-label="Navegación administrativa">
      <div className="container-fluid px-3 px-lg-5">
        <Link className="navbar-brand admin-wireframe-brand" to="/admin/pedidos">
          <img src="/img/logo.png" alt="Logo de SaborExpress" className="brand-logo" width="48" height="48" />
          <span>SaborExpress Admin</span>
        </Link>
        <button
          className="navbar-toggler border-0"
          type="button"
          aria-controls="adminNavbar"
          aria-expanded={menuAbierto}
          aria-label="Abrir navegación"
          onClick={() => setMenuAbierto(valor => !valor)}
        >
          <span className="navbar-toggler-icon" />
        </button>
        <div className={`collapse navbar-collapse${menuAbierto ? ' show' : ''}`} id="adminNavbar">
          <ul className="navbar-nav ms-auto align-items-lg-center gap-lg-3">
            <li className="nav-item"><NavLink className={claseEnlace} to="/admin/pedidos">Pedidos</NavLink></li>
            <li className="nav-item"><NavLink className={claseEnlace} to="/admin/menu">Menú</NavLink></li>
            <li className="nav-item"><NavLink className={claseEnlace} to="/admin/reportes">Reportes</NavLink></li>
            <li className="nav-item dropdown ms-lg-2" ref={cuentaRef}>
              <button className="btn admin-account-btn dropdown-toggle" type="button" aria-expanded={cuentaAbierta} onClick={() => setCuentaAbierta(valor => !valor)}>
                <i className="bi bi-person-circle me-1" />
                <span>{sesionAdmin?.name || 'Administrador'}</span>
              </button>
              <ul className={`dropdown-menu dropdown-menu-end${cuentaAbierta ? ' show' : ''}`} {...(cuentaAbierta ? { 'data-bs-popper': 'static' } : {})}>
                <li><span className="dropdown-item-text small text-secondary">{sesionAdmin?.email}</span></li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <button className="dropdown-item text-danger" type="button" onClick={salir}>
                    <i className="bi bi-box-arrow-right me-2" />Cerrar sesión
                  </button>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
