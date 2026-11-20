import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  AGRADECIMIENTOS, CLAVE_MENSAJES, CORREO_NEGOCIO, armarRespuesta, contarNoLeidos, eliminarMensaje, guardarMensaje, marcarMensaje, normalizarMensajes
} from '../services/mensajes.js';
import { escribirJSON, leerJSON } from '../services/store.js';
import { Swal, dialogos, huboDialogo, renderApp, sembrarAdmin, sembrarCliente } from './utils.jsx';

const mensaje = (extra = {}) => ({
  id: 'MSG-1', nombre: 'Ana Martínez', correo: 'ana@correo.com', telefono: '7890-1234',
  asunto: 'Pedido para un evento', mensaje: 'Necesito cien pupusas para el sábado.',
  enviadoEn: new Date().toISOString(), leido: false, ...extra
});

describe('Servicio de mensajes', () => {
  it('guarda cada mensaje nuevo con id y como "sin leer"', () => {
    guardarMensaje({ nombre: 'Ana', correo: 'ana@correo.com', asunto: 'Hola', mensaje: 'Un saludo' });
    const [guardado] = leerJSON(CLAVE_MENSAJES, []);
    expect(guardado.id).toMatch(/^MSG-/);
    expect(guardado.leido).toBe(false);
    expect(guardado.enviadoEn).toBeTruthy();
  });

  it('marca como leído y vuelve a marcar como sin leer', () => {
    escribirJSON(CLAVE_MENSAJES, [mensaje()]);
    expect(marcarMensaje('MSG-1', true)).toBe(true);
    expect(leerJSON(CLAVE_MENSAJES, [])[0].leido).toBe(true);
    expect(marcarMensaje('MSG-1', false)).toBe(true);
    expect(leerJSON(CLAVE_MENSAJES, [])[0].leido).toBe(false);
  });

  it('elimina un mensaje y devuelve false si no existe', () => {
    escribirJSON(CLAVE_MENSAJES, [mensaje(), mensaje({ id: 'MSG-2' })]);
    expect(eliminarMensaje('MSG-1')).toBe(true);
    expect(leerJSON(CLAVE_MENSAJES, []).map(m => m.id)).toEqual(['MSG-2']);
    expect(eliminarMensaje('no-existe')).toBe(false);
    expect(marcarMensaje('no-existe')).toBe(false);
  });

  it('los mensajes antiguos (sin id ni estado) siguen funcionando y cuentan como sin leer', () => {
    const lista = normalizarMensajes([{ nombre: 'Luis', correo: 'luis@correo.com', enviadoEn: '2026-11-01T10:00:00.000Z' }]);
    expect(lista[0].id).toBe('2026-11-01T10:00:00.000Z|luis@correo.com');
    expect(lista[0].leido).toBe(false);
    expect(contarNoLeidos(lista)).toBe(1);
  });

  it('ignora datos dañados en el almacenamiento', () => {
    expect(normalizarMensajes('basura')).toEqual([]);
    expect(normalizarMensajes([null, 5, 'x', mensaje()])).toHaveLength(1);
  });
});

describe('Respuesta al cliente', () => {
  it('arma una respuesta del negocio hacia el correo del cliente, con saludo, agradecimiento y firma', () => {
    const r = armarRespuesta(mensaje(), () => 0);
    expect(r.de).toBe(CORREO_NEGOCIO);
    expect(r.para).toBe('ana@correo.com');
    expect(r.asunto).toBe('Re: Pedido para un evento');
    expect(r.cuerpo).toContain('Hola Ana,');
    expect(r.cuerpo).toContain(AGRADECIMIENTOS[0]);
    expect(r.cuerpo).toContain('Equipo SaborExpress');
    expect(r.cuerpo).toContain(CORREO_NEGOCIO);
  });

  it('el agradecimiento se elige al azar entre las frases generales', () => {
    expect(armarRespuesta(mensaje(), () => 0).cuerpo).toContain(AGRADECIMIENTOS[0]);
    expect(armarRespuesta(mensaje(), () => 0.5).cuerpo).toContain(AGRADECIMIENTOS[2]);
    expect(armarRespuesta(mensaje(), () => 0.9999).cuerpo).toContain(AGRADECIMIENTOS[AGRADECIMIENTOS.length - 1]);
    expect(armarRespuesta(mensaje(), () => 1).cuerpo).toContain(AGRADECIMIENTOS[AGRADECIMIENTOS.length - 1]);
  });

  it('el enlace mailto lleva destinatario, asunto y cuerpo codificados', () => {
    const r = armarRespuesta(mensaje({ nombre: 'Ana & Co', asunto: 'Reserva: 100%' }), () => 0);
    expect(r.mailto.startsWith('mailto:ana%40correo.com?subject=')).toBe(true);
    const parametros = new URLSearchParams(r.mailto.split('?')[1]);
    expect(parametros.get('subject')).toBe('Re: Reserva: 100%');
    expect(parametros.get('body')).toBe(r.cuerpo);
  });

  it('el enlace de Gmail elige la cuenta del negocio y rellena destinatario, asunto y cuerpo', () => {
    const r = armarRespuesta(mensaje(), () => 0);
    const url = new URL(r.gmail);
    expect(url.origin + url.pathname).toBe('https://mail.google.com/mail/');
    expect(url.searchParams.get('authuser')).toBe(CORREO_NEGOCIO);
    expect(url.searchParams.get('to')).toBe('ana@correo.com');
    expect(url.searchParams.get('su')).toBe(r.asunto);
    expect(url.searchParams.get('body')).toBe(r.cuerpo);
  });

  it('sin asunto ni nombre usa textos por defecto', () => {
    const r = armarRespuesta({ correo: 'x@correo.com' }, () => 0);
    expect(r.asunto).toBe('Re: Tu mensaje a SaborExpress');
    expect(r.cuerpo).toContain('Hola cliente,');
  });
});

describe('Panel de mensajes (administrador)', () => {
  it('sin mensajes explica cuándo van a aparecer', async () => {
    sembrarAdmin();
    renderApp('/admin/mensajes');
    expect(await screen.findByRole('heading', { name: 'Mensajes' })).toBeInTheDocument();
    expect(screen.getByText(/Aún no hay mensajes/)).toBeInTheDocument();
  });

  it('muestra los mensajes con la insignia "Nuevo" y el contador en la barra', async () => {
    sembrarAdmin();
    escribirJSON(CLAVE_MENSAJES, [mensaje(), mensaje({ id: 'MSG-2', nombre: 'Luis Pérez', leido: true })]);
    renderApp('/admin/mensajes');
    expect(await screen.findByText('Ana Martínez')).toBeInTheDocument();
    expect(screen.getByText('Luis Pérez')).toBeInTheDocument();
    expect(screen.getAllByText('Nuevo')).toHaveLength(1);
    const nav = screen.getByRole('navigation', { name: /administrativa/i });
    expect(within(nav).getByLabelText('1 sin leer')).toBeInTheDocument();
  });

  it('filtra por sin leer / leídos y busca por nombre, correo o asunto', async () => {
    const usuario = userEvent.setup();
    sembrarAdmin();
    escribirJSON(CLAVE_MENSAJES, [mensaje(), mensaje({ id: 'MSG-2', nombre: 'Luis Pérez', correo: 'luis@correo.com', asunto: 'Queja', leido: true })]);
    renderApp('/admin/mensajes');
    await screen.findByText('Ana Martínez');
    await usuario.click(screen.getByRole('button', { name: 'Sin leer' }));
    expect(screen.getByText('Ana Martínez')).toBeInTheDocument();
    expect(screen.queryByText('Luis Pérez')).not.toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Leídos' }));
    expect(screen.queryByText('Ana Martínez')).not.toBeInTheDocument();
    expect(screen.getByText('Luis Pérez')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Todos' }));
    await usuario.type(screen.getByLabelText('Buscar mensaje'), 'queja');
    expect(screen.getByText('Luis Pérez')).toBeInTheDocument();
    expect(screen.queryByText('Ana Martínez')).not.toBeInTheDocument();
    await usuario.clear(screen.getByLabelText('Buscar mensaje'));
    await usuario.type(screen.getByLabelText('Buscar mensaje'), 'zzz');
    expect(await screen.findByText(/No se encontraron mensajes/)).toBeInTheDocument();
  });

  it('"Leer" abre el mensaje completo y lo marca como leído', async () => {
    const usuario = userEvent.setup();
    sembrarAdmin();
    escribirJSON(CLAVE_MENSAJES, [mensaje()]);
    renderApp('/admin/mensajes');
    await usuario.click(await screen.findByRole('button', { name: 'Leer mensaje de Ana Martínez' }));
    await waitFor(() => expect(huboDialogo('Pedido para un evento')).toBe(true));
    const html = dialogos('Pedido para un evento')[0].html;
    expect(html).toContain('Necesito cien pupusas para el sábado.');
    expect(html).toContain('mailto:ana%40correo.com');
    await waitFor(() => expect(leerJSON(CLAVE_MENSAJES, [])[0].leido).toBe(true));
    expect(screen.queryByText('Nuevo')).not.toBeInTheDocument();
  });

  it('el mensaje abierto ofrece responder por correo y en Gmail como el correo del negocio', async () => {
    const usuario = userEvent.setup();
    sembrarAdmin();
    escribirJSON(CLAVE_MENSAJES, [mensaje()]);
    renderApp('/admin/mensajes');
    await usuario.click(await screen.findByRole('button', { name: 'Leer mensaje de Ana Martínez' }));
    await waitFor(() => expect(huboDialogo('Pedido para un evento')).toBe(true));
    const html = dialogos('Pedido para un evento')[0].html;
    expect(html).toContain(CORREO_NEGOCIO);
    expect(html).toContain('Responder por correo');
    expect(html).toContain('href="mailto:ana%40correo.com?subject=Re%3A');
    expect(html).toContain('href="https://mail.google.com/mail/?view=cm');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('el texto del cliente se escapa: no se puede inyectar HTML en el panel', async () => {
    const usuario = userEvent.setup();
    sembrarAdmin();
    escribirJSON(CLAVE_MENSAJES, [mensaje({ asunto: 'Hola', mensaje: '<img src=x onerror=alert(1)>' })]);
    renderApp('/admin/mensajes');
    await usuario.click(await screen.findByRole('button', { name: 'Leer mensaje de Ana Martínez' }));
    await waitFor(() => expect(huboDialogo('Hola')).toBe(true));
    const html = dialogos('Hola')[0].html;
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('alterna leído / sin leer con el botón de la fila', async () => {
    const usuario = userEvent.setup();
    sembrarAdmin();
    escribirJSON(CLAVE_MENSAJES, [mensaje()]);
    renderApp('/admin/mensajes');
    await usuario.click(await screen.findByRole('button', { name: /Marcar como leído el mensaje de Ana/ }));
    await waitFor(() => expect(leerJSON(CLAVE_MENSAJES, [])[0].leido).toBe(true));
    await usuario.click(await screen.findByRole('button', { name: /Marcar como sin leer el mensaje de Ana/ }));
    await waitFor(() => expect(leerJSON(CLAVE_MENSAJES, [])[0].leido).toBe(false));
  });

  it('eliminar pide confirmación y, si se acepta, borra el mensaje', async () => {
    const usuario = userEvent.setup();
    sembrarAdmin();
    escribirJSON(CLAVE_MENSAJES, [mensaje()]);
    renderApp('/admin/mensajes');
    await usuario.click(await screen.findByRole('button', { name: 'Eliminar mensaje de Ana Martínez' }));
    await waitFor(() => expect(huboDialogo('¿Eliminar este mensaje?')).toBe(true));
    await waitFor(() => expect(leerJSON(CLAVE_MENSAJES, [])).toHaveLength(0));
    expect(await screen.findByText(/Aún no hay mensajes/)).toBeInTheDocument();
  });

  it('si se cancela la confirmación, el mensaje se conserva', async () => {
    const usuario = userEvent.setup();
    sembrarAdmin();
    escribirJSON(CLAVE_MENSAJES, [mensaje()]);
    Swal.fire.mockImplementation(async () => ({ isConfirmed: false, isDenied: false, isDismissed: true }));
    renderApp('/admin/mensajes');
    await usuario.click(await screen.findByRole('button', { name: 'Eliminar mensaje de Ana Martínez' }));
    await waitFor(() => expect(huboDialogo('¿Eliminar este mensaje?')).toBe(true));
    expect(leerJSON(CLAVE_MENSAJES, [])).toHaveLength(1);
    expect(screen.getByText('Ana Martínez')).toBeInTheDocument();
  });

  it('pagina de 8 en 8', async () => {
    const usuario = userEvent.setup();
    sembrarAdmin();
    escribirJSON(CLAVE_MENSAJES, Array.from({ length: 10 }, (_, i) => mensaje({ id: `MSG-${i}`, nombre: `Cliente ${i + 1}` })));
    renderApp('/admin/mensajes');
    await screen.findByText('Cliente 1');
    expect(screen.queryByText('Cliente 9')).not.toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Página siguiente' }));
    expect(await screen.findByText('Cliente 9')).toBeInTheDocument();
  });

  it('llega un mensaje nuevo y el contador de la barra se actualiza sin recargar', async () => {
    sembrarAdmin();
    renderApp('/admin/mensajes');
    await screen.findByText(/Aún no hay mensajes/);
    guardarMensaje({ nombre: 'Rosa', correo: 'rosa@correo.com', asunto: 'Hola', mensaje: 'Buenas tardes' });
    expect(await screen.findByText('Rosa')).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: /administrativa/i });
    expect(within(nav).getByLabelText('1 sin leer')).toBeInTheDocument();
  });

  it('se llega desde el menú del administrador', async () => {
    const usuario = userEvent.setup();
    sembrarAdmin();
    renderApp('/admin/pedidos');
    await screen.findByRole('heading', { name: 'Pedidos' });
    await usuario.click(within(screen.getByRole('navigation', { name: /administrativa/i })).getByRole('link', { name: /Mensajes/ }));
    expect(await screen.findByRole('heading', { name: 'Mensajes' })).toBeInTheDocument();
  });

  it('un cliente o un visitante no pueden entrar a la bandeja', async () => {
    sembrarCliente();
    renderApp('/admin/mensajes');
    expect(await screen.findByLabelText('Correo Electrónico')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Mensajes' })).not.toBeInTheDocument();
  });
});
