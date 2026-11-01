import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';
import { aviso, confirmar, toast } from '../services/alertas.js';
import { describirCambios } from '../services/catalogo.js';
import { ENVIO, MAX_POR_PRODUCTO, money } from '../services/compra.js';

/** Carrito: ajusta cantidades (con tope por producto), quita productos y pasa al checkout. */
export default function CarritoPage() {
  const { carrito, subtotal, incrementar, decrementar, quitar, vaciar, sincronizar } = useCart();
  const { productos } = useCatalog();
  const { sesion } = useAuth();

  // Si el administrador cambió el menú, el carrito se ajusta y se avisa (una sola vez al entrar).
  useEffect(() => {
    const texto = describirCambios(sincronizar(productos));
    if (texto) aviso('Actualizamos tu carrito', texto);
    // Solo al abrir la página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function sumar(item) {
    if (!incrementar(item.productoId)) {
      toast(`Máximo ${MAX_POR_PRODUCTO} unidades de "${item.nombre}" por pedido.`, 'warning', 3500);
    }
  }

  async function restar(item) {
    if (item.cantidad > 1) {
      decrementar(item.productoId);
      return;
    }
    // Bajar de 1 a 0 quita el producto: se pide confirmación.
    const acepto = await confirmar({
      titulo: '¿Quitar este producto?',
      texto: `"${item.nombre}" se eliminará de tu carrito.`,
      icon: 'warning',
      confirmText: 'Sí, quitar',
      cancelText: 'Mantener'
    });
    if (!acepto) return;
    quitar(item.productoId);
    toast(`"${item.nombre}" quitado del carrito.`, 'info');
  }

  async function vaciarCarrito() {
    const acepto = await confirmar({
      titulo: '¿Vaciar el carrito?',
      texto: 'Se quitarán todos los productos de tu carrito.',
      icon: 'warning',
      confirmText: 'Sí, vaciar',
      cancelText: 'Cancelar'
    });
    if (!acepto) return;
    vaciar();
    toast('Carrito vaciado.', 'info');
  }

  const hayProductos = carrito.length > 0;
  const destinoCheckout = sesion ? '/checkout' : '/login?redirect=%2Fcheckout';

  return (
    <div className="container">
      <h1 className="cart-page-title mb-4">Tu Carrito</h1>
      <div className="row g-4 align-items-start">
        <div className="col-lg-8">
          <div className="cart-surface-card p-0 overflow-hidden">
            <div className="table-responsive">
              <table className="table align-middle mb-0 cart-table">
                <thead>
                  <tr>
                    <th className="ps-4">PRODUCTO</th>
                    <th className="text-center">CANTIDAD</th>
                    <th>PRECIO UNITARIO</th>
                    <th className="pe-4">SUBTOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {hayProductos ? carrito.map(item => (
                    <tr className="cart-item" key={item.productoId}>
                      <td className="ps-4 cart-product-title">{item.nombre}</td>
                      <td className="text-center">
                        <div className="qty-pill-container">
                          <button type="button" className="qty-btn btn-minus" aria-label={`Disminuir cantidad de ${item.nombre}`} onClick={() => restar(item)}>-</button>
                          <span className="qty-val">{item.cantidad}</span>
                          <button type="button" className="qty-btn btn-plus" aria-label={`Aumentar cantidad de ${item.nombre}`} onClick={() => sumar(item)}>+</button>
                        </div>
                      </td>
                      <td className="cart-price-text">{money(item.precio)}</td>
                      <td className="pe-4 cart-subtotal-text">{money(item.precio * item.cantidad)}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" className="text-center py-5 text-muted">
                        Tu carrito está vacío.<br />
                        <Link to="/menu" className="fw-bold text-decoration-none" style={{ color: 'var(--se-primary)' }}>Ir a ver el menú</Link>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {hayProductos && (
            <button type="button" className="btn btn-link text-danger p-0 mt-3" onClick={vaciarCarrito}>
              <i className="bi bi-trash3 me-1" />Vaciar carrito
            </button>
          )}
        </div>

        <div className="col-lg-4">
          <div className="cart-surface-card p-4">
            <h3 className="summary-title mb-4">Resumen de la orden</h3>
            <div className="d-flex justify-content-between mb-3">
              <span className="summary-label">Subtotal</span>
              <span className="summary-value" data-testid="carrito-subtotal">{money(subtotal)}</span>
            </div>
            <div className="d-flex justify-content-between mb-3">
              <span className="summary-label">Envío fijo</span>
              <span className="summary-value">{money(hayProductos ? ENVIO : 0)}</span>
            </div>
            <hr className="my-3" style={{ borderColor: 'var(--se-border, #eae5df)', opacity: 1 }} />
            <div className="d-flex justify-content-between mb-4 align-items-center">
              <span className="summary-total-label">Total</span>
              <span className="summary-total-value" data-testid="carrito-total">{money(hayProductos ? subtotal + ENVIO : 0)}</span>
            </div>
            <Link
              to={destinoCheckout}
              className="btn-checkout-outline text-center text-decoration-none d-block"
              aria-disabled={!hayProductos}
              tabIndex={hayProductos ? undefined : -1}
              style={hayProductos ? undefined : { pointerEvents: 'none', opacity: 0.5 }}
            >
              Continuar al checkout
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
