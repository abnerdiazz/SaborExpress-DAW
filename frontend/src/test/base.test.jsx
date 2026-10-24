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

const envoltura = ({ children }) => <AppProviders>{children}</AppProviders>;

describe('Contextos de estado global', () => {
  it('Catálogo: guarda el menú base la primera vez y oculta los productos inactivos', async () => {
    const { result } = renderHook(() => useCatalog(), { wrapper: envoltura });
    await waitFor(() => expect(leerJSON('saborExpressProductos', null)).toHaveLength(PRODUCTOS_INICIALES.length));
    expect(result.current.productos).toHaveLength(15);
    act(() => result.current.guardar(result.current.todos.map(p => (p.id === 'pup-loca' ? { ...p, activo: false } : p))));
    expect(result.current.productos).toHaveLength(14);
    expect(result.current.todos).toHaveLength(15);
  });

  it('Carrito: respeta el tope de 20 por producto y recorta lo que no cabe', () => {
    const { result } = renderHook(() => useCart(), { wrapper: envoltura });
    const producto = PRODUCTOS_INICIALES[0];
    let primero;
    act(() => { primero = result.current.agregar(producto, 18); });
    expect(primero).toEqual({ agregadas: 18, recortado: false });
    expect(result.current.carrito[0].cantidad).toBe(18);
    let segundo;
    act(() => { segundo = result.current.agregar(producto, 5); });
    expect(segundo).toEqual({ agregadas: 2, recortado: true });
    expect(result.current.carrito[0].cantidad).toBe(20);
  });

  it('Carrito: suma, resta y quita; el contador y el subtotal se recalculan', () => {
    const { result } = renderHook(() => useCart(), { wrapper: envoltura });
    const revuelta = PRODUCTOS_INICIALES.find(p => p.id === 'pup-revuelta');
    const loca = PRODUCTOS_INICIALES.find(p => p.id === 'pup-loca');
    act(() => { result.current.agregar(revuelta, 2); });
    act(() => { result.current.agregar(loca, 1); });
    expect(result.current.unidades).toBe(3);
    expect(result.current.subtotal).toBeCloseTo(0.85 * 2 + 1.5);
    act(() => { result.current.incrementar(revuelta.id); });
    expect(result.current.unidades).toBe(4);
    act(() => { result.current.decrementar(loca.id); });
    expect(result.current.carrito.map(i => i.productoId)).toEqual([revuelta.id]);
    act(() => { result.current.vaciar(); });
    expect(result.current.carrito).toEqual([]);
  });

  it('Carrito: dos clics seguidos no se pisan aunque la pantalla aún no se haya redibujado', () => {
    const { result } = renderHook(() => useCart(), { wrapper: envoltura });
    const producto = PRODUCTOS_INICIALES[0];
    act(() => {
      result.current.agregar(producto, 1);
      result.current.agregar(producto, 1);
    });
    expect(result.current.carrito[0].cantidad).toBe(2);
  });

  it('Carrito: el tope también aplica al subir de uno en uno', () => {
    escribirJSON('saborExpressCart', [itemCarrito({ cantidad: 20 })]);
    const { result } = renderHook(() => useCart(), { wrapper: envoltura });
    let resultado;
    act(() => { resultado = result.current.incrementar('pup-revuelta'); });
    expect(resultado).toBe(false);
    let agregar;
    act(() => { agregar = result.current.agregar(PRODUCTOS_INICIALES[0], 1); });
    expect(agregar).toEqual({ agregadas: 0, sinCambio: true });
  });

  it('Sesión: registrar deja la sesión de cliente iniciada; cerrar solo cierra la del rol indicado', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: envoltura });
    act(() => result.current.registrarUsuario({ name: 'Ana', email: 'ana@correo.com', phone: '7890-1234', password: 'Cliente123' }));
    expect(result.current.sesion).toMatchObject({ name: 'Ana', role: 'cliente' });
    expect(result.current.usuarios).toHaveLength(1);
    act(() => result.current.iniciarSesion({ name: 'Carlos', email: 'admin@saborexpress.com', role: 'admin' }));
    expect(result.current.sesionAdmin).toMatchObject({ role: 'admin' });
    act(() => result.current.cerrarSesion('admin'));
    expect(result.current.sesionAdmin).toBeNull();
    expect(result.current.sesion).not.toBeNull();
  });

  it('Pedidos: crea con número consecutivo y cambia el estado', () => {
    const { result } = renderHook(() => useOrders(), { wrapper: envoltura });
    let creado;
    act(() => { creado = result.current.crearPedido({ cliente: 'Ana', email: 'ana@correo.com', total: 2, items: [] }); });
    expect(creado).toMatchObject({ id: 'SE-0001', estado: 'Pendiente' });
    expect(creado.creadoEn).toBeInstanceOf(Date);
    let ok;
    act(() => { ok = result.current.actualizarEstado('SE-0001', 'Preparando'); });
    expect(ok).toBe(true);
    expect(result.current.pedidos[0].estado).toBe('Preparando');
    expect(result.current.actualizarEstado('SE-9999', 'Entregado')).toBe(false);
    expect(result.current.buscarPedido('SE-0001').estado).toBe('Preparando');
  });
});

describe('Navegación y rutas', () => {
  it('Inicio muestra el título principal y las especialidades', async () => {
    renderApp('/');
    expect(screen.getByRole('heading', { name: /las mejores pupusas, directo a tu puerta/i })).toBeInTheDocument();
    expect(screen.getByText('Pupusa revuelta')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver Menú' })).toHaveAttribute('href', '/menu');
  });

  it('Nosotros muestra la historia, el equipo y la galería', () => {
    renderApp('/nosotros');
    expect(screen.getByRole('heading', { name: 'Nuestra Historia' })).toBeInTheDocument();
    expect(screen.getByText('Doña Teresa Ortiz')).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: /Nuestra parrilla|Salón familiar/ })).toHaveLength(2);
  });

  it('una dirección que no existe muestra la página 404', () => {
    renderApp('/no-existe');
    expect(screen.getByText('No encontramos esa página')).toBeInTheDocument();
  });

  it('el contador del carrito sale del almacenamiento y se actualiza con el evento storage de otra pestaña', async () => {
    escribirJSON('saborExpressCart', [itemCarrito({ cantidad: 3 })]);
    renderApp('/');
    expect(screen.getByTestId('contador-carrito')).toHaveTextContent('3');
    // Otra pestaña cambia el carrito: se escribe el dato y el navegador dispara `storage`.
    window.localStorage.setItem('saborExpressCart', JSON.stringify([itemCarrito({ cantidad: 7 })]));
    act(() => { window.dispatchEvent(new StorageEvent('storage', { key: 'saborExpressCart' })); });
    expect(screen.getByTestId('contador-carrito')).toHaveTextContent('7');
  });

  it('el menú de la cuenta ofrece iniciar sesión o crear cuenta a quien no tiene sesión', async () => {
    const usuario = userEvent.setup();
    renderApp('/');
    await usuario.click(screen.getByRole('button', { name: /mi cuenta/i }));
    expect(screen.getByRole('link', { name: /iniciar sesión/i })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: /crear cuenta/i })).toHaveAttribute('href', '/registro');
  });

  it('con sesión muestra el primer nombre y permite cerrarla con confirmación', async () => {
    const usuario = userEvent.setup();
    sembrarCliente();
    renderApp('/');
    const boton = screen.getByRole('button', { name: /Ana/ });
    await usuario.click(boton);
    await usuario.click(screen.getByRole('button', { name: /cerrar sesión/i }));
    expect(huboDialogo('¿Cerrar sesión?')).toBe(true);
    await waitFor(() => expect(window.localStorage.getItem('saborExpressSession')).toBeNull());
    expect(await screen.findByRole('button', { name: /mi cuenta/i })).toBeInTheDocument();
  });

  it('si la persona cancela la confirmación, la sesión sigue abierta', async () => {
    const usuario = userEvent.setup();
    sembrarCliente();
    renderApp('/');
    Swal.fire.mockResolvedValueOnce({ isConfirmed: false, isDismissed: true });
    await usuario.click(screen.getByRole('button', { name: /Ana/ }));
    await usuario.click(screen.getByRole('button', { name: /cerrar sesión/i }));
    await waitFor(() => expect(huboDialogo('¿Cerrar sesión?')).toBe(true));
    expect(window.localStorage.getItem('saborExpressSession')).not.toBeNull();
  });
});
