import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MapPicker from '../components/checkout/MapPicker.jsx';
import ZoneStatus from '../components/checkout/ZoneStatus.jsx';
import FormField from '../components/ui/FormField.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';
import { useOrders } from '../context/OrdersContext.jsx';
import { enfocarPrimerError, useCampo, validarTodos } from '../hooks/useCampo.js';
import { useBuscadorDirecciones, useDireccionDeUbicacion } from '../hooks/useGeocodificacion.js';
import { aviso, confirmar, error as alertaError, mostrar } from '../services/alertas.js';
import { describirCambios } from '../services/catalogo.js';
import { descargarComprobante } from '../services/comprobante.js';
import { RADIO_COBERTURA_KM, evaluarCobertura } from '../services/cobertura.js';
import { ENVIO, esc, money, subtotalDe } from '../services/compra.js';
import { formatearTelefono, reglas } from '../services/validaciones.js';

const reglaDireccion = reglas.texto('tu dirección de entrega', 8, 120);
const reglaReferencia = reglas.textoOpcional(120);
const ESTILO = { labelClass: 'form-label checkout-label', inputClass: 'form-control checkout-input' };

function resumenHtml({ carrito, total, direccion, pago }) {
  const filas = carrito.map(item =>
    `<li>${Number(item.cantidad)}× ${esc(item.nombre)} <span class="float-end">${money(item.precio * item.cantidad)}</span></li>`).join('');
  return `
    <ul class="list-unstyled text-start mb-3">${filas}
      <li class="border-top mt-2 pt-2">Envío fijo <span class="float-end">${money(ENVIO)}</span></li>
      <li class="fw-bold">Total <span class="float-end">${money(total)}</span></li>
    </ul>
    <p class="text-start small text-secondary mb-0"><strong>Entrega:</strong> ${esc(direccion)}<br><strong>Pago:</strong> ${esc(pago)}</p>`;
}

/** Cuadro final: pedido confirmado, enlace de WhatsApp y descarga del comprobante PDF. */
async function mostrarPedidoConfirmado(pedido) {
  const detalle = pedido.items.map(item => `${item.cantidad}x ${item.nombre}`).join(', ');
  const mensaje = `Hola SaborExpress, soy ${pedido.cliente}. Pedido #${pedido.id}: ${detalle}. Dirección: ${pedido.direccion}. Pago: ${pedido.pago}. Total: ${money(pedido.total)}.`;
  const urlWhatsApp = `https://wa.me/50322000000?text=${encodeURIComponent(mensaje)}`;
  await mostrar({
    icon: 'success',
    title: '¡Pedido confirmado!',
    html: `
      <p class="mb-3">Tu pedido <strong>#${esc(pedido.id)}</strong> fue registrado por <strong>${money(pedido.total)}</strong>.</p>
      <a href="${urlWhatsApp}" target="_blank" rel="noopener" class="btn btn-success btn-sm"><i class="bi bi-whatsapp me-1"></i>Enviar detalle por WhatsApp</a>`,
    showDenyButton: true,
    denyButtonText: 'Descargar comprobante PDF',
    denyButtonColor: '#4F7058',
    confirmButtonText: 'Ver mis pedidos',
    allowOutsideClick: false,
    allowEscapeKey: false,
    // Devolver false mantiene abierto el cuadro: se puede descargar el PDF y luego seguir.
    preDeny: async () => {
      await descargarComprobante(pedido);
      return false;
    }
  });
}

/** Checkout: datos de entrega, mapa con zona de cobertura, dirección asistida por la API Nominatim y confirmación. */
export default function CheckoutPage() {
  const { sesion, usuarios } = useAuth();
  const { carrito, subtotal, vaciar, sincronizar } = useCart();
  const { productos } = useCatalog();
  const { crearPedido } = useOrders();
  const navegar = useNavigate();
  const contenedor = useRef(null);

  const usuario = usuarios.find(u => u.email === sesion?.email);
  const nombre = useCampo(reglas.nombre, sesion?.name || '');
  const telefono = useCampo(reglas.telefono, formatearTelefono(usuario?.phone || ''), { formatear: formatearTelefono });
  const direccion = useCampo(reglaDireccion);
  const referencia = useCampo(reglaReferencia);
  const [pago, setPago] = useState('efectivo');
  const [ubicacion, setUbicacion] = useState(null);
  const [enfocar, setEnfocar] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const detectada = useDireccionDeUbicacion(ubicacion);
  const buscador = useBuscadorDirecciones();
  const autocompletada = useRef('');

  // Si el administrador cambió el menú, se ajusta el carrito antes de cobrar.
  useEffect(() => {
    const texto = describirCambios(sincronizar(productos));
    if (texto) aviso('Actualizamos tu pedido', texto);
    // Solo al abrir la página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cuando la API devuelve la dirección del pin, se rellena el campo si estaba vacío o si tenía la sugerencia anterior.
  const textoDetectado = detectada.direccion?.texto;
  useEffect(() => {
    if (!textoDetectado) return;
    if (direccion.valor.trim() === '' || direccion.valor === autocompletada.current) {
      autocompletada.current = textoDetectado;
      direccion.setValor(textoDetectado);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textoDetectado]);

  function usarMiUbicacion() {
    if (!navigator.geolocation) {
      aviso('Ubicación no disponible', 'Tu navegador no permite obtener la ubicación. Marca el pin manualmente en el mapa.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      posicion => {
        const punto = { lat: posicion.coords.latitude, lng: posicion.coords.longitude };
        setUbicacion(punto);
        setEnfocar({ ...punto, id: Date.now() });
      },
      () => aviso('No pudimos obtener tu ubicación', 'Permite el acceso a la ubicación en tu navegador o marca el pin manualmente.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function usarDireccionDetectada() {
    autocompletada.current = detectada.direccion.texto;
    direccion.setValor(detectada.direccion.texto);
    direccion.validar();
  }

  function elegirLugar(lugar) {
    autocompletada.current = lugar.texto;
    direccion.setValor(lugar.texto);
    direccion.validar();
    setUbicacion({ lat: lugar.lat, lng: lugar.lng });
    setEnfocar({ lat: lugar.lat, lng: lugar.lng, id: Date.now() });
    buscador.limpiar();
  }

  function buscarDireccion() {
    buscador.buscar(direccion.valor);
  }

  async function confirmarPedido() {
    if (!carrito.length) {
      await aviso('Tu carrito está vacío', 'Agrega productos desde el menú para hacer un pedido.');
      navegar('/menu');
      return;
    }
    if (!validarTodos([nombre, telefono, direccion, referencia])) {
      enfocarPrimerError(contenedor.current);
      return;
    }

    // Regla de negocio: solo se entrega dentro de la zona de cobertura.
    if (!ubicacion) {
      await aviso('Marca tu ubicación', 'Mueve el pin del mapa hasta tu dirección para comprobar que llegamos.');
      return;
    }
    const cobertura = evaluarCobertura(ubicacion.lat, ubicacion.lng);
    if (!cobertura.dentro) {
      await alertaError('Fuera de la zona de cobertura',
        `Tu ubicación está a ${cobertura.distanciaKm.toFixed(1)} km del local y solo entregamos hasta ${RADIO_COBERTURA_KM} km.`);
      return;
    }

    const textoPago = pago === 'efectivo' ? 'Efectivo (contra entrega)' : 'Transferencia bancaria';
    const subtotalActual = subtotalDe(carrito);
    const total = Number((subtotalActual + ENVIO).toFixed(2));

    const acepto = await confirmar({
      titulo: '¿Confirmar tu pedido?',
      html: resumenHtml({ carrito, total, direccion: direccion.valor.trim(), pago: textoPago }),
      confirmText: `Confirmar · ${money(total)}`,
      cancelText: 'Revisar'
    });
    if (!acepto) return;

    setEnviando(true); // evita pedidos duplicados por doble clic
    const pedido = crearPedido({
      cliente: nombre.valor.trim(),
      email: sesion.email,
      telefono: telefono.valor.trim(),
      direccion: direccion.valor.trim(),
      referencia: referencia.valor.trim(),
      pago: textoPago,
      subtotal: Number(subtotalActual.toFixed(2)),
      envio: ENVIO,
      total,
      ubicacion: { lat: ubicacion.lat, lng: ubicacion.lng },
      items: carrito.map(item => ({
        productoId: item.productoId, nombre: item.nombre, categoria: item.categoria, precio: item.precio, cantidad: item.cantidad
      }))
    });
    vaciar();
    await mostrarPedidoConfirmado(pedido);
    navegar('/mis-pedidos');
  }

  return (
    <div className="container" ref={contenedor}>
      <h1 className="cart-page-title mb-4">Checkout</h1>
      <div className="row g-4 align-items-start">
        <div className="col-lg-8">
          <div className="cart-surface-card p-4 mb-4">
            <h2 className="checkout-section-title">1. Datos de entrega</h2>
            <FormField id="input-nombre" label="NOMBRE DE CONTACTO" campo={nombre} {...ESTILO}
              placeholder="Nombre y apellido" autoComplete="name" maxLength={60} />
            <FormField id="input-telefono" label="TELÉFONO DE CONTACTO" type="tel" campo={telefono} {...ESTILO}
              placeholder="7777-7777" inputMode="numeric" autoComplete="tel" maxLength={9} />
            <FormField id="input-direccion" label="DIRECCIÓN DE ENTREGA" campo={direccion} {...ESTILO} className="mb-2"
              placeholder="Calle, número, colonia y municipio" autoComplete="street-address" maxLength={120}
              onKeyDown={evento => { if (evento.key === 'Enter') { evento.preventDefault(); buscarDireccion(); } }} />

            {/* Búsqueda de la dirección con la API Nominatim (bajo demanda, sin autocompletar) */}
            <div className="mb-3">
              <button type="button" className="btn btn-sm btn-locate" onClick={buscarDireccion} disabled={buscador.cargando}>
                <i className="bi bi-search me-1" />Buscar esta dirección en el mapa
              </button>
              {buscador.cargando && <p className="address-status" role="status"><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Buscando direcciones...</p>}
              {buscador.error && <p className="address-status text-danger" role="alert">{buscador.error}</p>}
              {buscador.buscado && !buscador.cargando && !buscador.error && buscador.resultados.length === 0 && (
                <p className="address-status" role="status">No encontramos esa dirección. Prueba con otra o marca el pin en el mapa.</p>
              )}
              {buscador.resultados.length > 0 && (
                <ul className="address-suggestions" aria-label="Direcciones encontradas">
                  {buscador.resultados.map(lugar => (
                    <li key={lugar.id}>
                      <button type="button" onClick={() => elegirLugar(lugar)}>
                        <i className="bi bi-geo-alt me-2 text-brand" />{lugar.texto || lugar.completo}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mb-3">
              <label className="form-label checkout-label">SELECCIONA TU UBICACIÓN EN EL MAPA</label>
              <div className="map-container">
                <MapPicker ubicacion={ubicacion} onCambiar={setUbicacion} enfocar={enfocar} />
              </div>
              <p className="map-helper-text">Mueve el pin o toca el mapa para marcar tu ubicación. El círculo rojo es nuestra zona de entrega.</p>
              <ZoneStatus ubicacion={ubicacion} />
              <button type="button" className="btn btn-sm btn-locate mt-2" onClick={usarMiUbicacion}>
                <i className="bi bi-crosshair me-1" />Usar mi ubicación actual
              </button>

              {/* Dirección que la API reconoce en el pin */}
              {ubicacion && detectada.cargando && (
                <p className="address-status" role="status"><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Buscando la dirección de este punto...</p>
              )}
              {ubicacion && !detectada.cargando && detectada.direccion && (
                <p className="address-detected" role="status">
                  <i className="bi bi-pin-map me-1" />Dirección del punto: <strong>{detectada.direccion.texto}</strong>
                  {direccion.valor !== detectada.direccion.texto && (
                    <button type="button" className="btn btn-link btn-sm p-0 ms-2 align-baseline" onClick={usarDireccionDetectada}>Usar esta dirección</button>
                  )}
                </p>
              )}
              {ubicacion && !detectada.cargando && detectada.error && (
                <p className="address-status text-danger" role="alert">{detectada.error}</p>
              )}
            </div>

            <FormField id="input-referencia" label="PUNTO DE REFERENCIA" campo={referencia} {...ESTILO} className="mb-0"
              placeholder="Frente a la plaza central, junto a las bancas" maxLength={120} />
          </div>

          <div className="cart-surface-card p-4">
            <h2 className="checkout-section-title">2. Método de pago</h2>
            <div className="d-flex gap-3 mt-3">
              {[['efectivo', 'Efectivo (Contra entrega)'], ['transferencia', 'Transferencia bancaria']].map(([valor, texto]) => (
                <label key={valor} className={`payment-option border rounded p-3 d-flex align-items-center gap-2 flex-fill cursor-pointer${pago === valor ? ' active' : ''}`}>
                  <input type="radio" name="metodo_pago" value={valor} checked={pago === valor} onChange={() => setPago(valor)} />
                  <span className="fw-bold">{texto}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="cart-surface-card p-4">
            <h3 className="summary-title mb-4">Resumen de tu orden</h3>
            {carrito.length ? carrito.map(item => (
              <div className="checkout-summary-item" key={item.productoId}>
                <span className="item-title">{item.cantidad}x {item.nombre}</span>
                <span className="item-price">{money(item.precio * item.cantidad)}</span>
              </div>
            )) : <p className="text-muted small">No hay productos en el pedido. <Link to="/menu">Ir al menú</Link></p>}
            <hr className="my-3" style={{ borderColor: '#eae5df', opacity: 1 }} />
            <div className="d-flex justify-content-between mb-2">
              <span className="summary-label">Subtotal</span>
              <span className="summary-value" data-testid="checkout-subtotal">{money(subtotal)}</span>
            </div>
            <div className="d-flex justify-content-between mb-3">
              <span className="summary-label">Envío fijo</span>
              <span className="summary-value">{money(carrito.length ? ENVIO : 0)}</span>
            </div>
            <hr className="my-3" style={{ borderColor: '#eae5df', opacity: 1 }} />
            <div className="d-flex justify-content-between mb-4 align-items-center">
              <span className="summary-total-label">Total</span>
              <span className="summary-total-value" data-testid="checkout-total">{money(carrito.length ? subtotal + ENVIO : 0)}</span>
            </div>
            <button type="button" className="btn-confirm-order" onClick={confirmarPedido} disabled={!carrito.length || enviando}>
              Confirmar pedido
            </button>
            <p className="confirm-disclaimer">
              Al confirmar podrás descargar tu comprobante en PDF y enviar el detalle de tu pedido por WhatsApp.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
