import { jsPDF } from 'jspdf';
import { describe, expect, it } from 'vitest';
import { construirComprobante } from '../services/comprobante.js';
import { prepararPedidos } from '../services/pedidos.js';
import { pedidoBase } from './utils.jsx';

const bytes = doc => new Uint8Array(doc.output('arraybuffer'));
const textoPdf = doc => new TextDecoder('latin1').decode(bytes(doc));

describe('comprobante en PDF (jsPDF)', () => {
  it('genera un PDF válido tamaño A5 de una página con los datos del pedido', () => {
    const [pedido] = prepararPedidos([pedidoBase()]);
    const doc = construirComprobante(pedido, jsPDF);
    expect(textoPdf(doc).startsWith('%PDF-')).toBe(true);
    expect(doc.getNumberOfPages()).toBe(1);
    expect(doc.internal.pageSize.getWidth()).toBeCloseTo(148, 0);
    expect(doc.internal.pageSize.getHeight()).toBeCloseTo(210, 0);
  });

  it('un pedido con muchos productos pasa a una segunda página', () => {
    const items = Array.from({ length: 30 }, (_, i) => ({ productoId: `p${i}`, nombre: `Producto número ${i + 1}`, categoria: 'Pupusas', precio: 1, cantidad: 1 }));
    const [pedido] = prepararPedidos([pedidoBase({ items, subtotal: 30, total: 31 })]);
    expect(construirComprobante(pedido, jsPDF).getNumberOfPages()).toBe(2);
  });

  it('acepta direcciones largas y referencia sin romperse', () => {
    const [pedido] = prepararPedidos([pedidoBase({ direccion: 'Colonia Escalón, '.repeat(8), referencia: 'Frente a la plaza' })]);
    expect(() => construirComprobante(pedido, jsPDF)).not.toThrow();
  });
});
