import { memo } from 'react';
import { money, rutaImg } from '../../services/compra.js';

/** Tarjeta de un producto del menú, con selector de cantidad y botón Agregar. */
function ProductCard({ producto, cantidad, onCambiarCantidad, onAgregar }) {
  return (
    <article className="menu-product-card h-100">
      <div className="menu-product-image-wrap">
        <img src={rutaImg(producto.imagen)} className="menu-product-image" alt={producto.nombre} loading="lazy" />
        <span className="menu-price-badge">{money(producto.precio)}</span>
      </div>
      <div className="menu-product-body">
        <h2 className="menu-product-title">{producto.nombre}</h2>
        <p className="menu-product-description">{producto.descripcion}</p>
        <div className="d-flex align-items-center justify-content-between gap-3 mt-auto">
          <div className="quantity-control" role="group" aria-label={`Cantidad de ${producto.nombre}`}>
            <button type="button" aria-label="Disminuir cantidad" onClick={() => onCambiarCantidad(producto.id, -1)}>
              <i className="bi bi-dash" />
            </button>
            <span data-testid={`cantidad-${producto.id}`}>{cantidad}</span>
            <button type="button" aria-label="Aumentar cantidad" onClick={() => onCambiarCantidad(producto.id, 1)}>
              <i className="bi bi-plus" />
            </button>
          </div>
          <button type="button" className="btn btn-brand px-4" onClick={() => onAgregar(producto)}>Agregar</button>
        </div>
      </div>
    </article>
  );
}

export default memo(ProductCard);
