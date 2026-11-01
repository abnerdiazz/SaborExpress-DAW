import { describe, expect, it } from 'vitest';
import { evaluarCobertura, distanciaKm, NEGOCIO, RADIO_COBERTURA_KM } from '../services/cobertura.js';

describe('cobertura', () => {
  it('Haversine: el local está a 0 km y un punto lejano queda fuera', () => {
    expect(distanciaKm(NEGOCIO, NEGOCIO)).toBe(0);
    expect(evaluarCobertura(NEGOCIO.lat, NEGOCIO.lng).dentro).toBe(true);
    const lejos = evaluarCobertura(NEGOCIO.lat + 0.2, NEGOCIO.lng);
    expect(lejos.dentro).toBe(false);
    expect(lejos.distanciaKm).toBeGreaterThan(RADIO_COBERTURA_KM);
  });
});
