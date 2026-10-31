import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PRODUCTOS_INICIALES } from '../services/catalogo.js';
import { escribirJSON, leerJSON } from '../services/store.js';
import { Swal, dialogos, huboDialogo, itemCarrito, pedidoBase, renderApp, sembrarAdmin, sembrarCliente } from './utils.jsx';

// Las gráficas se dibujan en un <canvas> que jsdom no soporta: se reemplazan por dobles que exponen sus datos.
vi.mock('react-chartjs-2', () => ({
  Bar: props => (
    <button type="button" data-testid="grafica-ventas" aria-label={props['aria-label']}
      data-valores={JSON.stringify(props.data.datasets[0].data)} onClick={() => props.options.onClick(null, [{ index: 6 }])}>barras</button>
  ),
  Line: props => <div data-testid="grafica-pedidos" aria-label={props['aria-label']} data-valores={JSON.stringify(props.data.datasets[0].data)} />,
  Doughnut: props => <div data-testid={`dona-${props['aria-label']}`} data-etiquetas={JSON.stringify(props.data.labels)} />
}));

const hoy = (horas = 0) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setHours(d.getHours() - horas); return d.toISOString(); };
const hace = dias => { const d = new Date(); d.setDate(d.getDate() - dias); d.setHours(12, 0, 0, 0); return d.toISOString(); };

describe('Menú público', () => {
  it('muestra 6 productos por página y 3 páginas para los 15 del catálogo', async () => {
    const usuario = userEvent.setup();
    renderApp('/menu');
    expect(await screen.findByRole('heading', { name: 'Nuestro Menú' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(6);
    await usuario.click(screen.getByRole('button', { name: '3' }));
    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled();
  });

  it('busca por nombre y descripción, y muestra el mensaje cuando no hay resultados', async () => {
    const usuario = userEvent.setup();
    renderApp('/menu');
    await usuario.type(await screen.findByLabelText('Buscar especialidad'), 'loroco');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByText('Pupusa de Queso con Loroco')).toBeInTheDocument();
    await usuario.clear(screen.getByLabelText('Buscar especialidad'));
    await usuario.type(screen.getByLabelText('Buscar especialidad'), 'zzzz');
    expect(screen.getByText('No encontramos productos')).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('filtra por categoría y vuelve a la primera página', async () => {
    const usuario = userEvent.setup();
    renderApp('/menu');
    await screen.findByRole('heading', { name: 'Nuestro Menú' });
    await usuario.click(screen.getByRole('button', { name: '2' }));
    await usuario.click(screen.getByRole('button', { name: 'Postres' }));
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Postres' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('no muestra los productos que el administrador ocultó', async () => {
    escribirJSON('saborExpressProductos', PRODUCTOS_INICIALES.map(p => (p.categoria === 'Postres' ? { ...p, activo: false } : p)));
    const usuario = userEvent.setup();
    renderApp('/menu');
    await screen.findByRole('heading', { name: 'Nuestro Menú' });
    await usuario.click(screen.getByRole('button', { name: 'Postres' }));
    expect(screen.getByText('No encontramos productos')).toBeInTheDocument();
  });

  it('el selector de cantidad va de 1 a 20', async () => {
    const usuario = userEvent.setup();
    renderApp('/menu');
    const tarjeta = (await screen.findAllByRole('article'))[0];
    const cantidad = within(tarjeta).getByTestId('cantidad-pup-revuelta');
    await usuario.click(within(tarjeta).getByRole('button', { name: 'Disminuir cantidad' }));
    expect(cantidad).toHaveTextContent('1');
    for (let i = 0; i < 25; i += 1) await usuario.click(within(tarjeta).getByRole('button', { name: 'Aumentar cantidad' }));
    expect(cantidad).toHaveTextContent('20');
  });

  it('sin sesión, al agregar pide iniciar sesión o crear cuenta; "Iniciar sesión" lleva al login y vuelve al menú', async () => {
    const usuario = userEvent.setup();
    renderApp('/menu');
    await usuario.click((await screen.findAllByRole('button', { name: 'Agregar' }))[0]);
    expect(huboDialogo('Necesitas una cuenta')).toBe(true);
    expect(await screen.findByLabelText('Correo Electrónico')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Crear cuenta' }).getAttribute('href')).toContain('redirect=%2Fmenu');
    expect(leerJSON('saborExpressCart', [])).toEqual([]);
  });

  it('sin sesión, "Crear cuenta" lleva al registro y "Ahora no" se queda en el menú', async () => {
    const usuario = userEvent.setup();
    renderApp('/menu');
    Swal.fire.mockResolvedValueOnce({ isConfirmed: false, isDenied: true });
    await usuario.click((await screen.findAllByRole('button', { name: 'Agregar' }))[0]);
    expect(await screen.findByRole('heading', { name: 'Crear cuenta nueva' })).toBeInTheDocument();
  });

  it('sin sesión, "Ahora no" no cambia de página', async () => {
    const usuario = userEvent.setup();
    renderApp('/menu');
    Swal.fire.mockResolvedValueOnce({ isConfirmed: false, isDenied: false, isDismissed: true });
    await usuario.click((await screen.findAllByRole('button', { name: 'Agregar' }))[0]);
    await waitFor(() => expect(huboDialogo('Necesitas una cuenta')).toBe(true));
    expect(screen.getByRole('heading', { name: 'Nuestro Menú' })).toBeInTheDocument();
  });

  it('con sesión agrega al carrito la cantidad elegida y avisa con un toast', async () => {
    const usuario = userEvent.setup();
    sembrarCliente();
    renderApp('/menu');
    const tarjeta = (await screen.findAllByRole('article'))[0];
    await usuario.click(within(tarjeta).getByRole('button', { name: 'Aumentar cantidad' }));
    await usuario.click(within(tarjeta).getByRole('button', { name: 'Aumentar cantidad' }));
    await usuario.click(within(tarjeta).getByRole('button', { name: 'Agregar' }));
    expect(leerJSON('saborExpressCart', [])[0]).toMatchObject({ productoId: 'pup-revuelta', cantidad: 3, precio: 0.85 });
    expect(Swal.fire.mock.calls.some(([o]) => o.toast && /3 × Pupusa Revuelta agregado/.test(o.title))).toBe(true);
    expect(screen.getByTestId('contador-carrito')).toHaveTextContent('3');
  });

  it('avisa del tope de 20 unidades y no pasa de ahí', async () => {
    const usuario = userEvent.setup();
    sembrarCliente();
    escribirJSON('saborExpressCart', [itemCarrito({ cantidad: 20 })]);
    renderApp('/menu');
    await usuario.click((await screen.findAllByRole('button', { name: 'Agregar' }))[0]);
    const aviso = Swal.fire.mock.calls.map(([o]) => o).find(o => o.toast && /Máximo 20 unidades/.test(o.title));
    expect(aviso).toMatchObject({ icon: 'warning' });
    expect(leerJSON('saborExpressCart', [])[0].cantidad).toBe(20);
  });

  it('recorta lo que no cabe e indica el tope en el aviso', async () => {
    const usuario = userEvent.setup();
    sembrarCliente();
    escribirJSON('saborExpressCart', [itemCarrito({ cantidad: 19 })]);
    renderApp('/menu');
    const tarjeta = (await screen.findAllByRole('article'))[0];
    for (let i = 0; i < 4; i += 1) await usuario.click(within(tarjeta).getByRole('button', { name: 'Aumentar cantidad' }));
    await usuario.click(within(tarjeta).getByRole('button', { name: 'Agregar' }));
    expect(leerJSON('saborExpressCart', [])[0].cantidad).toBe(20);
    expect(Swal.fire.mock.calls.some(([o]) => o.toast && /1 × Pupusa Revuelta agregado.*tope de 20/.test(o.title))).toBe(true);
  });
});

describe('Reportes (Chart.js)', () => {
  const sembrarPedidos = () => escribirJSON('saborExpressPedidos', [
    pedidoBase({ id: 'SE-0001', creadoEn: hoy(), total: 10, estado: 'Entregado',
      items: [{ productoId: 'a', nombre: 'Pupusa Revuelta', categoria: 'Pupusas', precio: 1, cantidad: 4 }, { productoId: 'b', nombre: 'Café de Olla', categoria: 'Bebidas', precio: 2, cantidad: 3 }] }),
    pedidoBase({ id: 'SE-0002', creadoEn: hace(2), total: 5, estado: 'Pendiente', cliente: 'Luis Pérez',
      items: [{ productoId: 'a', nombre: 'Pupusa Revuelta', categoria: 'Pupusas', precio: 1, cantidad: 2 }] }),
    pedidoBase({ id: 'SE-0003', creadoEn: hace(3), total: 8, estado: 'Cancelado' }),
    pedidoBase({ id: 'SE-0004', creadoEn: hace(20), total: 7, estado: 'Entregado',
      items: [{ productoId: 'c', nombre: 'Arroz con Leche', categoria: 'Postres', precio: 1.5, cantidad: 2 }] })
  ]);

  it('muestra "sin datos" en cada gráfica cuando no hay pedidos', async () => {
    sembrarAdmin();
    renderApp('/admin/reportes');
    expect(await screen.findByRole('heading', { name: 'Reportes' })).toBeInTheDocument();
    expect(screen.getAllByText('Sin ventas en este período')).toHaveLength(2); // barras y categorías
    expect(screen.getAllByText('Sin pedidos en este período')).toHaveLength(2); // línea y estados
    expect(screen.getByTestId('metrica-pedidos')).toHaveTextContent('0');
    expect(screen.getByTestId('metrica-top')).toHaveTextContent('—');
  });

  it('calcula los indicadores de la última semana sin contar los cancelados', async () => {
    sembrarAdmin();
    sembrarPedidos();
    renderApp('/admin/reportes');
    await screen.findByRole('heading', { name: 'Reportes' });
    expect(screen.getByTestId('metrica-pedidos')).toHaveTextContent('2');
    expect(screen.getByTestId('metrica-ingresos')).toHaveTextContent('$15.00');
    expect(screen.getByText('$7.50')).toBeInTheDocument();
    expect(screen.getByTestId('metrica-top')).toHaveTextContent('Pupusa Revuelta');
    expect(JSON.parse(screen.getByTestId('grafica-ventas').dataset.valores)).toHaveLength(7);
    expect(screen.queryByText('Sin ventas en este período')).not.toBeInTheDocument();
  });

  it('el gráfico de estados sí incluye los pedidos cancelados', async () => {
    sembrarAdmin();
    sembrarPedidos();
    renderApp('/admin/reportes');
    await screen.findByRole('heading', { name: 'Reportes' });
    const dona = screen.getByTestId('dona-Gráfica de dona con los pedidos por estado');
    expect(JSON.parse(dona.dataset.etiquetas)).toEqual(['Pendiente', 'Entregado', 'Cancelado']);
  });

  it('cambia a "Último mes" y las cifras y la serie diaria se actualizan', async () => {
    const usuario = userEvent.setup();
    sembrarAdmin();
    sembrarPedidos();
    renderApp('/admin/reportes');
    await screen.findByRole('heading', { name: 'Reportes' });
    await usuario.click(screen.getByRole('button', { name: 'Último mes' }));
    expect(screen.getByTestId('metrica-pedidos')).toHaveTextContent('3');
    expect(JSON.parse(screen.getByTestId('grafica-ventas').dataset.valores)).toHaveLength(30);
    expect(screen.getByText('(Último Mes)')).toBeInTheDocument();
  });

  it('un clic en una barra abre el detalle de los pedidos de ese día', async () => {
    const usuario = userEvent.setup();
    sembrarAdmin();
    sembrarPedidos();
    renderApp('/admin/reportes');
    await usuario.click(await screen.findByTestId('grafica-ventas'));
    const detalle = Swal.fire.mock.calls.map(([o]) => o).find(o => o.html && o.html.includes('SE-0001'));
    expect(detalle.html).toContain('1</strong> pedido(s)');
    expect(detalle.html).toContain('$10.00');
    expect(detalle.html).not.toContain('SE-0002');
  });

  it('si el día no tuvo pedidos, el clic solo avisa con un toast', async () => {
    const usuario = userEvent.setup();
    sembrarAdmin();
    escribirJSON('saborExpressPedidos', [pedidoBase({ creadoEn: hace(2), total: 5 })]);
    renderApp('/admin/reportes');
    await usuario.click(await screen.findByTestId('grafica-ventas'));
    expect(Swal.fire.mock.calls.some(([o]) => o.toast && /No hubo pedidos el/.test(o.title))).toBe(true);
  });

  it('genera datos de demostración con confirmación, muestra el aviso y se pueden quitar sin tocar los reales', async () => {
    const usuario = userEvent.setup();
    sembrarAdmin();
    escribirJSON('saborExpressPedidos', [pedidoBase({ id: 'SE-0001', creadoEn: hoy(), total: 2.7 })]);
    renderApp('/admin/reportes');
    const quitar = await screen.findByRole('button', { name: /quitar demostración/i });
    expect(quitar).toBeDisabled();
    await usuario.click(screen.getByRole('button', { name: /datos de demostración/i }));
    expect(huboDialogo('¿Generar datos de demostración?')).toBe(true);
    expect(await screen.findByText(/Se están mostrando 45 pedidos de demostración/)).toBeInTheDocument();
    expect(quitar).toBeEnabled();
    await usuario.click(quitar);
    expect(huboDialogo('¿Quitar los datos de demostración?')).toBe(true);
    await waitFor(() => expect(screen.queryByText(/pedidos de demostración mezclados/)).not.toBeInTheDocument());
    const quedan = leerJSON('saborExpressPedidos', []);
    expect(quedan).toHaveLength(1);
    expect(quedan[0].id).toBe('SE-0001');
  });

  it('si se cancela la confirmación no se generan datos', async () => {
    const usuario = userEvent.setup();
    sembrarAdmin();
    renderApp('/admin/reportes');
    Swal.fire.mockResolvedValueOnce({ isConfirmed: false, isDismissed: true });
    await usuario.click(await screen.findByRole('button', { name: /datos de demostración/i }));
    expect(leerJSON('saborExpressPedidos', [])).toEqual([]);
  });

  it('el rango personalizado rechaza fechas invertidas y acepta un rango válido', async () => {
    const usuario = userEvent.setup();
    sembrarAdmin();
    sembrarPedidos();
    renderApp('/admin/reportes');
    await usuario.click(await screen.findByRole('button', { name: 'Personalizar rango' }));
    const dialogo = screen.getByRole('dialog');
    await usuario.type(within(dialogo).getByLabelText('Desde'), '2026-10-10');
    await usuario.type(within(dialogo).getByLabelText('Hasta'), '2026-10-01');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Aplicar rango' }));
    expect(huboDialogo('Rango de fechas no válido')).toBe(true);
    expect(within(dialogo).getByRole('alert')).toHaveTextContent('Selecciona un rango de fechas válido.');
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await usuario.clear(within(dialogo).getByLabelText('Hasta'));
    await usuario.type(within(dialogo).getByLabelText('Hasta'), '2026-10-20');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Aplicar rango' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Última semana' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText(/\(10\/10\/2026 – 20\/10\/2026\)/)).toBeInTheDocument();
  });

  it('el modal del rango se cierra con Esc y con Cancelar', async () => {
    const usuario = userEvent.setup();
    sembrarAdmin();
    renderApp('/admin/reportes');
    await usuario.click(await screen.findByRole('button', { name: 'Personalizar rango' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await usuario.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Personalizar rango' }));
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('busca categorías en la tabla y exporta el CSV', async () => {
    const usuario = userEvent.setup();
    sembrarAdmin();
    sembrarPedidos();
    const crear = vi.fn(() => 'blob:prueba');
    const revocar = vi.fn();
    URL.createObjectURL = crear;
    URL.revokeObjectURL = revocar;
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    renderApp('/admin/reportes');
    await screen.findByRole('heading', { name: 'Reportes' });
    const tabla = screen.getByRole('table');
    expect(within(tabla).getByText('Pupusas')).toBeInTheDocument();
    expect(within(tabla).getByText('Bebidas')).toBeInTheDocument();
    await usuario.type(screen.getByLabelText('Buscar categoría'), 'beb');
    expect(within(tabla).queryByText('Pupusas')).not.toBeInTheDocument();
    await usuario.type(screen.getByLabelText('Buscar categoría'), 'zzz');
    expect(screen.getByText('No se encontraron categorías con ese criterio.')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: /CSV/ }));
    expect(crear).toHaveBeenCalledTimes(1);
    expect(crear.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect(clic).toHaveBeenCalled();
    expect(Swal.fire.mock.calls.some(([o]) => o.toast && /CSV descargado/.test(o.title))).toBe(true);
    clic.mockRestore();
  });

  it('los reportes se actualizan solos cuando otra pestaña confirma un pedido', async () => {
    sembrarAdmin();
    renderApp('/admin/reportes');
    await screen.findByRole('heading', { name: 'Reportes' });
    expect(screen.getByTestId('metrica-pedidos')).toHaveTextContent('0');
    window.localStorage.setItem('saborExpressPedidos', JSON.stringify([pedidoBase({ creadoEn: hoy(), total: 2.7 })]));
    act(() => { window.dispatchEvent(new StorageEvent('storage', { key: 'saborExpressPedidos' })); });
    expect(screen.getByTestId('metrica-pedidos')).toHaveTextContent('1');
    expect(screen.getByTestId('metrica-ingresos')).toHaveTextContent('$2.70');
  });
});
