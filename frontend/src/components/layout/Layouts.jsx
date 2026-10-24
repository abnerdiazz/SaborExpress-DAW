import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import AdminNavbar from './AdminNavbar.jsx';
import Footer from './Footer.jsx';

/** Páginas de la tienda: barra de navegación, contenido y pie. */
export function StoreLayout() {
  return (
    <div className="store-page d-flex flex-column min-vh-100">
      <Navbar />
      <main className="store-main flex-grow-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

/** Paneles de administración. */
export function AdminLayout() {
  return (
    <div className="admin-wireframe-page">
      <AdminNavbar />
      <main className="admin-wireframe-main">
        <div className="container-fluid px-3 px-lg-5">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

/** Inicio de sesión y registro: tarjeta centrada sin barra de navegación. */
export function AuthLayout() {
  return (
    <div className="login-page d-flex align-items-center justify-content-center">
      <Outlet />
    </div>
  );
}
