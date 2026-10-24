import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AdminLayout, AuthLayout, StoreLayout } from './components/layout/Layouts.jsx';
import { RutaAdmin, RutaCliente } from './components/layout/RutasProtegidas.jsx';
import ScrollToTop from './components/layout/ScrollToTop.jsx';
import Spinner from './components/ui/Spinner.jsx';
import HomePage from './pages/HomePage.jsx';
import NosotrosPage from './pages/NosotrosPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

// Cada página se descarga solo cuando se visita (división de código): el sitio carga más rápido.
const MenuPage = lazy(() => import('./pages/MenuPage.jsx'));
const CarritoPage = lazy(() => import('./pages/CarritoPage.jsx'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage.jsx'));
const MisPedidosPage = lazy(() => import('./pages/MisPedidosPage.jsx'));
const ContactoPage = lazy(() => import('./pages/ContactoPage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const RegistroPage = lazy(() => import('./pages/RegistroPage.jsx'));
const PedidosPage = lazy(() => import('./pages/admin/PedidosPage.jsx'));
const AdminMenuPage = lazy(() => import('./pages/admin/AdminMenuPage.jsx'));
const ReportesPage = lazy(() => import('./pages/admin/ReportesPage.jsx'));

/** Mapa de rutas de la aplicación (el enrutador y los proveedores se montan en main.jsx). */
export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<Spinner texto="Cargando página..." />}>
        <Routes>
          <Route element={<StoreLayout />}>
            <Route index element={<HomePage />} />
            <Route path="menu" element={<MenuPage />} />
            <Route path="nosotros" element={<NosotrosPage />} />
            <Route path="contacto" element={<ContactoPage />} />
            <Route path="carrito" element={<CarritoPage />} />
            <Route path="mis-pedidos" element={<MisPedidosPage />} />
            <Route element={<RutaCliente />}>
              <Route path="checkout" element={<CheckoutPage />} />
            </Route>
          </Route>

          <Route element={<AuthLayout />}>
            <Route path="login" element={<LoginPage />} />
            <Route path="registro" element={<RegistroPage />} />
          </Route>

          <Route path="admin" element={<RutaAdmin />}>
            <Route element={<AdminLayout />}>
              <Route index element={<PedidosPage />} />
              <Route path="pedidos" element={<PedidosPage />} />
              <Route path="menu" element={<AdminMenuPage />} />
              <Route path="reportes" element={<ReportesPage />} />
            </Route>
          </Route>

          <Route element={<StoreLayout />}>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
