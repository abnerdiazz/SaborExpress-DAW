import { act, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import AppProviders from '../context/AppProviders.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';
import { useOrders } from '../context/OrdersContext.jsx';
import { PRODUCTOS_INICIALES } from '../services/catalogo.js';
import { escribirJSON, leerJSON } from '../services/store.js';
import { Swal, huboDialogo, itemCarrito, pedidoBase, renderApp, sembrarAdmin, sembrarCliente } from './utils.jsx';


describe('Rutas protegidas', () => {
  it('el checkout sin sesión lleva al login y recuerda a dónde volver', async () => {
    renderApp('/checkout');
    expect(await screen.findByRole('heading', { name: 'SaborExpress' })).toBeInTheDocument();
    expect(screen.getByLabelText('Correo Electrónico')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Crear cuenta' }).getAttribute('href')).toContain('redirect=%2Fcheckout');
  });

  it('los paneles de administración sin sesión de administrador llevan al login', async () => {
    renderApp('/admin/pedidos');
    expect(await screen.findByLabelText('Correo Electrónico')).toBeInTheDocument();
  });

  it('una sesión de cliente no da acceso a los paneles de administración', async () => {
    sembrarCliente();
    renderApp('/admin/reportes');
    expect(await screen.findByLabelText('Correo Electrónico')).toBeInTheDocument();
  });

  it('con sesión de administrador se abre el panel y se puede salir con confirmación', async () => {
    const usuario = userEvent.setup();
    sembrarAdmin();
    escribirJSON('saborExpressPedidos', [pedidoBase()]);
    renderApp('/admin/pedidos');
    expect(await screen.findByRole('heading', { name: 'Pedidos' })).toBeInTheDocument();
    expect(screen.getByText('SaborExpress Admin')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: /Carlos M\./ }));
    expect(screen.getByText('admin@saborexpress.com')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: /cerrar sesión/i }));
    await waitFor(() => expect(window.localStorage.getItem('saborExpressAdminSession')).toBeNull());
    expect(await screen.findByLabelText('Correo Electrónico')).toBeInTheDocument();
  });

  it('el menú del administrador navega entre los tres paneles', async () => {
    const usuario = userEvent.setup();
    sembrarAdmin();
    renderApp('/admin');
    expect(await screen.findByRole('heading', { name: 'Pedidos' })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: /administrativa/i });
    await usuario.click(within(nav).getByRole('link', { name: 'Menú' }));
    expect(await screen.findByRole('heading', { name: 'Menú' })).toBeInTheDocument();
  });
});
