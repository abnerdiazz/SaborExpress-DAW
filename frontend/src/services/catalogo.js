/**
 * catalogo.js
 * ---------------------------------------------------------------------------
 * Productos del menú: catálogo base, normalización de lo guardado y
 * ayudas para el carrito.
 * ---------------------------------------------------------------------------
 */

export const CLAVE_PRODUCTOS = 'saborExpressProductos';
export const CLAVE_CARRITO = 'saborExpressCart';

export const CATEGORIAS = ['Pupusas', 'Típicos', 'Bebidas', 'Postres'];

export const PRODUCTOS_INICIALES = [
  { id: 'pup-revuelta', nombre: 'Pupusa Revuelta', categoria: 'Pupusas', precio: 0.85, imagen: 'img/menú/pupusa-revuelta.png', descripcion: 'Clásica de delicioso chicharrón molido, frijoles refritos y abundante queso derretido.', activo: true },
  { id: 'pup-loroco', nombre: 'Pupusa de Queso con Loroco', categoria: 'Pupusas', precio: 0.9, imagen: 'img/menú/pupusa-loroco.png', descripcion: 'Suave queso tradicional mezclado con loroco fresco finamente picado de alta calidad.', activo: true },
  { id: 'pup-frijol-queso', nombre: 'Pupusa de Frijol con Queso', categoria: 'Pupusas', precio: 0.85, imagen: 'img/menú/pupusa-frijol-queso.png', descripcion: 'Frijoles rojos molidos cocinados lentamente combinados con nuestro queso artesanal.', activo: true },
  { id: 'pup-loca', nombre: 'Pupusa Loca', categoria: 'Pupusas', precio: 1.5, imagen: 'img/menú/pupusa-loca.png', descripcion: '¡La más grande! Una mezcla generosa de los ingredientes de la casa.', activo: true },
  { id: 'pup-queso', nombre: 'Pupusa de Queso', categoria: 'Pupusas', precio: 0.8, imagen: 'img/menú/pupusa-queso.png', descripcion: 'Pupusa tradicional rellena de abundante queso derretido, suave y reconfortante.', activo: true },
  { id: 'tip-nuegados', nombre: 'Nuegados de Yuca con Miel', categoria: 'Típicos', precio: 1.75, imagen: 'img/menú/nuegados.png', descripcion: 'Nuegados de yuca suaves bañados con miel dulce tradicional.', activo: true },
  { id: 'tip-yuca', nombre: 'Yuca Frita con Chicharrón', categoria: 'Típicos', precio: 2.75, imagen: 'img/menú/yuca-frita.png', descripcion: 'Yuca dorada y crujiente acompañada de curtido y chicharrones.', activo: true },
  { id: 'beb-coca', nombre: 'Coca-Cola en Lata', categoria: 'Bebidas', precio: 1.0, imagen: 'img/menú/soda-coca-cola.png', descripcion: 'Coca-Cola bien helada para acompañar tu pedido.', activo: true },
  { id: 'beb-fanta', nombre: 'Fanta en Lata', categoria: 'Bebidas', precio: 1.0, imagen: 'img/menú/soda-fanta.png', descripcion: 'Fanta naranja fría y refrescante.', activo: true },
  { id: 'beb-sprite', nombre: 'Sprite en Lata', categoria: 'Bebidas', precio: 1.0, imagen: 'img/menú/soda-sprite.png', descripcion: 'Sprite fría con su clásico sabor limón-lima.', activo: true },
  { id: 'beb-fresa', nombre: 'Tropical Fresa', categoria: 'Bebidas', precio: 1.0, imagen: 'img/menú/soda-fresa.png', descripcion: 'Soda Tropical sabor fresa servida bien fría.', activo: true },
  { id: 'beb-chocolate', nombre: 'Chocolate Caliente', categoria: 'Bebidas', precio: 0.9, imagen: 'img/menú/chocolate.png', descripcion: 'Chocolate caliente cremoso y reconfortante, preparado al estilo de casa.', activo: true },
  { id: 'beb-cafe', nombre: 'Café de Olla', categoria: 'Bebidas', precio: 0.75, imagen: 'img/menú/cafe.png', descripcion: 'Café de altura tradicional caliente, con un sutil toque aromático de canela.', activo: true },
  { id: 'pos-quesadilla', nombre: 'Quesadilla Salvadoreña', categoria: 'Postres', precio: 1.25, imagen: 'img/menú/quesadilla.png', descripcion: 'Tradicional quesadilla salvadoreña, suave, esponjosa y con delicado sabor a queso.', activo: true },
  { id: 'pos-arroz', nombre: 'Arroz con Leche', categoria: 'Postres', precio: 1.5, imagen: 'img/menú/arroz-leche.png', descripcion: 'Postre cremoso de arroz con leche, canela y dulzor casero.', activo: true }
];

// Adapta las rutas del catálogo anterior sin borrar los datos guardados.
const rutasAnteriores = new Map(
  PRODUCTOS_INICIALES.map(p => ['img/' + p.imagen.split('/').pop(), p.imagen])
);
export const resolverImagenMenu = ruta => rutasAnteriores.get(ruta) ?? ruta;

export const normalizarProducto = crudo => ({
  id: crudo.id,
  nombre: crudo.nombre ?? crudo.name ?? 'Producto',
  categoria: crudo.categoria ?? crudo.category ?? 'Otros',
  precio: Number(crudo.precio ?? crudo.price ?? 0),
  imagen: resolverImagenMenu(crudo.imagen ?? crudo.image ?? 'img/menú/pupusa-revuelta.png'),
  descripcion: crudo.descripcion ?? crudo.description ?? '',
  activo: crudo.activo ?? crudo.active ?? true
});

export const normalizarItemCarrito = crudo => ({
  productoId: crudo.productoId ?? crudo.productId ?? crudo.id ?? '',
  nombre: crudo.nombre ?? crudo.name ?? 'Producto',
  categoria: crudo.categoria ?? crudo.category ?? 'Otros',
  precio: Number(crudo.precio ?? crudo.price ?? 0),
  imagen: resolverImagenMenu(crudo.imagen ?? crudo.image ?? ''),
  cantidad: Number(crudo.cantidad ?? crudo.quantity ?? 1)
});

/**
 * Ajusta un carrito al menú vigente: quita lo que ya no está disponible y
 * actualiza precios. Devuelve el carrito nuevo y qué cambió (para avisar).
 */
export function sincronizarCarrito(carrito, productosActivos) {
  const menu = new Map(productosActivos.map(p => [p.id, p]));
  const retirados = [];
  const actualizados = [];
  const vigente = [];
  carrito.forEach(item => {
    const producto = menu.get(item.productoId);
    if (!producto) {
      retirados.push(item.nombre);
      return;
    }
    if (Number(producto.precio) !== Number(item.precio)) actualizados.push(producto.nombre);
    vigente.push({ ...item, nombre: producto.nombre, precio: producto.precio });
  });
  return { carrito: vigente, retirados, actualizados, cambio: retirados.length > 0 || actualizados.length > 0 };
}

/** Texto para avisar los cambios, o '' si no hubo ninguno. */
export function describirCambios({ retirados, actualizados }) {
  const partes = [];
  if (retirados.length) partes.push(`Ya no están disponibles y se quitaron de tu carrito: ${retirados.join(', ')}.`);
  if (actualizados.length) partes.push(`Cambió el precio de: ${actualizados.join(', ')}.`);
  return partes.join(' ');
}
