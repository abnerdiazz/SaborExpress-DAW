/**
 * compra.js
 * ---------------------------------------------------------------------------
 * Constantes y funciones pequeñas que comparten el Menú, el Carrito y el
 * Checkout. Tenerlas en un solo lugar evita que cada pantalla repita (y cambie
 * por su cuenta) la tarifa de envío o el límite por producto.
 * ---------------------------------------------------------------------------
 */

/** Tarifa fija de envío dentro de la zona de cobertura (Etapa 1, punto 6). */
export const ENVIO = 1.0;

/** Máximo de unidades de un mismo producto dentro del carrito. */
export const MAX_POR_PRODUCTO = 20;

export const money = valor => `$${Number(valor || 0).toFixed(2)}`;

/** Escapa texto antes de insertarlo como HTML (solo se usa en los cuadros de SweetAlert2). */
export const esc = valor =>
  String(valor ?? '').replace(/[&<>'"]/g, caracter => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[caracter]));

export const subtotalDe = carrito =>
  carrito.reduce((suma, item) => suma + Number(item.precio || 0) * Number(item.cantidad || 0), 0);

export const totalUnidades = carrito =>
  carrito.reduce((suma, item) => suma + Number(item.cantidad || 0), 0);

/** Las imágenes viven en /public/img: se les antepone "/" para que funcionen en cualquier ruta. */
export const rutaImg = ruta => {
  const texto = String(ruta ?? '');
  if (!texto || /^(https?:|data:|\/)/.test(texto)) return texto;
  return `/${texto}`;
};

export const PRIMER_NOMBRE = nombre => String(nombre ?? '').trim().split(/\s+/)[0] || '';
