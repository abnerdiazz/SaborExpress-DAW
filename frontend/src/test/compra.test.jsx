import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buscarDirecciones, direccionDesdeCoordenadas, ErrorApi } from '../services/nominatim.js';
import { descargarComprobante } from '../services/comprobante.js';
import { PRODUCTOS_INICIALES } from '../services/catalogo.js';
import { escribirJSON, leerJSON } from '../services/store.js';
import { Swal, dialogos, huboDialogo, itemCarrito, renderApp, sembrarCliente } from './utils.jsx';

// El mapa real necesita un navegador de verdad: se reemplaza por un doble con dos botones para "marcar" el pin.
vi.mock('../components/checkout/MapPicker.jsx', () => ({
  default: ({ ubicacion, onCambiar }) => (
    <div data-testid="mapa" data-ubicacion={JSON.stringify(ubicacion)}>
      <button type="button" onClick={() => onCambiar({ lat: 13.7106, lng: -89.2406 })}>marcar-dentro</button>
      <button type="button" onClick={() => onCambiar({ lat: 13.9006, lng: -89.2406 })}>marcar-fuera</button>
    </div>
  )
}));
vi.mock('../services/nominatim.js', async original => ({
  ...(await original()),
  buscarDirecciones: vi.fn(),
  direccionDesdeCoordenadas: vi.fn()
}));
vi.mock('../services/comprobante.js', () => ({ descargarComprobante: vi.fn(async () => true) }));
vi.mock('../hooks/useDebounce.js', () => ({ useDebounce: valor => valor }));

const DIRECCION_API = { texto: 'Calle El Mirador 123, Escalón, San Salvador', completo: 'Calle El Mirador 123, Escalón, San Salvador, El Salvador' };
const LUGAR = { id: '11', texto: 'Paseo General Escalón 3500, San Salvador', completo: 'Paseo General Escalón 3500', lat: 13.7011, lng: -89.2399 };

beforeEach(() => {
  buscarDirecciones.mockReset();
  direccionDesdeCoordenadas.mockReset();
  direccionDesdeCoordenadas.mockResolvedValue(null);
  descargarComprobante.mockClear();
});

describe('Carrito', () => {
  it('vacío: invita a ver el menú, los totales están en cero y el checkout está desactivado', async () => {
    renderApp('/carrito');
    expect(await screen.findByText(/Tu carrito está vacío/)).toBeInTheDocument();
    expect(screen.getByTestId('carrito-subtotal')).toHaveTextContent('$0.00');
    expect(screen.getByTestId('carrito-total')).toHaveTextContent('$0.00');
    expect(screen.getByRole('link', { name: 'Continuar al checkout' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByRole('button', { name: /vaciar carrito/i })).not.toBeInTheDocument();
  });

  it('con productos calcula subtotal, envío fijo y total', async () => {
    escribirJSON('saborExpressCart', [itemCarrito({ cantidad: 2 }), itemCarrito({ productoId: 'beb-cafe', nombre: 'Café de Olla', precio: 0.75, cantidad: 4 })]);
    renderApp('/carrito');
    expect(await screen.findByText('Pupusa Revuelta')).toBeInTheDocument();
    expect(screen.getByTestId('carrito-subtotal')).toHaveTextContent('$4.70');
    expect(screen.getByTestId('carrito-total')).toHaveTextContent('$5.70');
    expect(screen.getByRole('link', { name: 'Continuar al checkout' })).toHaveAttribute('aria-disabled', 'false');
  });

  it('suma y resta unidades; el subtotal y el contador se actualizan', async () => {
    const usuario = userEvent.setup();
    escribirJSON('saborExpressCart', [itemCarrito({ cantidad: 2 })]);
    renderApp('/carrito');
    await usuario.click(await screen.findByRole('button', { name: 'Aumentar cantidad de Pupusa Revuelta' }));
    expect(screen.getByTestId('carrito-subtotal')).toHaveTextContent('$2.55');
    expect(screen.getByTestId('contador-carrito')).toHaveTextContent('3');
    await usuario.click(screen.getByRole('button', { name: 'Disminuir cantidad de Pupusa Revuelta' }));
    expect(screen.getByTestId('carrito-subtotal')).toHaveTextContent('$1.70');
  });

  it('no deja pasar de 20 unidades y avisa', async () => {
    const usuario = userEvent.setup();
    escribirJSON('saborExpressCart', [itemCarrito({ cantidad: 20 })]);
    renderApp('/carrito');
    await usuario.click(await screen.findByRole('button', { name: 'Aumentar cantidad de Pupusa Revuelta' }));
    expect(Swal.fire.mock.calls.some(([o]) => o.toast && /Máximo 20 unidades de "Pupusa Revuelta"/.test(o.title))).toBe(true);
    expect(leerJSON('saborExpressCart', [])[0].cantidad).toBe(20);
  });

  it('bajar de 1 a 0 pide confirmación para quitar el producto', async () => {
    const usuario = userEvent.setup();
    escribirJSON('saborExpressCart', [itemCarrito({ cantidad: 1 })]);
    renderApp('/carrito');
    Swal.fire.mockResolvedValueOnce({ isConfirmed: false, isDismissed: true });
    await usuario.click(await screen.findByRole('button', { name: 'Disminuir cantidad de Pupusa Revuelta' }));
    expect(leerJSON('saborExpressCart', [])).toHaveLength(1);
    await usuario.click(screen.getByRole('button', { name: 'Disminuir cantidad de Pupusa Revuelta' }));
    expect(huboDialogo('¿Quitar este producto?')).toBe(true);
    await waitFor(() => expect(screen.getByText(/Tu carrito está vacío/)).toBeInTheDocument());
    expect(Swal.fire.mock.calls.some(([o]) => o.toast && /quitado del carrito/.test(o.title))).toBe(true);
  });

  it('"Vaciar carrito" pide confirmación', async () => {
    const usuario = userEvent.setup();
    escribirJSON('saborExpressCart', [itemCarrito()]);
    renderApp('/carrito');
    Swal.fire.mockResolvedValueOnce({ isConfirmed: false, isDismissed: true });
    await usuario.click(await screen.findByRole('button', { name: /vaciar carrito/i }));
    expect(leerJSON('saborExpressCart', [])).toHaveLength(1);
    await usuario.click(screen.getByRole('button', { name: /vaciar carrito/i }));
    expect(huboDialogo('¿Vaciar el carrito?')).toBe(true);
    await waitFor(() => expect(leerJSON('saborExpressCart', [])).toEqual([]));
  });

  it('el botón de checkout lleva al login si no hay sesión y al checkout si la hay', async () => {
    escribirJSON('saborExpressCart', [itemCarrito()]);
    const { unmount } = renderApp('/carrito');
    expect((await screen.findByRole('link', { name: 'Continuar al checkout' })).getAttribute('href')).toBe('/login?redirect=%2Fcheckout');
    unmount();
    sembrarCliente();
    renderApp('/carrito');
    expect((await screen.findByRole('link', { name: 'Continuar al checkout' })).getAttribute('href')).toBe('/checkout');
  });

  it('al entrar quita lo que el administrador ocultó, actualiza precios y avisa', async () => {
    escribirJSON('saborExpressProductos', PRODUCTOS_INICIALES
      .map(p => (p.id === 'pup-loca' ? { ...p, activo: false } : p))
      .map(p => (p.id === 'pup-revuelta' ? { ...p, precio: 0.95 } : p)));
    escribirJSON('saborExpressCart', [itemCarrito({ cantidad: 2 }), itemCarrito({ productoId: 'pup-loca', nombre: 'Pupusa Loca', precio: 1.5, cantidad: 1 })]);
    renderApp('/carrito');
    await waitFor(() => expect(huboDialogo('Actualizamos tu carrito')).toBe(true));
    const texto = dialogos('Actualizamos tu carrito')[0].text;
    expect(texto).toContain('Pupusa Loca');
    expect(texto).toContain('Cambió el precio de: Pupusa Revuelta');
    const carrito = leerJSON('saborExpressCart', []);
    expect(carrito).toHaveLength(1);
    expect(carrito[0].precio).toBe(0.95);
    expect(screen.queryByText('Pupusa Loca')).not.toBeInTheDocument();
  });
});

describe('Checkout', () => {
  const preparar = () => {
    sembrarCliente();
    escribirJSON('saborExpressCart', [itemCarrito({ cantidad: 2 }), itemCarrito({ productoId: 'beb-cafe', nombre: 'Café de Olla', categoria: 'Bebidas', precio: 0.75, cantidad: 1 })]);
  };
  const escribir = async (usuario, etiqueta, texto) => {
    const campo = screen.getByLabelText(etiqueta);
    await usuario.clear(campo);
    await usuario.type(campo, texto);
  };
  const llenar = async usuario => {
    await escribir(usuario, 'DIRECCIÓN DE ENTREGA', 'Calle El Mirador 123, Escalón');
  };

  it('precarga el nombre y el teléfono de la cuenta y muestra el resumen con envío fijo', async () => {
    preparar();
    renderApp('/checkout');
    expect(await screen.findByLabelText('NOMBRE DE CONTACTO')).toHaveValue('Ana Martínez');
    expect(screen.getByLabelText('TELÉFONO DE CONTACTO')).toHaveValue('7890-1234');
    expect(screen.getByText('2x Pupusa Revuelta')).toBeInTheDocument();
    expect(screen.getByTestId('checkout-subtotal')).toHaveTextContent('$2.45');
    expect(screen.getByTestId('checkout-total')).toHaveTextContent('$3.45');
  });

  it('con el carrito vacío deshabilita el botón de confirmar', async () => {
    sembrarCliente();
    renderApp('/checkout');
    expect(await screen.findByRole('button', { name: 'Confirmar pedido' })).toBeDisabled();
    expect(screen.getByText(/No hay productos en el pedido/)).toBeInTheDocument();
  });

  it('valida los campos antes de confirmar y lleva el foco al primer error', async () => {
    const usuario = userEvent.setup();
    preparar();
    renderApp('/checkout');
    await escribir(usuario, 'NOMBRE DE CONTACTO', 'A1');
    await escribir(usuario, 'TELÉFONO DE CONTACTO', '12');
    await usuario.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    expect(await screen.findByText('Usa solo letras y espacios (entre 3 y 60 caracteres).')).toBeInTheDocument();
    expect(screen.getByText('Escribe 8 dígitos, por ejemplo 7777-7777.')).toBeInTheDocument();
    expect(screen.getByText('Ingresa tu dirección de entrega.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('NOMBRE DE CONTACTO')).toHaveFocus());
    expect(leerJSON('saborExpressPedidos', [])).toEqual([]);
  });

  it('una dirección de menos de 8 caracteres se rechaza', async () => {
    const usuario = userEvent.setup();
    preparar();
    renderApp('/checkout');
    await escribir(usuario, 'DIRECCIÓN DE ENTREGA', 'Calle 1');
    await usuario.tab();
    expect(await screen.findByText('Escribe al menos 8 caracteres.')).toBeInTheDocument();
  });

  it('sin marcar la ubicación en el mapa no deja confirmar', async () => {
    const usuario = userEvent.setup();
    preparar();
    renderApp('/checkout');
    await llenar(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    await waitFor(() => expect(huboDialogo('Marca tu ubicación')).toBe(true));
    expect(leerJSON('saborExpressPedidos', [])).toEqual([]);
    expect(screen.getByText(/Mueve el pin hasta tu dirección/)).toBeInTheDocument();
  });

  it('un punto dentro de los 5 km muestra el estado verde con la distancia', async () => {
    const usuario = userEvent.setup();
    preparar();
    renderApp('/checkout');
    await usuario.click(await screen.findByRole('button', { name: 'marcar-dentro' }));
    expect(await screen.findByText(/¡Llegamos a tu ubicación! Estás a 1\.1 km del local\./)).toHaveClass('zone-ok');
  });

  it('un punto fuera de la zona muestra el estado rojo y no deja confirmar', async () => {
    const usuario = userEvent.setup();
    preparar();
    renderApp('/checkout');
    await llenar(usuario);
    await usuario.click(screen.getByRole('button', { name: 'marcar-fuera' }));
    expect(await screen.findByText(/Fuera de la zona de cobertura: estás a 22\.2 km y entregamos hasta 5 km/)).toHaveClass('zone-out');
    await usuario.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    await waitFor(() => expect(huboDialogo('Fuera de la zona de cobertura')).toBe(true));
    expect(dialogos('Fuera de la zona de cobertura')[0].text).toContain('22.2 km');
    expect(leerJSON('saborExpressPedidos', [])).toEqual([]);
  });

  describe('API de direcciones (Nominatim)', () => {
    it('al marcar un punto consulta la dirección y rellena el campo si estaba vacío', async () => {
      const usuario = userEvent.setup();
      preparar();
      direccionDesdeCoordenadas.mockResolvedValue(DIRECCION_API);
      renderApp('/checkout');
      await usuario.click(await screen.findByRole('button', { name: 'marcar-dentro' }));
      expect(await screen.findByText(DIRECCION_API.texto, { selector: 'strong' })).toBeInTheDocument();
      expect(screen.getByLabelText('DIRECCIÓN DE ENTREGA')).toHaveValue(DIRECCION_API.texto);
      expect(direccionDesdeCoordenadas).toHaveBeenCalledWith(13.7106, -89.2406, expect.objectContaining({ signal: expect.anything() }));
    });

    it('si la persona ya escribió su dirección, no se la pisa y ofrece usar la detectada', async () => {
      const usuario = userEvent.setup();
      preparar();
      direccionDesdeCoordenadas.mockResolvedValue(DIRECCION_API);
      renderApp('/checkout');
      await llenar(usuario);
      await usuario.click(screen.getByRole('button', { name: 'marcar-dentro' }));
      await screen.findByText(DIRECCION_API.texto, { selector: 'strong' });
      expect(screen.getByLabelText('DIRECCIÓN DE ENTREGA')).toHaveValue('Calle El Mirador 123, Escalón');
      await usuario.click(screen.getByRole('button', { name: 'Usar esta dirección' }));
      expect(screen.getByLabelText('DIRECCIÓN DE ENTREGA')).toHaveValue(DIRECCION_API.texto);
      expect(screen.queryByRole('button', { name: 'Usar esta dirección' })).not.toBeInTheDocument();
    });

    it('mientras la API responde muestra un indicador de carga', async () => {
      const usuario = userEvent.setup();
      preparar();
      let responder;
      direccionDesdeCoordenadas.mockReturnValue(new Promise(resolver => { responder = resolver; }));
      renderApp('/checkout');
      await usuario.click(await screen.findByRole('button', { name: 'marcar-dentro' }));
      expect(await screen.findByText('Buscando la dirección de este punto...')).toBeInTheDocument();
      await act(async () => { responder(DIRECCION_API); });
      await waitFor(() => expect(screen.queryByText('Buscando la dirección de este punto...')).not.toBeInTheDocument());
    });

    it('si la API falla muestra el motivo y se puede seguir escribiendo la dirección', async () => {
      const usuario = userEvent.setup();
      preparar();
      direccionDesdeCoordenadas.mockRejectedValue(new ErrorApi('red', 'Sin conexión'));
      renderApp('/checkout');
      await usuario.click(await screen.findByRole('button', { name: 'marcar-dentro' }));
      expect(await screen.findByRole('alert')).toHaveTextContent(/No hay conexión con el servicio de mapas/);
      await escribir(usuario, 'DIRECCIÓN DE ENTREGA', 'Calle El Mirador 123, Escalón');
      await usuario.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
      await waitFor(() => expect(huboDialogo('¿Confirmar tu pedido?')).toBe(true));
    });

    it('busca una dirección con el botón, muestra las sugerencias y al elegir una mueve el pin', async () => {
      const usuario = userEvent.setup();
      preparar();
      buscarDirecciones.mockResolvedValue([LUGAR]);
      renderApp('/checkout');
      await escribir(usuario, 'DIRECCIÓN DE ENTREGA', 'Paseo General Escalón');
      await usuario.click(screen.getByRole('button', { name: /Buscar esta dirección en el mapa/ }));
      const sugerencias = await screen.findByRole('list', { name: 'Direcciones encontradas' });
      expect(buscarDirecciones).toHaveBeenCalledWith('Paseo General Escalón', expect.anything());
      await usuario.click(within(sugerencias).getByRole('button', { name: /Paseo General Escalón 3500/ }));
      expect(screen.getByLabelText('DIRECCIÓN DE ENTREGA')).toHaveValue(LUGAR.texto);
      expect(JSON.parse(screen.getByTestId('mapa').dataset.ubicacion)).toEqual({ lat: LUGAR.lat, lng: LUGAR.lng });
      expect(screen.queryByRole('list', { name: 'Direcciones encontradas' })).not.toBeInTheDocument();
      expect(await screen.findByText(/¡Llegamos a tu ubicación!/)).toBeInTheDocument();
    });

    it('la búsqueda también se lanza con Enter y no envía el formulario', async () => {
      const usuario = userEvent.setup();
      preparar();
      buscarDirecciones.mockResolvedValue([LUGAR]);
      renderApp('/checkout');
      await usuario.type(await screen.findByLabelText('DIRECCIÓN DE ENTREGA'), 'Paseo General{Enter}');
      await screen.findByRole('list', { name: 'Direcciones encontradas' });
      expect(buscarDirecciones).toHaveBeenCalledTimes(1);
      expect(huboDialogo('¿Confirmar tu pedido?')).toBe(false);
    });

    it('no se consulta mientras se escribe (la API prohíbe el autocompletado)', async () => {
      const usuario = userEvent.setup();
      preparar();
      renderApp('/checkout');
      await usuario.type(await screen.findByLabelText('DIRECCIÓN DE ENTREGA'), 'Paseo General Escalón 3500');
      expect(buscarDirecciones).not.toHaveBeenCalled();
    });

    it('si no hay resultados o la API falla, lo explica', async () => {
      const usuario = userEvent.setup();
      preparar();
      buscarDirecciones.mockResolvedValueOnce([]).mockRejectedValueOnce(new ErrorApi('limite', 'Demasiadas consultas'));
      renderApp('/checkout');
      await escribir(usuario, 'DIRECCIÓN DE ENTREGA', 'Lugar inexistente');
      await usuario.click(screen.getByRole('button', { name: /Buscar esta dirección en el mapa/ }));
      expect(await screen.findByText(/No encontramos esa dirección/)).toBeInTheDocument();
      await usuario.click(screen.getByRole('button', { name: /Buscar esta dirección en el mapa/ }));
      expect(await screen.findByRole('alert')).toHaveTextContent(/Hay muchas consultas/);
    });
  });

  describe('ubicación del dispositivo', () => {
    it('"Usar mi ubicación actual" coloca el pin donde está la persona', async () => {
      const usuario = userEvent.setup();
      preparar();
      navigator.geolocation = { getCurrentPosition: vi.fn(ok => ok({ coords: { latitude: 13.7006, longitude: -89.2406 } })) };
      renderApp('/checkout');
      await usuario.click(await screen.findByRole('button', { name: /Usar mi ubicación actual/ }));
      expect(JSON.parse(screen.getByTestId('mapa').dataset.ubicacion)).toEqual({ lat: 13.7006, lng: -89.2406 });
      expect(await screen.findByText(/Estás a 0\.0 km del local/)).toBeInTheDocument();
    });

    it('si se niega el permiso o no hay GPS, avisa y deja marcar el pin a mano', async () => {
      const usuario = userEvent.setup();
      preparar();
      navigator.geolocation = { getCurrentPosition: vi.fn((_ok, fallo) => fallo(new Error('denegado'))) };
      renderApp('/checkout');
      await usuario.click(await screen.findByRole('button', { name: /Usar mi ubicación actual/ }));
      await waitFor(() => expect(huboDialogo('No pudimos obtener tu ubicación')).toBe(true));
      navigator.geolocation = undefined;
      await usuario.click(screen.getByRole('button', { name: /Usar mi ubicación actual/ }));
      await waitFor(() => expect(huboDialogo('Ubicación no disponible')).toBe(true));
    });
  });

  describe('confirmación del pedido', () => {
    const confirmarTodo = async usuario => {
      await llenar(usuario);
      await escribir(usuario, 'PUNTO DE REFERENCIA', 'Frente a la farmacia');
      await usuario.click(screen.getByRole('button', { name: 'marcar-dentro' }));
      await usuario.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    };

    it('resume el pedido, lo guarda, vacía el carrito y lleva a Mis pedidos', async () => {
      const usuario = userEvent.setup();
      preparar();
      renderApp('/checkout');
      await confirmarTodo(usuario);
      expect(await screen.findByRole('heading', { name: 'Pedido en Curso' })).toBeInTheDocument();

      const resumen = dialogos('¿Confirmar tu pedido?')[0];
      expect(resumen.html).toContain('2× Pupusa Revuelta');
      expect(resumen.html).toContain('Efectivo (contra entrega)');
      expect(resumen.confirmButtonText).toBe('Confirmar · $3.45');

      const [pedido] = leerJSON('saborExpressPedidos', []);
      expect(pedido).toMatchObject({
        id: 'SE-0001', estado: 'Pendiente', cliente: 'Ana Martínez', email: 'ana@correo.com', telefono: '7890-1234',
        direccion: 'Calle El Mirador 123, Escalón', referencia: 'Frente a la farmacia', pago: 'Efectivo (contra entrega)',
        subtotal: 2.45, envio: 1, total: 3.45, ubicacion: { lat: 13.7106, lng: -89.2406 }
      });
      expect(pedido.items).toHaveLength(2);
      expect(leerJSON('saborExpressCart', [])).toEqual([]);
      expect(huboDialogo('¡Pedido confirmado!')).toBe(true);
      expect(screen.getByText('ORDEN: #SE-0001')).toBeInTheDocument();
    });

    it('guarda el método de pago elegido', async () => {
      const usuario = userEvent.setup();
      preparar();
      renderApp('/checkout');
      await usuario.click(await screen.findByLabelText('Transferencia bancaria'));
      expect(screen.getByLabelText('Transferencia bancaria').closest('label')).toHaveClass('active');
      await confirmarTodo(usuario);
      await screen.findByRole('heading', { name: 'Pedido en Curso' });
      expect(leerJSON('saborExpressPedidos', [])[0].pago).toBe('Transferencia bancaria');
    });

    it('si la persona pulsa "Revisar", no se crea ningún pedido', async () => {
      const usuario = userEvent.setup();
      preparar();
      renderApp('/checkout');
      Swal.fire.mockResolvedValueOnce({ isConfirmed: false, isDismissed: true });
      await confirmarTodo(usuario);
      await waitFor(() => expect(huboDialogo('¿Confirmar tu pedido?')).toBe(true));
      expect(leerJSON('saborExpressPedidos', [])).toEqual([]);
      expect(leerJSON('saborExpressCart', [])).toHaveLength(2);
      expect(screen.getByRole('heading', { name: 'Checkout' })).toBeInTheDocument();
    });

    it('el cuadro final permite descargar el comprobante PDF sin cerrarse', async () => {
      const usuario = userEvent.setup();
      preparar();
      renderApp('/checkout');
      let cierraDespuesDeDescargar;
      Swal.fire.mockImplementation(async opciones => {
        if (opciones.title === '¡Pedido confirmado!') {
          cierraDespuesDeDescargar = await opciones.preDeny();
          return { isConfirmed: true };
        }
        return { isConfirmed: true };
      });
      await confirmarTodo(usuario);
      await screen.findByRole('heading', { name: 'Pedido en Curso' });
      expect(descargarComprobante).toHaveBeenCalledTimes(1);
      expect(descargarComprobante.mock.calls[0][0]).toMatchObject({ id: 'SE-0001', total: 3.45 });
      expect(cierraDespuesDeDescargar).toBe(false); // false = el cuadro sigue abierto
      const final = dialogos('¡Pedido confirmado!')[0];
      expect(final.html).toContain('wa.me/50322000000');
      expect(final.html).toContain(encodeURIComponent('Pedido #SE-0001'));
      expect(final).toMatchObject({ denyButtonText: 'Descargar comprobante PDF', allowOutsideClick: false });
    });

    it('los datos escritos por la persona no se interpretan como HTML en los cuadros', async () => {
      const usuario = userEvent.setup();
      preparar();
      renderApp('/checkout');
      await escribir(usuario, 'DIRECCIÓN DE ENTREGA', '<img src=x onerror=alert(1)> Calle 5');
      await usuario.click(screen.getByRole('button', { name: 'marcar-dentro' }));
      await usuario.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
      await screen.findByRole('heading', { name: 'Pedido en Curso' });
      expect(dialogos('¿Confirmar tu pedido?')[0].html).not.toContain('<img');
      expect(dialogos('¿Confirmar tu pedido?')[0].html).toContain('&lt;img');
    });

    it('al abrir el checkout ajusta el carrito al menú vigente y avisa', async () => {
      preparar();
      escribirJSON('saborExpressProductos', PRODUCTOS_INICIALES.map(p => (p.id === 'beb-cafe' ? { ...p, activo: false } : p)));
      renderApp('/checkout');
      await waitFor(() => expect(huboDialogo('Actualizamos tu pedido')).toBe(true));
      expect(dialogos('Actualizamos tu pedido')[0].text).toContain('Café de Olla');
      expect(screen.queryByText('1x Café de Olla')).not.toBeInTheDocument();
    });
  });
});
