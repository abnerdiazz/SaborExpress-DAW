import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ESPERA_ENTRE_PETICIONES_MS, ErrorApi, TIEMPO_MAXIMO_MS, buscarDirecciones, direccionDesdeCoordenadas,
  formatearDireccion, mensajeDeError, reiniciarServicio
} from '../services/nominatim.js';

const respuesta = (cuerpo, estado = 200) => ({ ok: estado >= 200 && estado < 300, status: estado, json: async () => cuerpo });

const LUGAR = {
  place_id: 11, lat: '13.7001', lon: '-89.2399', display_name: 'Calle El Mirador 123, Escalón, San Salvador, El Salvador',
  address: { road: 'Calle El Mirador', house_number: '123', suburb: 'Escalón', city: 'San Salvador', state: 'San Salvador' }
};

describe('API Nominatim', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    reiniciarServicio();
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('busca una dirección y devuelve lugares con coordenadas numéricas', async () => {
    fetch.mockResolvedValueOnce(respuesta([LUGAR]));
    const promesa = buscarDirecciones('Calle El Mirador 123');
    await vi.runAllTimersAsync();
    const lugares = await promesa;
    expect(lugares).toEqual([{
      id: '11', texto: 'Calle El Mirador 123, Escalón, San Salvador, San Salvador',
      completo: LUGAR.display_name, lat: 13.7001, lng: -89.2399
    }]);
    const url = new URL(fetch.mock.calls[0][0]);
    expect(url.pathname).toBe('/search');
    expect(url.searchParams.get('countrycodes')).toBe('sv');
    expect(url.searchParams.get('accept-language')).toBe('es');
    expect(url.searchParams.get('q')).toBe('Calle El Mirador 123');
  });

  it('no consulta si el texto tiene menos de 3 letras', async () => {
    expect(await buscarDirecciones('ab')).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('descarta resultados sin coordenadas válidas', async () => {
    fetch.mockResolvedValueOnce(respuesta([LUGAR, { place_id: 2, lat: 'x', lon: 'y', display_name: 'Roto' }]));
    const promesa = buscarDirecciones('colonia escalon');
    await vi.runAllTimersAsync();
    expect(await promesa).toHaveLength(1);
  });

  it('geocodificación inversa: devuelve la dirección del punto o null si no hay nada', async () => {
    fetch.mockResolvedValueOnce(respuesta(LUGAR)).mockResolvedValueOnce(respuesta({ error: 'Unable to geocode' }));
    const a = direccionDesdeCoordenadas(13.7001, -89.2399);
    await vi.runAllTimersAsync();
    expect((await a).texto).toContain('Calle El Mirador 123');
    expect(new URL(fetch.mock.calls[0][0]).searchParams.get('lat')).toBe('13.70010');
    const b = direccionDesdeCoordenadas(0, 0);
    await vi.runAllTimersAsync();
    expect(await b).toBeNull();
  });

  it('repite una consulta igual sin volver a pedirla (caché)', async () => {
    fetch.mockResolvedValue(respuesta([LUGAR]));
    const a = buscarDirecciones('escalon');
    await vi.runAllTimersAsync();
    await a;
    await buscarDirecciones('escalon');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('respeta el máximo de una petición por segundo', async () => {
    fetch.mockResolvedValue(respuesta([]));
    const inicios = [];
    fetch.mockImplementation(async () => { inicios.push(Date.now()); return respuesta([]); });
    const a = buscarDirecciones('primera consulta');
    const b = buscarDirecciones('segunda consulta');
    const c = buscarDirecciones('tercera consulta');
    await vi.runAllTimersAsync();
    await Promise.all([a, b, c]);
    expect(inicios).toHaveLength(3);
    expect(inicios[1] - inicios[0]).toBeGreaterThanOrEqual(ESPERA_ENTRE_PETICIONES_MS);
    expect(inicios[2] - inicios[1]).toBeGreaterThanOrEqual(ESPERA_ENTRE_PETICIONES_MS);
  });

  it('traduce los fallos a errores con tipo y mensaje claro', async () => {
    fetch.mockResolvedValueOnce(respuesta({}, 429));
    let p = buscarDirecciones('consulta uno');
    p.catch(() => {});
    await vi.runAllTimersAsync();
    await expect(p).rejects.toMatchObject({ tipo: 'limite' });

    fetch.mockResolvedValueOnce(respuesta({}, 503));
    p = buscarDirecciones('consulta dos');
    p.catch(() => {});
    await vi.runAllTimersAsync();
    await expect(p).rejects.toMatchObject({ tipo: 'servidor' });

    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    p = buscarDirecciones('consulta tres');
    p.catch(() => {});
    await vi.runAllTimersAsync();
    await expect(p).rejects.toMatchObject({ tipo: 'red' });

    expect(mensajeDeError(new ErrorApi('red'))).toMatch(/conexión/);
    expect(mensajeDeError(new ErrorApi('limite'))).toMatch(/muchas consultas/);
    expect(mensajeDeError(new ErrorApi('tiempo'))).toMatch(/tardó/);
    expect(mensajeDeError(new ErrorApi('servidor'))).toMatch(/no está disponible/);
  });

  it('corta la consulta que tarda más del tiempo máximo', async () => {
    fetch.mockImplementation((_url, { signal }) => new Promise((_resolver, rechazar) => {
      signal.addEventListener('abort', () => rechazar(signal.reason), { once: true });
    }));
    const p = buscarDirecciones('consulta lenta');
    p.catch(() => {});
    await vi.advanceTimersByTimeAsync(TIEMPO_MAXIMO_MS + 100);
    await expect(p).rejects.toMatchObject({ tipo: 'tiempo' });
  });

  it('una consulta cancelada por la persona no hace petición y se reconoce como cancelada', async () => {
    const control = new AbortController();
    fetch.mockResolvedValue(respuesta([]));
    const primera = buscarDirecciones('primera cancelable');
    const segunda = buscarDirecciones('segunda cancelable', { signal: control.signal });
    segunda.catch(() => {});
    await vi.advanceTimersByTimeAsync(10);
    control.abort();
    await vi.runAllTimersAsync();
    await primera;
    await expect(segunda).rejects.toMatchObject({ tipo: 'cancelado' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('arma direcciones legibles con respaldo en display_name', () => {
    expect(formatearDireccion(LUGAR)).toBe('Calle El Mirador 123, Escalón, San Salvador, San Salvador');
    expect(formatearDireccion({ display_name: 'A, B, C, D, E' })).toBe('A, B, C');
    expect(formatearDireccion(null)).toBe('');
  });
});
