import { describe, expect, it } from 'vitest';
import {
  agrupar, categoriasACsv, construirSerieDiaria, contarDemo, contarPorEstado, eliminarDatosDemo, generarDatosDemo,
  indicadores, normalizarEstado, pedidosDelDia, pedidosEnRango, rangoActual
} from '../services/reportes.js';
import { CLAVE_PEDIDOS, prepararPedidos } from '../services/pedidos.js';
import { escribirJSON, leerJSON } from '../services/store.js';
import { pedidoBase } from './utils.jsx';

const AHORA = new Date('2026-10-20T15:00:00');
const dias = n => { const d = new Date(AHORA); d.setDate(d.getDate() - n); return d.toISOString(); };

const lista = prepararPedidos([
  pedidoBase({ id: 'SE-0001', creadoEn: dias(0), total: 10, estado: 'Entregado',
    items: [{ nombre: 'Pupusa Revuelta', categoria: 'Pupusas', precio: 1, cantidad: 4 }, { nombre: 'Café de Olla', categoria: 'Bebidas', precio: 2, cantidad: 3 }] }),
  pedidoBase({ id: 'SE-0002', creadoEn: dias(2), total: 5, estado: 'Pendiente',
    items: [{ nombre: 'Pupusa Revuelta', categoria: 'Pupusas', precio: 1, cantidad: 2 }] }),
  pedidoBase({ id: 'SE-0003', creadoEn: dias(3), total: 8, estado: 'Cancelado', items: [{ nombre: 'Pupusa Loca', categoria: 'Pupusas', precio: 1.5, cantidad: 4 }] }),
  pedidoBase({ id: 'SE-0004', creadoEn: dias(20), total: 7, estado: 'Entregado', items: [{ nombre: 'Arroz con Leche', categoria: 'Postres', precio: 1.5, cantidad: 2 }] })
]);

describe('reportes: rangos y filtros', () => {
  it('la última semana son 7 días e incluye hoy', () => {
    const r = rangoActual({ dias: 7 }, AHORA);
    expect(Math.round((r.fin - r.inicio) / 86400000)).toBe(7);
    expect(r.fin.getDate()).toBe(20);
  });

  it('un rango personalizado toma el día completo de inicio y de fin', () => {
    const r = rangoActual({ personalizado: { inicio: '2026-10-01', fin: '2026-10-05' } }, AHORA);
    expect(r.inicio.getHours()).toBe(0);
    expect(r.fin.getHours()).toBe(23);
  });

  it('las ventas no cuentan los cancelados, pero el estado sí', () => {
    const rango = rangoActual({ dias: 7 }, AHORA);
    expect(pedidosEnRango(lista, rango).map(p => p.id).sort()).toEqual(['SE-0001', 'SE-0002']);
    expect(pedidosEnRango(lista, rango, { incluirCancelados: true })).toHaveLength(3);
    expect(pedidosEnRango(lista, rangoActual({ dias: 30 }, AHORA))).toHaveLength(3);
  });
});

describe('reportes: números', () => {
  it('indicadores: pedidos, ingresos, ticket promedio y producto top', () => {
    const r = indicadores(pedidosEnRango(lista, rangoActual({ dias: 7 }, AHORA)));
    expect(r.cantidad).toBe(2);
    expect(r.ingresos).toBe(15);
    expect(r.ticketPromedio).toBe(7.5);
    expect(r.productoTop).toBe('Pupusa Revuelta');
    expect(indicadores([]).productoTop).toBe('—');
  });

  it('agrupa por categoría ordenando por ingreso', () => {
    const { categorias, productos } = agrupar(lista.slice(0, 2));
    expect(categorias[0]).toMatchObject({ categoria: 'Pupusas', cantidad: 6, ingreso: 6 });
    expect(categorias[1]).toMatchObject({ categoria: 'Bebidas', ingreso: 6 });
    expect(productos[0]).toMatchObject({ nombre: 'Pupusa Revuelta', cantidad: 6 });
  });

  it('cuenta pedidos por estado y normaliza nombres antiguos', () => {
    expect(contarPorEstado(lista)).toEqual({ Pendiente: 1, Preparando: 0, 'En camino': 0, Entregado: 2, Cancelado: 1 });
    expect(normalizarEstado('En preparación')).toBe('Preparando');
    expect(normalizarEstado('algo raro')).toBe('Pendiente');
  });

  it('serie diaria: una posición por día, con ventas y cantidad', () => {
    const rango = rangoActual({ dias: 7 }, AHORA);
    const vigentes = pedidosEnRango(lista, rango);
    const serie = construirSerieDiaria(vigentes, rango, { etiquetaCorta: true });
    expect(serie.etiquetas).toHaveLength(7);
    expect(serie.valores[6]).toBe(10);
    expect(serie.cantidades[6]).toBe(1);
    expect(serie.valores[4]).toBe(5);
    expect(pedidosDelDia(vigentes, serie.dias[6]).map(p => p.id)).toEqual(['SE-0001']);
    expect(pedidosDelDia(vigentes, serie.dias[0])).toEqual([]);
  });

  it('CSV con BOM, comillas escapadas y dos decimales', () => {
    const csv = categoriasACsv([{ categoria: 'Pupu"sas', cantidad: 6, ingreso: 6 }]);
    expect(csv.startsWith('\uFEFF"Categoría"')).toBe(true);
    expect(csv).toContain('"Pupu""sas","6","6.00"');
  });
});

describe('reportes: datos de demostración', () => {
  it('genera 45 pedidos demo sin tocar los reales, y los quita sin tocar los reales', () => {
    escribirJSON(CLAVE_PEDIDOS, [pedidoBase({ id: 'SE-0001' })]);
    expect(generarDatosDemo(45)).toBe(45);
    const todos = leerJSON(CLAVE_PEDIDOS, []);
    expect(todos).toHaveLength(46);
    expect(contarDemo(prepararPedidos(todos))).toBe(45);
    // generar otra vez reemplaza los demo, no los acumula
    generarDatosDemo(10);
    expect(leerJSON(CLAVE_PEDIDOS, [])).toHaveLength(11);
    expect(eliminarDatosDemo()).toBe(10);
    const reales = leerJSON(CLAVE_PEDIDOS, []);
    expect(reales).toHaveLength(1);
    expect(reales[0].id).toBe('SE-0001');
  });

  it('los pedidos demo tienen totales coherentes y fechas de los últimos 30 días', () => {
    generarDatosDemo(20);
    leerJSON(CLAVE_PEDIDOS, []).forEach(p => {
      const subtotal = p.items.reduce((s, i) => s + i.precio * i.cantidad, 0);
      expect(p.total).toBeCloseTo(subtotal + 1, 2);
      expect(Date.now() - new Date(p.creadoEn).getTime()).toBeLessThan(31 * 86400000);
    });
  });
});
