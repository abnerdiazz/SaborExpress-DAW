import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BLOQUEO_SEGUNDOS, MAX_INTENTOS } from '../hooks/useLoginAttempts.js';
import { escribirJSON, leerJSON } from '../services/store.js';
import { Swal, huboDialogo, pedidoBase, renderApp, sembrarCliente } from './utils.jsx';

// Al entrar como administrador se abre Reportes: no hace falta dibujar gráficas reales (necesitarían un <canvas>).
vi.mock('react-chartjs-2', () => ({
  Bar: () => <div />,
  Line: () => <div />,
  Doughnut: () => <div />
}));

const escribir = async (usuario, etiqueta, texto) => {
  const campo = screen.getByLabelText(etiqueta);
  await usuario.clear(campo);
  await usuario.type(campo, texto);
  return campo;
};

describe('Registro', () => {
  it('al enviar vacío marca los cinco campos con su mensaje', async () => {
    const usuario = userEvent.setup();
    renderApp('/registro');
    await usuario.click(await screen.findByRole('button', { name: 'Registrarse' }));
    expect(await screen.findByText('Ingresa tu nombre completo.')).toBeInTheDocument();
    expect(screen.getByText('Ingresa tu correo electrónico.')).toBeInTheDocument();
    expect(screen.getByText('Ingresa tu teléfono.')).toBeInTheDocument();
    expect(screen.getByText('Crea una contraseña.')).toBeInTheDocument();
    expect(screen.getByText('Repite la contraseña.')).toBeInTheDocument();
    expect(document.querySelectorAll('.is-invalid')).toHaveLength(5);
    await waitFor(() => expect(screen.getByLabelText('Nombre Completo')).toHaveFocus());
  });

  it('da formato 7777-7777 al teléfono mientras se escribe', async () => {
    const usuario = userEvent.setup();
    renderApp('/registro');
    await usuario.type(await screen.findByLabelText('Teléfono (WhatsApp)'), '78901234');
    expect(screen.getByLabelText('Teléfono (WhatsApp)')).toHaveValue('7890-1234');
  });

  it('el medidor de contraseña aparece al escribir y cambia de nivel', async () => {
    const usuario = userEvent.setup();
    renderApp('/registro');
    expect(screen.queryByText(/Seguridad:/)).not.toBeInTheDocument();
    await usuario.type(await screen.findByLabelText('Contraseña'), 'abc');
    expect(screen.getByText(/Seguridad:/)).toHaveTextContent('Muy débil');
    await usuario.type(screen.getByLabelText('Contraseña'), '12345');
    expect(screen.getByText(/Seguridad:/)).toHaveTextContent('Aceptable');
    await usuario.type(screen.getByLabelText('Contraseña'), 'A!xyz');
    expect(screen.getByText(/Seguridad:/)).toHaveTextContent('Fuerte');
  });

  it('valida el correo (formato, reservado y repetido) al salir del campo', async () => {
    const usuario = userEvent.setup();
    sembrarCliente();
    window.localStorage.removeItem('saborExpressSession');
    renderApp('/registro');
    const correo = await escribir(usuario, 'Correo Electrónico', 'ana@correo');
    await usuario.tab();
    expect(await screen.findByText(/Escribe un correo válido/)).toBeInTheDocument();
    await usuario.clear(correo);
    await usuario.type(correo, 'admin@saborexpress.com');
    await usuario.tab();
    expect(await screen.findByText('Ese correo está reservado. Usa otro.')).toBeInTheDocument();
    await usuario.clear(correo);
    await usuario.type(correo, 'ANA@correo.com');
    await usuario.tab();
    expect(await screen.findByText(/Ya existe una cuenta con ese correo/)).toBeInTheDocument();
  });

  it('revisa que las contraseñas coincidan, también cuando se cambia la primera después', async () => {
    const usuario = userEvent.setup();
    renderApp('/registro');
    await escribir(usuario, 'Contraseña', 'abc12345');
    await usuario.type(screen.getByLabelText('Confirmar Contraseña'), 'abc12345');
    await usuario.tab();
    expect(screen.queryByText('Las contraseñas no coinciden.')).not.toBeInTheDocument();
    await usuario.type(screen.getByLabelText('Contraseña'), 'x');
    expect(await screen.findByText('Las contraseñas no coinciden.')).toBeInTheDocument();
  });

  it('crea la cuenta, inicia la sesión, avisa y lleva a Mis pedidos', async () => {
    const usuario = userEvent.setup();
    renderApp('/registro');
    await escribir(usuario, 'Nombre Completo', 'Ana Martínez');
    await escribir(usuario, 'Correo Electrónico', 'Ana@Correo.com');
    await escribir(usuario, 'Teléfono (WhatsApp)', '78901234');
    await escribir(usuario, 'Contraseña', 'Cliente123');
    await escribir(usuario, 'Confirmar Contraseña', 'Cliente123');
    await usuario.click(screen.getByRole('button', { name: 'Registrarse' }));
    expect(await screen.findByRole('heading', { name: 'Pedido en Curso' })).toBeInTheDocument();
    expect(huboDialogo('¡Cuenta creada!')).toBe(true);
    expect(leerJSON('saborExpressUsers', [])).toEqual([{ name: 'Ana Martínez', email: 'ana@correo.com', phone: '7890-1234', password: 'Cliente123' }]);
    expect(leerJSON('saborExpressSession', null)).toMatchObject({ name: 'Ana Martínez', role: 'cliente' });
    expect(screen.getByRole('button', { name: /Ana/ })).toBeInTheDocument();
  });

  it('después de registrarse vuelve a la página de donde venía (redirect)', async () => {
    const usuario = userEvent.setup();
    renderApp('/registro?redirect=%2Fmenu');
    await escribir(usuario, 'Nombre Completo', 'Luis Pérez');
    await escribir(usuario, 'Correo Electrónico', 'luis@correo.com');
    await escribir(usuario, 'Teléfono (WhatsApp)', '70001111');
    await escribir(usuario, 'Contraseña', 'Cliente123');
    await escribir(usuario, 'Confirmar Contraseña', 'Cliente123');
    await usuario.click(screen.getByRole('button', { name: 'Registrarse' }));
    expect(await screen.findByRole('heading', { name: 'Nuestro Menú' })).toBeInTheDocument();
  });

  it('un destino externo en redirect se ignora (no se puede mandar al cliente a otro sitio)', async () => {
    const usuario = userEvent.setup();
    renderApp('/registro?redirect=https%3A%2F%2Fevil.com');
    await escribir(usuario, 'Nombre Completo', 'Luis Pérez');
    await escribir(usuario, 'Correo Electrónico', 'luis@correo.com');
    await escribir(usuario, 'Teléfono (WhatsApp)', '70001111');
    await escribir(usuario, 'Contraseña', 'Cliente123');
    await escribir(usuario, 'Confirmar Contraseña', 'Cliente123');
    await usuario.click(screen.getByRole('button', { name: 'Registrarse' }));
    expect(await screen.findByRole('heading', { name: 'Pedido en Curso' })).toBeInTheDocument();
  });
});

describe('Inicio de sesión', () => {
  const cuenta = () => { sembrarCliente(); window.localStorage.removeItem('saborExpressSession'); };

  it('valida el formato del correo y que la contraseña no esté vacía', async () => {
    const usuario = userEvent.setup();
    renderApp('/login');
    await usuario.click(await screen.findByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByText('Ingresa tu correo electrónico.')).toBeInTheDocument();
    expect(screen.getByText('Ingresa tu contraseña.')).toBeInTheDocument();
    await escribir(usuario, 'Correo Electrónico', 'ana@correo');
    await usuario.tab();
    expect(await screen.findByText(/Escribe un correo válido/)).toBeInTheDocument();
  });

  it('un cliente inicia sesión y llega a Mis pedidos', async () => {
    const usuario = userEvent.setup();
    cuenta();
    renderApp('/login');
    await escribir(usuario, 'Correo Electrónico', 'ana@correo.com');
    await escribir(usuario, 'Contraseña', 'Cliente123');
    await usuario.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByRole('heading', { name: 'Pedido en Curso' })).toBeInTheDocument();
    expect(leerJSON('saborExpressSession', null)).toMatchObject({ email: 'ana@correo.com', role: 'cliente' });
    expect(Swal.fire.mock.calls.some(([o]) => o.toast && /Bienvenido, Ana/.test(o.title))).toBe(true);
  });

  it('el administrador de demostración entra a los reportes y no se mezcla con la sesión de cliente', async () => {
    const usuario = userEvent.setup();
    renderApp('/login');
    await escribir(usuario, 'Correo Electrónico', 'admin@saborexpress.com');
    await escribir(usuario, 'Contraseña', 'Admin123');
    await usuario.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByRole('heading', { name: 'Reportes' })).toBeInTheDocument();
    expect(leerJSON('saborExpressAdminSession', null)).toMatchObject({ role: 'admin' });
    expect(leerJSON('saborExpressAdminSession', {}).password).toBeUndefined();
    expect(window.localStorage.getItem('saborExpressSession')).toBeNull();
  });

  it('un cliente con sesión es redirigido fuera del login', async () => {
    sembrarCliente();
    renderApp('/login');
    expect(await screen.findByRole('heading', { name: 'Pedido en Curso' })).toBeInTheDocument();
  });

  it('un cliente con sesión que llega desde un panel de administración sí ve el login (para entrar como admin)', async () => {
    sembrarCliente();
    renderApp('/login?redirect=%2Fadmin%2Fpedidos');
    expect(await screen.findByLabelText('Correo Electrónico')).toBeInTheDocument();
    const usuario = userEvent.setup();
    await escribir(usuario, 'Correo Electrónico', 'admin@saborexpress.com');
    await escribir(usuario, 'Contraseña', 'Admin123');
    await usuario.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByRole('heading', { name: 'Pedidos' })).toBeInTheDocument();
    expect(leerJSON('saborExpressSession', null)).toMatchObject({ role: 'cliente' }); // la sesión de cliente sigue
  });

  it('un cliente no puede ser mandado a un panel de administración con redirect', async () => {
    const usuario = userEvent.setup();
    cuenta();
    renderApp('/login?redirect=%2Fadmin%2Fpedidos');
    await escribir(usuario, 'Correo Electrónico', 'ana@correo.com');
    await escribir(usuario, 'Contraseña', 'Cliente123');
    await usuario.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByRole('heading', { name: 'Pedido en Curso' })).toBeInTheDocument();
  });

  it('con una cuenta inexistente ofrece crearla y conserva el redirect', async () => {
    const usuario = userEvent.setup();
    renderApp('/login?redirect=%2Fmenu');
    await escribir(usuario, 'Correo Electrónico', 'nadie@correo.com');
    await escribir(usuario, 'Contraseña', 'Cliente123');
    await usuario.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(huboDialogo('No encontramos tu cuenta')).toBe(true);
    expect(await screen.findByRole('heading', { name: 'Crear cuenta nueva' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Inicia sesión' }).getAttribute('href')).toContain('redirect=%2Fmenu');
  });

  it('con una cuenta inexistente, "Reintentar" se queda en el login', async () => {
    const usuario = userEvent.setup();
    renderApp('/login');
    await escribir(usuario, 'Correo Electrónico', 'nadie@correo.com');
    await escribir(usuario, 'Contraseña', 'Cliente123');
    Swal.fire.mockResolvedValueOnce({ isConfirmed: false, isDismissed: true });
    await usuario.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    await waitFor(() => expect(huboDialogo('No encontramos tu cuenta')).toBe(true));
    expect(screen.getByLabelText('Correo Electrónico')).toBeInTheDocument();
  });

  it('cuenta los intentos fallidos y bloquea el formulario tras 5', async () => {
    const usuario = userEvent.setup();
    cuenta();
    renderApp('/login');
    await escribir(usuario, 'Correo Electrónico', 'ana@correo.com');
    for (let fallo = 1; fallo < MAX_INTENTOS; fallo += 1) {
      await escribir(usuario, 'Contraseña', 'mal-puesta');
      await usuario.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
      expect(await screen.findByText(`Contraseña incorrecta. Te quedan ${MAX_INTENTOS - fallo} intento(s).`)).toBeInTheDocument();
    }
    await escribir(usuario, 'Contraseña', 'mal-puesta');
    await usuario.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    await waitFor(() => expect(huboDialogo('Formulario bloqueado')).toBe(true));
    expect(Swal.fire.mock.calls.map(([o]) => o).find(o => o.title === 'Formulario bloqueado').text).toContain(`${BLOQUEO_SEGUNDOS} segundos`);

    // Durante el bloqueo ni siquiera la contraseña correcta funciona.
    await escribir(usuario, 'Contraseña', 'Cliente123');
    await usuario.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    await waitFor(() => expect(huboDialogo('Demasiados intentos')).toBe(true));
    expect(window.localStorage.getItem('saborExpressSession')).toBeNull();
  });

  it('un inicio de sesión correcto borra los intentos fallidos', async () => {
    const usuario = userEvent.setup();
    cuenta();
    renderApp('/login');
    await escribir(usuario, 'Correo Electrónico', 'ana@correo.com');
    await escribir(usuario, 'Contraseña', 'mal-puesta');
    await usuario.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    await screen.findByText(/Te quedan 4 intento/);
    expect(window.sessionStorage.getItem('saborExpressLoginIntentos')).not.toBeNull();
    await escribir(usuario, 'Contraseña', 'Cliente123');
    await usuario.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    await screen.findByRole('heading', { name: 'Pedido en Curso' });
    expect(window.sessionStorage.getItem('saborExpressLoginIntentos')).toBeNull();
  });
});

describe('Mis pedidos', () => {
  const hace = minutos => new Date(Date.now() - minutos * 60000).toISOString();

  it('sin sesión invita a iniciar sesión o crear cuenta y no muestra el historial', async () => {
    renderApp('/mis-pedidos');
    expect(await screen.findByText('Inicia sesión para ver tus pedidos')).toBeInTheDocument();
    const principal = within(screen.getByRole('main'));
    expect(principal.getByRole('link', { name: 'Iniciar sesión' }).getAttribute('href')).toContain('redirect=%2Fmis-pedidos');
    expect(principal.getByRole('link', { name: 'Crear cuenta' }).getAttribute('href')).toContain('redirect=%2Fmis-pedidos');
    expect(screen.queryByText('Historial de Pedidos')).not.toBeInTheDocument();
  });

  it('con sesión y sin pedidos muestra el mensaje vacío y la tabla sin filas', async () => {
    sembrarCliente();
    renderApp('/mis-pedidos');
    expect(await screen.findByText('No tienes pedidos en curso')).toBeInTheDocument();
    expect(screen.getByText('Aún no has realizado pedidos.')).toBeInTheDocument();
  });

  it('muestra el pedido en curso con su línea de tiempo y la estimación de llegada', async () => {
    sembrarCliente();
    escribirJSON('saborExpressPedidos', [pedidoBase({ id: 'SE-0007', estado: 'Preparando', creadoEn: hace(5) })]);
    renderApp('/mis-pedidos');
    expect(await screen.findByText('ORDEN: #SE-0007')).toBeInTheDocument();
    expect(screen.getByText('En preparación (Actual)')).toBeInTheDocument();
    expect(screen.getByText('Pedido recibido')).toBeInTheDocument();
    expect(screen.getByText('Estimación de llegada')).toBeInTheDocument();
    expect(document.querySelectorAll('.order-step.is-done')).toHaveLength(1);
    expect(document.querySelectorAll('.order-step.is-pending')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /cancelar pedido/i })).not.toBeInTheDocument();
  });

  it('solo muestra los pedidos del cliente que tiene la sesión', async () => {
    sembrarCliente();
    escribirJSON('saborExpressPedidos', [
      pedidoBase({ id: 'SE-0001', creadoEn: hace(30) }),
      pedidoBase({ id: 'SE-0002', email: 'otro@correo.com', cliente: 'Otro', creadoEn: hace(20) })
    ]);
    renderApp('/mis-pedidos');
    expect(await screen.findByText('ORDEN: #SE-0001')).toBeInTheDocument();
    expect(screen.queryByText(/SE-0002/)).not.toBeInTheDocument();
  });

  it('el historial lista los pedidos con su estado y el pedido en curso es el primero sin terminar', async () => {
    sembrarCliente();
    escribirJSON('saborExpressPedidos', [
      pedidoBase({ id: 'SE-0001', estado: 'Entregado', creadoEn: hace(300) }),
      pedidoBase({ id: 'SE-0002', estado: 'Cancelado', creadoEn: hace(200) }),
      pedidoBase({ id: 'SE-0003', estado: 'Pendiente', creadoEn: hace(10) })
    ]);
    renderApp('/mis-pedidos');
    const tabla = await screen.findByRole('table');
    expect(within(tabla).getAllByRole('row')).toHaveLength(4);
    expect(within(tabla).getByText('Entregado')).toHaveClass('success');
    expect(within(tabla).getByText('Cancelado')).toHaveClass('error');
    expect(within(tabla).getByText('Pendiente')).toHaveClass('warning');
    expect(screen.getByText('ORDEN: #SE-0003')).toBeInTheDocument();
  });

  it('permite cancelar un pedido Pendiente (con confirmación) y pasa al historial', async () => {
    const usuario = userEvent.setup();
    sembrarCliente();
    escribirJSON('saborExpressPedidos', [pedidoBase({ id: 'SE-0001', estado: 'Pendiente', creadoEn: hace(2) })]);
    renderApp('/mis-pedidos');
    await usuario.click(await screen.findByRole('button', { name: /cancelar pedido/i }));
    expect(huboDialogo('¿Cancelar este pedido?')).toBe(true);
    expect(await screen.findByText('No tienes pedidos en curso')).toBeInTheDocument();
    expect(leerJSON('saborExpressPedidos', [])[0].estado).toBe('Cancelado');
    expect(Swal.fire.mock.calls.some(([o]) => o.toast && /Pedido #SE-0001 cancelado/.test(o.title))).toBe(true);
  });

  it('si la persona se arrepiente, el pedido no se cancela', async () => {
    const usuario = userEvent.setup();
    sembrarCliente();
    escribirJSON('saborExpressPedidos', [pedidoBase({ estado: 'Pendiente', creadoEn: hace(2) })]);
    renderApp('/mis-pedidos');
    Swal.fire.mockResolvedValueOnce({ isConfirmed: false, isDismissed: true });
    await usuario.click(await screen.findByRole('button', { name: /cancelar pedido/i }));
    expect(leerJSON('saborExpressPedidos', [])[0].estado).toBe('Pendiente');
  });

  it('si el administrador lo pasó a Preparando mientras decidía, ya no se puede cancelar', async () => {
    const usuario = userEvent.setup();
    sembrarCliente();
    escribirJSON('saborExpressPedidos', [pedidoBase({ estado: 'Pendiente', creadoEn: hace(2) })]);
    renderApp('/mis-pedidos');
    // Mientras se muestra el cuadro de confirmación, el administrador cambia el estado.
    Swal.fire.mockImplementationOnce(async () => {
      escribirJSON('saborExpressPedidos', [pedidoBase({ estado: 'Preparando', creadoEn: hace(2) })]);
      return { isConfirmed: true };
    });
    await usuario.click(await screen.findByRole('button', { name: /cancelar pedido/i }));
    await waitFor(() => expect(huboDialogo('Ya no se puede cancelar')).toBe(true));
    expect(leerJSON('saborExpressPedidos', [])[0].estado).toBe('Preparando');
  });

  it('se actualiza solo cuando el administrador cambia el estado desde otra pestaña', async () => {
    sembrarCliente();
    escribirJSON('saborExpressPedidos', [pedidoBase({ estado: 'Pendiente', creadoEn: hace(2) })]);
    renderApp('/mis-pedidos');
    expect(await screen.findByText('Pedido recibido (Actual)')).toBeInTheDocument();
    window.localStorage.setItem('saborExpressPedidos', JSON.stringify([pedidoBase({ estado: 'En camino', creadoEn: hace(2) })]));
    act(() => { window.dispatchEvent(new StorageEvent('storage', { key: 'saborExpressPedidos' })); });
    expect(screen.getByText('En camino (Actual)')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cancelar pedido/i })).not.toBeInTheDocument();
  });
});
