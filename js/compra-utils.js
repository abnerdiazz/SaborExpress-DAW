/** Tarifa fija de envío dentro de la zona de cobertura (ver Etapa 1, punto 6). */
export const ENVIO = 1.00;

/** Máximo de unidades de un mismo producto dentro del carrito. */
export const MAX_POR_PRODUCTO = 20;

export const money = value => `$${Number(value || 0).toFixed(2)}`;

/** Escapa texto antes de insertarlo como HTML (evita inyección de código). */
export const esc = value => String(value ?? '').replace(/[&<>'"]/g, caracter => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[caracter]));

export const subtotalDe = carrito => carrito.reduce(
    (suma, item) => suma + Number(item.precio || 0) * Number(item.cantidad || 0), 0
);

export const esCliente = sesion => Boolean(sesion && sesion.role === 'cliente');
