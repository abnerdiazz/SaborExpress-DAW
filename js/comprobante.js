/**
 * comprobante.js
 * ---------------------------------------------------------------------------
 * Genera el comprobante del pedido en PDF con jsPDF. La librería se carga
 * desde el CDN solo cuando se pide el comprobante (no pesa en el resto del sitio).
 * ---------------------------------------------------------------------------
 */

import { error as alertaError } from './alertas.js';

const JSPDF_URL = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
let promesaJsPDF = null;

function cargarJsPDF() {
    if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    if (!promesaJsPDF) {
        promesaJsPDF = new Promise(resolve => {
            const script = document.createElement('script');
            script.src = JSPDF_URL;
            script.async = true;
            script.onload = () => resolve(window.jspdf?.jsPDF || null);
            script.onerror = () => resolve(null);
            document.head.appendChild(script);
        });
    }
    return promesaJsPDF;
}

const dinero = valor => `$${Number(valor || 0).toFixed(2)}`;

/** Construye y descarga el PDF. Devuelve true si se generó. */
export async function descargarComprobante(pedido) {
    const JsPDF = await cargarJsPDF();
    if (!JsPDF) {
        await alertaError('No se pudo generar el PDF', 'Revisa tu conexión a internet e inténtalo de nuevo.');
        return false;
    }

    const doc = new JsPDF({ unit: 'mm', format: 'a5' });
    const ancho = doc.internal.pageSize.getWidth();
    const margen = 12;
    let y = 16;

    const linea = () => { doc.setDrawColor(200); doc.line(margen, y, ancho - margen, y); y += 5; };
    const nuevaPaginaSiHaceFalta = alto => {
        if (y + alto > doc.internal.pageSize.getHeight() - 14) { doc.addPage(); y = 16; }
    };

    // Encabezado
    doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(206, 75, 49);
    doc.text('SaborExpress', margen, y);
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(60);
    doc.text('Comprobante de pedido', ancho - margen, y, { align: 'right' });
    y += 8;
    linea();

    // Datos del pedido
    const fecha = new Date(pedido.creadoEn);
    const datos = [
        ['Pedido', `#${pedido.id}`],
        ['Fecha', `${fecha.toLocaleDateString('es-SV')} ${fecha.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}`],
        ['Cliente', pedido.cliente],
        ['Teléfono', pedido.telefono],
        ['Pago', pedido.pago]
    ];
    doc.setFontSize(10);
    datos.forEach(([etiqueta, valor]) => {
        doc.setFont('helvetica', 'bold').text(`${etiqueta}:`, margen, y);
        doc.setFont('helvetica', 'normal').text(String(valor ?? ''), margen + 22, y);
        y += 5.5;
    });

    // Dirección (puede ocupar varias líneas)
    const direccion = doc.splitTextToSize(`${pedido.direccion}${pedido.referencia ? ` (Ref.: ${pedido.referencia})` : ''}`, ancho - margen * 2 - 22);
    doc.setFont('helvetica', 'bold').text('Entrega:', margen, y);
    doc.setFont('helvetica', 'normal').text(direccion, margen + 22, y);
    y += direccion.length * 5 + 2;
    linea();

    // Tabla de productos
    doc.setFont('helvetica', 'bold').setFontSize(9);
    doc.text('Cant.', margen, y);
    doc.text('Producto', margen + 14, y);
    doc.text('P. unit.', ancho - margen - 22, y, { align: 'right' });
    doc.text('Subtotal', ancho - margen, y, { align: 'right' });
    y += 5;
    doc.setFont('helvetica', 'normal');
    pedido.items.forEach(item => {
        const nombre = doc.splitTextToSize(String(item.nombre), ancho - margen * 2 - 62);
        nuevaPaginaSiHaceFalta(nombre.length * 5 + 2);
        doc.text(String(item.cantidad), margen, y);
        doc.text(nombre, margen + 14, y);
        doc.text(dinero(item.precio), ancho - margen - 22, y, { align: 'right' });
        doc.text(dinero(item.precio * item.cantidad), ancho - margen, y, { align: 'right' });
        y += nombre.length * 5;
    });
    y += 1;
    linea();

    // Totales
    nuevaPaginaSiHaceFalta(24);
    const fila = (etiqueta, valor, negrita = false) => {
        doc.setFont('helvetica', negrita ? 'bold' : 'normal').setFontSize(negrita ? 12 : 10);
        doc.text(etiqueta, ancho - margen - 40, y);
        doc.text(valor, ancho - margen, y, { align: 'right' });
        y += negrita ? 7 : 5.5;
    };
    fila('Subtotal', dinero(pedido.subtotal));
    fila('Envío fijo', dinero(pedido.envio));
    fila('TOTAL', dinero(pedido.total), true);

    // Pie
    y += 4;
    doc.setFont('helvetica', 'italic').setFontSize(8).setTextColor(120);
    doc.text('Gracias por tu compra. Comprobante generado por la demostración de SaborExpress; no tiene validez fiscal.', margen, y, { maxWidth: ancho - margen * 2 });

    doc.save(`comprobante-${pedido.id}.pdf`);
    return true;
}
