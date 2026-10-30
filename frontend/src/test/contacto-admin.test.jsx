import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PRODUCTOS_INICIALES } from '../services/catalogo.js';
import { guardarMensaje } from '../services/mensajes.js';
import { escribirJSON, leerJSON } from '../services/store.js';
import { Swal, dialogos, huboDialogo, pedidoBase, renderApp, sembrarAdmin } from './utils.jsx';

// El envío simulado espera 900 ms; en las pruebas no hace falta esperar.
vi.mock('../services/alertas.js', async original => ({ ...(await original()), esperar: () => Promise.resolve() }));

const escribir = async (usuario, etiqueta, texto) => {
  const campo = screen.getByLabelText(etiqueta);
  await usuario.clear(campo);
  await usuario.type(campo, texto);
  return campo;
};

describe('Contacto', () => {
  it('al enviar vacío marca los campos obligatorios y el teléfono (opcional) queda sin error', async () => {
    const usuario = userEvent.setup();
    renderApp('/contacto');
    await usuario.click(await screen.findByRole('button', { name: 'Enviar mensaje' }));
    expect(await screen.findByText('Ingresa tu nombre completo.')).toBeInTheDocument();
    expect(screen.getByText('Ingresa tu correo electrónico.')).toBeInTheDocument();
    expect(screen.getByText('Ingresa el asunto.')).toBeInTheDocument();
    expect(screen.getByText('Ingresa tu mensaje.')).toBeInTheDocument();
    expect(document.querySelectorAll('.is-invalid')).toHaveLength(4);
    expect(screen.getByLabelText('Teléfono')).not.toHaveClass('is-invalid');
  });

  it('cuenta los caracteres del mensaje hasta 500 y limita la longitud', async () => {
    const usuario = userEvent.setup();
    renderApp('/contacto');
    const mensaje = await screen.findByLabelText('Mensaje');
    expect(screen.getByText('0/500')).toBeInTheDocument();
    await usuario.type(mensaje, 'Hola, quiero un pedido');
    expect(screen.getByText('22/500')).toBeInTheDocument();
    expect(mensaje).toHaveAttribute('maxlength', '500');
  });

  it('el teléfono es opcional, pero si se escribe debe ser válido y se formatea', async () => {
    const usuario = userEvent.setup();
    renderApp('/contacto');
    const telefono = await escribir(usuario, 'Teléfono', '12');
    await usuario.tab();
    expect(await screen.findByText('Escribe 8 dígitos, por ejemplo 7777-7777.')).toBeInTheDocument();
    await usuario.clear(telefono);
    await usuario.type(telefono, '78901234');
    expect(telefono).toHaveValue('7890-1234');
  });

  it('valida longitudes mínimas del asunto y del mensaje', async () => {
    const usuario = userEvent.setup();
    renderApp('/contacto');
    await escribir(usuario, 'Asunto', 'Hola');
    await escribir(usuario, 'Mensaje', 'Corto');
    await usuario.tab();
    expect(await screen.findAllByText(/Escribe al menos/)).toHaveLength(2);
  });

  it('envía, guarda el mensaje en el navegador, avisa y limpia el formulario', async () => {
    const usuario = userEvent.setup();
    renderApp('/contacto');
    await escribir(usuario, 'Nombre', 'Ana Martínez');
    await escribir(usuario, 'Correo Electrónico', 'ana@correo.com');
    await escribir(usuario, 'Teléfono', '78901234');
    await escribir(usuario, 'Asunto', 'Pedido para un evento');
    await escribir(usuario, 'Mensaje', 'Necesito cien pupusas para el sábado.');
    await usuario.click(screen.getByRole('button', { name: 'Enviar mensaje' }));
    await waitFor(() => expect(huboDialogo('¡Mensaje enviado!')).toBe(true));
    expect(huboDialogo('Enviando tu mensaje...')).toBe(true);
    expect(Swal.close).toHaveBeenCalled();
    const guardado = leerJSON('saborExpressMensajes', []);
    expect(guardado).toHaveLength(1);
    expect(guardado[0]).toMatchObject({ nombre: 'Ana Martínez', correo: 'ana@correo.com', telefono: '7890-1234', asunto: 'Pedido para un evento' });
    expect(dialogos('¡Mensaje enviado!')[0].text).toContain('Gracias, Ana');
    await waitFor(() => expect(screen.getByLabelText('Nombre')).toHaveValue(''));
    expect(screen.getByLabelText('Mensaje')).toHaveValue('');
    expect(screen.getByText('0/500')).toBeInTheDocument();
    expect(document.querySelectorAll('.is-valid, .is-invalid')).toHaveLength(0);
  });

  it('solo conserva los 20 mensajes más recientes', () => {
    for (let i = 1; i <= 25; i += 1) guardarMensaje({ asunto: `Asunto ${i}` });
    const lista = leerJSON('saborExpressMensajes', []);
    expect(lista).toHaveLength(20);
    expect(lista[0].asunto).toBe('Asunto 25');
  });

  it('las preguntas frecuentes se abren de una en una', async () => {
    const usuario = userEvent.setup();
    renderApp('/contacto');
    const primera = await screen.findByRole('button', { name: /cobertura de entrega/i });
    const segunda = screen.getByRole('button', { name: /masa de arroz/i });
    expect(primera).toHaveAttribute('aria-expanded', 'false');
    await usuario.click(primera);
    expect(primera).toHaveAttribute('aria-expanded', 'true');
    await usuario.click(segunda);
    expect(primera).toHaveAttribute('aria-expanded', 'false');
    expect(segunda).toHaveAttribute('aria-expanded', 'true');
    await usuario.click(segunda);
    expect(segunda).toHaveAttribute('aria-expanded', 'false');
  });
});

const hace = minutos => new Date(Date.now() - minutos * 60000).toISOString();
const muchosPedidos = n => Array.from({ length: n }, (_, i) => pedidoBase({
  id: `SE-${String(i + 1).padStart(4, '0')}`, cliente: `Cliente ${i + 1}`, creadoEn: hace(n - i), estado: i % 5 === 0 ? 'Entregado' : 'Pendiente'
}));

describe('Panel de pedidos (administrador)', () => {
  it('sin pedidos explica cuándo van a aparecer', async () => {
    sembrarAdmin();
    renderApp('/admin/pedidos');
    expect(await screen.findByText(/Aún no hay pedidos/)).toBeInTheDocument();
  });

  it('muestra 10 pedidos por página y navega entre las 3 páginas', async () => {
    const usuario = userEvent.setup();
    sembrarAdmin();
    escribirJSON('saborExpressPedidos', muchosPedidos(25));
    renderApp('/admin/pedidos');
    await screen.findByRole('heading', { name: 'Pedidos' });
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(11); // encabezado + 10
    await usuario.click(screen.getByRole('button', { name: '3' }));
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(6); // encabezado + 5
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled();
    await usuario.click(screen.getByRole('button', { name: 'Página anterior' }));
    expect(screen.getByRole('button', { name: '2' }).closest('li')).toHaveClass('active');
  });

  it('el filtro "Preparando" agrupa Preparando y En camino', async () => {
    const usuario = userEvent.setup();
    sembrarAdmin();
    escribirJSON('saborExpressPedidos', [
      pedidoBase({ id: 'SE-0001', estado: 'Pendiente', creadoEn: hace(5) }),
      pedidoBase({ id: 'SE-0002', estado: 'Preparando', creadoEn: hace(4) }),
      pedidoBase({ id: 'SE-0003', estado: 'En camino', creadoEn: hace(3) }),
      pedidoBase({ id: 'SE-0004', estado: 'Entregado', creadoEn: hace(2) })
    ]);
    renderApp('/admin/pedidos');
    await screen.findByRole('heading', { name: 'Pedidos' });
    await usuario.click(screen.getByRole('button', { name: 'Preparando' }));
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Preparando' })).toHaveAttribute('aria-pressed', 'true');
    await usuario.click(screen.getByRole('button', { name: 'Todos' }));
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(5);
  });

  it('busca por cliente o por número y avisa cuando no hay coincidencias', async () => {
    const usuario = userEvent.setup();
    sembrarAdmin();
    escribirJSON('saborExpressPedidos', muchosPedidos(12));
    renderApp('/admin/pedidos');
    await usuario.type(await screen.findByLabelText('Buscar pedido'), 'cliente 7');
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2);
    await usuario.clear(screen.getByLabelText('Buscar pedido'));
    await usuario.type(screen.getByLabelText('Buscar pedido'), 'SE-0012');
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2);
    await usuario.clear(screen.getByLabelText('Buscar pedido'));
    await usuario.type(screen.getByLabelText('Buscar pedido'), 'nadie');
    expect(screen.getByText('No se encontraron pedidos con ese criterio.')).toBeInTheDocument();
  });

  it('cambia un estado intermedio sin pedir confirmación y avisa', async () => {
    const usuario = userEvent.setup();
    sembrarAdmin();
    escribirJSON('saborExpressPedidos', [pedidoBase({ id: 'SE-0001', estado: 'Pendiente' })]);
    renderApp('/admin/pedidos');
    await usuario.selectOptions(await screen.findByLabelText('Estado del pedido SE-0001'), 'Preparando');
    expect(leerJSON('saborExpressPedidos', [])[0].estado).toBe('Preparando');
    expect(Swal.fire.mock.calls.some(([o]) => o.toast && o.title === 'Pedido #SE-0001: Preparando')).toBe(true);
    expect(Swal.fire.mock.calls.some(([o]) => o.showCancelButton)).toBe(false);
  });

  it('un estado final pide confirmación, y si se rechaza el pedido no cambia', async () => {
    const usuario = userEvent.setup();
    sembrarAdmin();
    escribirJSON('saborExpressPedidos', [pedidoBase({ id: 'SE-0001', estado: 'Pendiente' })]);
    renderApp('/admin/pedidos');
    Swal.fire.mockResolvedValueOnce({ isConfirmed: false, isDismissed: true });
    const select = await screen.findByLabelText('Estado del pedido SE-0001');
    await usuario.selectOptions(select, 'Entregado');
    expect(huboDialogo('¿Marcar el pedido #SE-0001 como Entregado?')).toBe(true);
    expect(leerJSON('saborExpressPedidos', [])[0].estado).toBe('Pendiente');
    expect(select).toHaveValue('Pendiente');
    expect(select).toBeEnabled();
  });

  it('al confirmar un estado final el pedido queda bloqueado y ya no se puede cambiar', async () => {
    const usuario = userEvent.setup();
    sembrarAdmin();
    escribirJSON('saborExpressPedidos', [pedidoBase({ id: 'SE-0001', estado: 'Pendiente' })]);
    renderApp('/admin/pedidos');
    await usuario.selectOptions(await screen.findByLabelText('Estado del pedido SE-0001'), 'Cancelado');
    const aviso = dialogos('¿Marcar el pedido #SE-0001 como Cancelado?')[0];
    expect(aviso).toMatchObject({ icon: 'warning', text: 'Es un estado final: después ya no podrás cambiarlo.' });
    await waitFor(() => expect(screen.getByLabelText('Estado del pedido SE-0001')).toBeDisabled());
    expect(screen.getByLabelText('Estado del pedido SE-0001')).toHaveAttribute('title', 'Estado final: ya no se puede cambiar');
    expect(leerJSON('saborExpressPedidos', [])[0].estado).toBe('Cancelado');
  });

  it('si el pedido ya no existe al cambiarlo, muestra un error', async () => {
    const usuario = userEvent.setup();
    sembrarAdmin();
    escribirJSON('saborExpressPedidos', [pedidoBase({ id: 'SE-0001', estado: 'Pendiente' })]);
    renderApp('/admin/pedidos');
    const select = await screen.findByLabelText('Estado del pedido SE-0001');
    window.localStorage.setItem('saborExpressPedidos', '[]'); // otra pestaña lo borró (sin avisar a esta)
    await usuario.selectOptions(select, 'Preparando');
    await waitFor(() => expect(huboDialogo('No se pudo actualizar')).toBe(true));
  });

  it('cuando otra pestaña confirma un pedido, aparece en la lista y se avisa', async () => {
    sembrarAdmin();
    escribirJSON('saborExpressPedidos', [pedidoBase({ id: 'SE-0001' })]);
    renderApp('/admin/pedidos');
    await screen.findByText('#SE-0001');
    expect(Swal.fire.mock.calls.some(([o]) => o.title === 'Llegó un nuevo pedido.')).toBe(false);
    window.localStorage.setItem('saborExpressPedidos', JSON.stringify([pedidoBase({ id: 'SE-0001' }), pedidoBase({ id: 'SE-0002', cliente: 'Luis Pérez' })]));
    act(() => { window.dispatchEvent(new StorageEvent('storage', { key: 'saborExpressPedidos' })); });
    expect(await screen.findByText('#SE-0002')).toBeInTheDocument();
    expect(Swal.fire.mock.calls.some(([o]) => o.toast && o.title === 'Llegó un nuevo pedido.')).toBe(true);
  });

  it('marca con una etiqueta "demo" los pedidos de ejemplo', async () => {
    sembrarAdmin();
    escribirJSON('saborExpressPedidos', [pedidoBase({ id: 'SE-D001', email: 'demo@saborexpress.com', cliente: 'Cliente demo' })]);
    renderApp('/admin/pedidos');
    expect(await screen.findByText('demo')).toHaveClass('badge');
  });
});

/** Simula el cuadro de edición de SweetAlert2: pone el HTML en la página, escribe los valores y corre preConfirm. */
function simularEdicion({ nombre, precio }) {
  Swal.fire.mockImplementationOnce(async opciones => {
    const contenedor = document.createElement('div');
    contenedor.innerHTML = opciones.html;
    document.body.appendChild(contenedor);
    if (nombre !== undefined) contenedor.querySelector('#swal-nombre').value = nombre;
    if (precio !== undefined) contenedor.querySelector('#swal-precio').value = precio;
    const valor = await opciones.preConfirm();
    contenedor.remove();
    return valor === false ? { isConfirmed: false, isDismissed: true } : { isConfirmed: true, value: valor };
  });
}
const tarjeta = nombre => screen.getByRole('heading', { name: new RegExp(nombre) }).closest('.admin-card');

describe('Panel del menú (administrador)', () => {
  it('muestra los 15 productos con categoría y precio', async () => {
    sembrarAdmin();
    renderApp('/admin/menu');
    expect(await screen.findByRole('heading', { name: 'Menú' })).toBeInTheDocument();
    await waitFor(() => expect(document.querySelectorAll('.admin-card')).toHaveLength(15));
    expect(within(tarjeta('Pupusa Loca')).getByText('$1.50')).toBeInTheDocument();
    expect(within(tarjeta('Pupusa Loca')).getByText('Pupusas')).toBeInTheDocument();
  });

  it('edita nombre y precio desde el cuadro de SweetAlert2', async () => {
    const usuario = userEvent.setup();
    sembrarAdmin();
    renderApp('/admin/menu');
    await screen.findByRole('heading', { name: 'Pupusa Loca' });
    simularEdicion({ nombre: 'Pupusa Súper Loca', precio: '1.75' });
    await usuario.click(within(tarjeta('Pupusa Loca')).getByRole('button', { name: '[Editar]' }));
    await waitFor(() => expect(leerJSON('saborExpressProductos', []).find(p => p.id === 'pup-loca')).toMatchObject({ nombre: 'Pupusa Súper Loca', precio: 1.75 }));
    expect(await screen.findByRole('heading', { name: /Pupusa Súper Loca/ })).toBeInTheDocument();
  });

  it('rechaza dentro del cuadro un nombre corto, un nombre repetido y un precio inválido', async () => {
    const usuario = userEvent.setup();
    sembrarAdmin();
    renderApp('/admin/menu');
    await screen.findByRole('heading', { name: 'Pupusa Loca' });
    const editar = () => usuario.click(within(tarjeta('Pupusa Loca')).getByRole('button', { name: '[Editar]' }));

    simularEdicion({ nombre: 'Ab', precio: '1.50' });
    await editar();
    expect(Swal.showValidationMessage).toHaveBeenLastCalledWith('Escribe al menos 3 caracteres.');

    simularEdicion({ nombre: 'pupusa revuelta', precio: '1.50' });
    await editar();
    expect(Swal.showValidationMessage).toHaveBeenLastCalledWith('Ya existe otro producto con ese nombre.');

    simularEdicion({ nombre: 'Pupusa Loca', precio: '-3' });
    await editar();
    expect(Swal.showValidationMessage).toHaveBeenLastCalledWith('El precio debe ser mayor que 0.');

    simularEdicion({ nombre: 'Pupusa Loca', precio: '150' });
    await editar();
    expect(Swal.showValidationMessage).toHaveBeenLastCalledWith('El precio máximo es $99.00.');

    expect(leerJSON('saborExpressProductos', []).find(p => p.id === 'pup-loca').precio).toBe(1.5);
  });

  it('elimina un producto con confirmación y lo conserva si se cancela', async () => {
    const usuario = userEvent.setup();
    sembrarAdmin();
    renderApp('/admin/menu');
    await screen.findByRole('heading', { name: 'Pupusa Loca' });
    Swal.fire.mockResolvedValueOnce({ isConfirmed: false, isDismissed: true });
    await usuario.click(within(tarjeta('Pupusa Loca')).getByRole('button', { name: '[Eliminar]' }));
    expect(document.querySelectorAll('.admin-card')).toHaveLength(15);
    await usuario.click(within(tarjeta('Pupusa Loca')).getByRole('button', { name: '[Eliminar]' }));
    expect(huboDialogo('¿Eliminar este producto?')).toBe(true);
    await waitFor(() => expect(document.querySelectorAll('.admin-card')).toHaveLength(14));
    expect(leerJSON('saborExpressProductos', []).some(p => p.id === 'pup-loca')).toBe(false);
  });

  it('oculta y vuelve a mostrar un producto sin eliminarlo', async () => {
    const usuario = userEvent.setup();
    sembrarAdmin();
    renderApp('/admin/menu');
    await screen.findByRole('heading', { name: 'Pupusa Loca' });
    await usuario.click(within(tarjeta('Pupusa Loca')).getByRole('button', { name: '[Ocultar]' }));
    expect(within(tarjeta('Pupusa Loca')).getByText('Oculto')).toBeInTheDocument();
    expect(tarjeta('Pupusa Loca')).toHaveClass('opacity-50');
    expect(leerJSON('saborExpressProductos', []).find(p => p.id === 'pup-loca').activo).toBe(false);
    await usuario.click(within(tarjeta('Pupusa Loca')).getByRole('button', { name: '[Mostrar]' }));
    expect(within(tarjeta('Pupusa Loca')).queryByText('Oculto')).not.toBeInTheDocument();
  });

  it('un producto oculto desaparece del menú del cliente', async () => {
    escribirJSON('saborExpressProductos', PRODUCTOS_INICIALES.map(p => (p.id === 'pup-revuelta' ? { ...p, activo: false } : p)));
    renderApp('/menu');
    await screen.findByRole('heading', { name: 'Nuestro Menú' });
    expect(screen.queryByText('Pupusa Revuelta')).not.toBeInTheDocument();
  });

  it('añadir: solo ofrece los platillos que faltan, rellena el precio y valida', async () => {
    const usuario = userEvent.setup();
    sembrarAdmin();
    renderApp('/admin/menu');
    await screen.findByRole('heading', { name: 'Pupusa Loca' });
    await usuario.click(within(tarjeta('Pupusa Loca')).getByRole('button', { name: '[Eliminar]' }));
    await waitFor(() => expect(document.querySelectorAll('.admin-card')).toHaveLength(14));

    await usuario.click(screen.getByRole('button', { name: '+ Añadir Producto' }));
    const dialogo = screen.getByRole('dialog');
    const select = within(dialogo).getByLabelText('Seleccionar Producto');
    expect(within(select).getAllByRole('option')).toHaveLength(2); // el aviso y la Pupusa Loca
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar Producto' }));
    expect(within(dialogo).getByText('Selecciona un platillo o bebida.')).toBeInTheDocument();

    await usuario.selectOptions(select, 'pup-loca');
    expect(within(dialogo).getByLabelText('Precio ($)')).toHaveValue(1.5);
    await usuario.clear(within(dialogo).getByLabelText('Precio ($)'));
    await usuario.type(within(dialogo).getByLabelText('Precio ($)'), '120');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar Producto' }));
    expect(within(dialogo).getByText('El precio máximo es $99.00.')).toBeInTheDocument();

    await usuario.clear(within(dialogo).getByLabelText('Precio ($)'));
    await usuario.type(within(dialogo).getByLabelText('Precio ($)'), '1.60');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar Producto' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(document.querySelectorAll('.admin-card')).toHaveLength(15);
    expect(leerJSON('saborExpressProductos', []).find(p => p.id === 'pup-loca')).toMatchObject({ precio: 1.6, activo: true });
    expect(Swal.fire.mock.calls.some(([o]) => o.toast && /"Pupusa Loca" agregado al menú/.test(o.title))).toBe(true);
  });

  it('al cerrar y volver a abrir el modal se limpian los avisos de validación', async () => {
    const usuario = userEvent.setup();
    sembrarAdmin();
    renderApp('/admin/menu');
    await screen.findByRole('heading', { name: 'Pupusa Loca' });
    await usuario.click(screen.getByRole('button', { name: '+ Añadir Producto' }));
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar Producto' }));
    expect(document.querySelectorAll('.is-invalid').length).toBeGreaterThan(0);
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    await usuario.click(screen.getByRole('button', { name: '+ Añadir Producto' }));
    expect(document.querySelectorAll('.is-invalid')).toHaveLength(0);
  });
});
