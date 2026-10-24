import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { confirmar, toast } from '../../services/alertas.js';
import { PRIMER_NOMBRE } from '../../services/compra.js';

const ENLACES = [
  ['/', 'Inicio', true],
  ['/menu', 'Menú'],
  ['/nosotros', 'Nosotros'],
  ['/contacto', 'Contacto'],
  ['/mis-pedidos', 'Mis Pedidos']
];

const claseEnlace = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

/** Barra de navegación de la tienda: enlaces, contador del carrito y menú de la cuenta. */
export default function Navbar() {
  const { sesion, cerrarSesion } = useAuth();
  const { unidades } = useCart();
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [cuentaAbierta, setCuentaAbierta] = useState(false);
  const cuentaRef = useRef(null);

  // Al cambiar de página se cierran los menús.
  useEffect(() => {
    setMenuAbierto(false);
    setCuentaAbierta(false);
  }, [ubicacion.pathname]);

  // Un clic fuera del menú de la cuenta lo cierra.
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
    const acepto = await confirmar({
      titulo: '¿Cerrar sesión?',
      texto: 'Tu carrito se conserva en este navegador.',
      confirmText: 'Sí, cerrar sesión'
    });
    if (!acepto) return;
    cerrarSesion();
    toast('Sesión cerrada.', 'info');
    navegar('/');
  }

  return (
    <header>
      <nav className="navbar navbar-expand-lg store-navbar fixed-top" aria-label="Navegación principal">
        <div className="container">
          <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
            <img src="/img/logo.png" alt="Logo de SaborExpress" className="brand-logo" />
            <span className="brand-name">SaborExpress</span>
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            aria-controls="storeMenu"
            aria-expanded={menuAbierto}
            aria-label="Abrir navegación"
            onClick={() => setMenuAbierto(valor => !valor)}
          >
            <span className="navbar-toggler-icon" />
          </button>
          <div className={`collapse navbar-collapse${menuAbierto ? ' show' : ''}`} id="storeMenu">
            <ul className="navbar-nav mx-auto align-items-lg-center gap-lg-2">
              {ENLACES.map(([ruta, texto, exacto]) => (
                <li className="nav-item" key={ruta}>
                  <NavLink className={claseEnlace} to={ruta} end={Boolean(exacto)}>{texto}</NavLink>
                </li>
              ))}
              <li className="nav-item">
                <NavLink className={({ isActive }) => `nav-link cart-pill${isActive ? ' active' : ''}`} to="/carrito">
                  <i className="bi bi-cart3 me-1" /> Carrito (<span data-testid="contador-carrito">{unidades}</span>)
                </NavLink>
              </li>
            </ul>
            <div className="dropdown mt-3 mt-lg-0" ref={cuentaRef}>
              <button
                className="account-link btn p-0 dropdown-toggle"
                type="button"
                aria-expanded={cuentaAbierta}
                onClick={() => setCuentaAbierta(valor => !valor)}
              >
                <span className="account-icon"><i className="bi bi-person" /></span>
                <span>{sesion ? PRIMER_NOMBRE(sesion.name) || 'Mi cuenta' : 'Mi cuenta'}</span>
              </button>
              <ul className={`dropdown-menu dropdown-menu-end${cuentaAbierta ? ' show' : ''}`} {...(cuentaAbierta ? { 'data-bs-popper': 'static' } : {})}>
                {sesion ? (
                  <>
                    <li><Link className="dropdown-item" to="/mis-pedidos"><i className="bi bi-receipt me-2" />Mis Pedidos</Link></li>
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <button className="dropdown-item text-danger" type="button" onClick={salir}>
                        <i className="bi bi-box-arrow-right me-2" />Cerrar sesión
                      </button>
                    </li>
                  </>
                ) : (
                  <>
                    <li><Link className="dropdown-item" to="/login"><i className="bi bi-box-arrow-in-right me-2" />Iniciar sesión</Link></li>
                    <li><Link className="dropdown-item" to="/registro"><i className="bi bi-person-plus me-2" />Crear cuenta</Link></li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
