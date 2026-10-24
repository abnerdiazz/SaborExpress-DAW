import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Swal from 'sweetalert2';
import App from '../App.jsx';
import AppProviders from '../context/AppProviders.jsx';
import { crearSesion } from '../services/auth.js';
import { escribirJSON } from '../services/store.js';

/** Dibuja la aplicación completa (enrutador + estado global) en la ruta indicada. */
export function renderApp(ruta = '/') {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <AppProviders>
        <App />
      </AppProviders>
    </MemoryRouter>
  );
}

export const sembrarCliente = (extra = {}) => {
  const usuario = { name: 'Ana Martínez', email: 'ana@correo.com', phone: '7890-1234', password: 'Cliente123', ...extra };
  escribirJSON('saborExpressUsers', [usuario]);
  escribirJSON('saborExpressSession', crearSesion({ name: usuario.name, email: usuario.email, role: 'cliente' }));
  return usuario;
};

export const sembrarAdmin = () =>
  escribirJSON('saborExpressAdminSession', crearSesion({ name: 'Carlos M.', email: 'admin@saborexpress.com', role: 'admin' }));

export const itemCarrito = (extra = {}) => ({
  productoId: 'pup-revuelta', nombre: 'Pupusa Revuelta', categoria: 'Pupusas', precio: 0.85, cantidad: 2,
  imagen: 'img/menú/pupusa-revuelta.png', ...extra
});

export const pedidoBase = (extra = {}) => ({
  id: 'SE-0001', cliente: 'Ana Martínez', email: 'ana@correo.com', telefono: '7890-1234', direccion: 'Calle Falsa 123, Escalón',
  referencia: '', pago: 'Efectivo (contra entrega)', subtotal: 1.7, envio: 1, total: 2.7, estado: 'Pendiente',
  creadoEn: new Date().toISOString(), ubicacion: null,
  items: [{ productoId: 'pup-revuelta', nombre: 'Pupusa Revuelta', categoria: 'Pupusas', precio: 0.85, cantidad: 2 }],
  ...extra
});

/** Llamadas hechas a SweetAlert2 (`Swal.fire`) con el título indicado. */
export const dialogos = titulo => Swal.fire.mock.calls.map(([o]) => o).filter(o => o?.title === titulo);
export const huboDialogo = titulo => dialogos(titulo).length > 0;
export { Swal };
