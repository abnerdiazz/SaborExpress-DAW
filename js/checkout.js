import { iniciarNavbar, leerCarrito, vaciarCarrito, leerSesion, leerUsuarios, crearPedido } from './saborexpress-data.js';
import { ENVIO, money, esc, subtotalDe, esCliente } from './compra-utils.js';
import { aviso, confirmar, error as alertaError, mostrar } from './alertas.js';
import { reglas, validarCampo, vincularValidacion, enfocarPrimerError, formatearTelefono } from './validaciones.js';
import { NEGOCIO, RADIO_COBERTURA_KM, evaluarCobertura } from './cobertura.js';
import { descargarComprobante } from './comprobante.js';
import { describirCambios, sincronizarCarritoConMenu } from './carrito-sync.js';

const reglaDireccion = reglas.texto('tu dirección de entrega', 8, 120);
const reglaReferencia = reglas.textoOpcional(120);

// ---------------------------------------------------------------------------
// Mapa (Leaflet + OpenStreetMap) y zona de cobertura
// ---------------------------------------------------------------------------
function initMapa(alCambiarUbicacion) {
    if (!document.getElementById('map') || typeof L === 'undefined') return null;

    const mapa = L.map('map').setView([NEGOCIO.lat, NEGOCIO.lng], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(mapa);

    // Círculo con el área donde SaborExpress entrega, y el local en el centro.
    const zona = L.circle([NEGOCIO.lat, NEGOCIO.lng], {
        radius: RADIO_COBERTURA_KM * 1000,
        color: '#CE4B31',
        weight: 2,
        fillColor: '#CE4B31',
        fillOpacity: 0.08
    }).addTo(mapa);
    L.circleMarker([NEGOCIO.lat, NEGOCIO.lng], { radius: 7, color: '#272421', fillColor: '#272421', fillOpacity: 1 })
        .bindTooltip(`${NEGOCIO.nombre} (local)`)
        .addTo(mapa);
    mapa.fitBounds(zona.getBounds(), { padding: [8, 8] });

    const marcador = L.marker([NEGOCIO.lat, NEGOCIO.lng], { draggable: true }).addTo(mapa);
    const colocar = latlng => {
        marcador.setLatLng(latlng);
        alCambiarUbicacion(marcador.getLatLng());
    };
    marcador.on('dragend', () => alCambiarUbicacion(marcador.getLatLng()));
    mapa.on('click', evento => colocar(evento.latlng));
    setTimeout(() => mapa.invalidateSize(), 200);

    return { mapa, marcador, colocar };
}

function pintarCobertura(elemento, ubicacion) {
    if (!ubicacion) {
        elemento.className = 'zone-status zone-pending';
        elemento.innerHTML = '<i class="bi bi-geo-alt me-1"></i>Mueve el pin hasta tu dirección o toca el mapa para comprobar si llegamos.';
        return;
    }
    const { distanciaKm, dentro } = evaluarCobertura(ubicacion.lat, ubicacion.lng);
    if (dentro) {
        elemento.className = 'zone-status zone-ok';
        elemento.innerHTML = `<i class="bi bi-check-circle-fill me-1"></i>¡Llegamos a tu ubicación! Estás a ${distanciaKm.toFixed(1)} km del local.`;
    } else {
        elemento.className = 'zone-status zone-out';
        elemento.innerHTML = `<i class="bi bi-x-circle-fill me-1"></i>Fuera de la zona de cobertura: estás a ${distanciaKm.toFixed(1)} km y entregamos hasta ${RADIO_COBERTURA_KM} km.`;
    }
}

// ---------------------------------------------------------------------------
// Confirmación del pedido
// ---------------------------------------------------------------------------
function resumenHtml({ carrito, total, direccion, pago }) {
    const filas = carrito.map(item => `<li>${Number(item.cantidad)}× ${esc(item.nombre)} <span class="float-end">${money(item.precio * item.cantidad)}</span></li>`).join('');
    return `
        <ul class="list-unstyled text-start mb-3">${filas}
            <li class="border-top mt-2 pt-2">Envío fijo <span class="float-end">${money(ENVIO)}</span></li>
            <li class="fw-bold">Total <span class="float-end">${money(total)}</span></li>
        </ul>
        <p class="text-start small text-secondary mb-0"><strong>Entrega:</strong> ${esc(direccion)}<br><strong>Pago:</strong> ${esc(pago)}</p>`;
}

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

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------
async function initCheckout() {
    const resumen = document.getElementById('checkout-summary-items');
    if (!resumen) return;

    const sesion = leerSesion();
    if (!esCliente(sesion)) {
        window.location.replace('login.html?redirect=checkout.html');
        return;
    }

    // Si el administrador cambió el menú, se ajusta el carrito antes de cobrar.
    const textoCambios = describirCambios(await sincronizarCarritoConMenu());

    const carrito = leerCarrito();
    const subtotal = subtotalDe(carrito);
    const boton = document.getElementById('btn-confirm-order');
    const campo = id => document.getElementById(id);

    const nombre = campo('input-nombre');
    const telefono = campo('input-telefono');
    const direccion = campo('input-direccion');
    const referencia = campo('input-referencia');
    const estadoZona = campo('zone-status');

    // Datos precargados desde la cuenta del cliente
    const usuario = leerUsuarios().find(u => u.email === sesion.email);
    nombre.value = sesion.name || '';
    telefono.value = formatearTelefono(usuario?.phone || '');

    resumen.innerHTML = carrito.length ? carrito.map(item => `
        <div class="checkout-summary-item">
            <span class="item-title">${Number(item.cantidad)}x ${esc(item.nombre)}</span>
            <span class="item-price">${money(item.precio * item.cantidad)}</span>
        </div>`).join('') : '<p class="text-muted small">No hay productos en el pedido. <a href="menu.html">Ir al menú</a></p>';
    campo('checkout-subtotal').textContent = money(subtotal);
    campo('checkout-shipping').textContent = money(carrito.length ? ENVIO : 0);
    campo('checkout-total').textContent = money(carrito.length ? subtotal + ENVIO : 0);
    if (!carrito.length) boton.disabled = true;

    // Ubicación: no se acepta hasta que la persona la marque en el mapa.
    let ubicacion = null;
    const alCambiarUbicacion = latlng => {
        ubicacion = { lat: latlng.lat, lng: latlng.lng };
        pintarCobertura(estadoZona, ubicacion);
    };
    const mapaInfo = initMapa(alCambiarUbicacion);
    pintarCobertura(estadoZona, null);
    if (!mapaInfo) {
        estadoZona.className = 'zone-status zone-out';
        estadoZona.textContent = 'No se pudo cargar el mapa. Revisa tu conexión a internet y recarga la página.';
    }

    campo('btn-ubicacion')?.addEventListener('click', () => {
        if (!navigator.geolocation || !mapaInfo) {
            aviso('Ubicación no disponible', 'Tu navegador no permite obtener la ubicación. Marca el pin manualmente en el mapa.');
            return;
        }
        navigator.geolocation.getCurrentPosition(posicion => {
            const punto = L.latLng(posicion.coords.latitude, posicion.coords.longitude);
            mapaInfo.colocar(punto);
            // Se encuadran el local y la persona para que se vea la distancia.
            mapaInfo.mapa.fitBounds(L.latLngBounds([[NEGOCIO.lat, NEGOCIO.lng], punto]).pad(0.3));
        }, () => {
            aviso('No pudimos obtener tu ubicación', 'Permite el acceso a la ubicación en tu navegador o marca el pin manualmente.');
        }, { enableHighAccuracy: true, timeout: 10000 });
    });

    // Validación por campo, en vivo.
    vincularValidacion(nombre, reglas.nombre);
    vincularValidacion(telefono, reglas.telefono);
    vincularValidacion(direccion, reglaDireccion);
    vincularValidacion(referencia, reglaReferencia);
    telefono.addEventListener('input', () => { telefono.value = formatearTelefono(telefono.value); });

    document.querySelectorAll('input[name="metodo_pago"]').forEach(radio => radio.addEventListener('change', marcarPago));
    function marcarPago() {
        document.querySelectorAll('.payment-option').forEach(opcion => {
            opcion.classList.toggle('active', opcion.querySelector('input').checked);
        });
    }
    marcarPago();

    boton.addEventListener('click', async () => {
        // El carrito se vuelve a leer: pudo cambiar desde otra pestaña.
        const carritoActual = leerCarrito();
        if (!carritoActual.length) {
            await aviso('Tu carrito está vacío', 'Agrega productos desde el menú para hacer un pedido.');
            window.location.href = 'menu.html';
            return;
        }

        const validos = [
            validarCampo(nombre, reglas.nombre),
            validarCampo(telefono, reglas.telefono),
            validarCampo(direccion, reglaDireccion),
            validarCampo(referencia, reglaReferencia)
        ];
        if (validos.includes(false)) {
            enfocarPrimerError(document.querySelector('main'));
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

        const pago = document.querySelector('input[name="metodo_pago"]:checked').value === 'efectivo'
            ? 'Efectivo (contra entrega)' : 'Transferencia bancaria';
        const subtotalActual = subtotalDe(carritoActual);
        const total = Number((subtotalActual + ENVIO).toFixed(2));

        const acepto = await confirmar({
            titulo: '¿Confirmar tu pedido?',
            html: resumenHtml({ carrito: carritoActual, total, direccion: direccion.value.trim(), pago }),
            confirmText: `Confirmar · ${money(total)}`,
            cancelText: 'Revisar'
        });
        if (!acepto) return;

        boton.disabled = true; // evita pedidos duplicados por doble clic
        const pedido = crearPedido({
            cliente: nombre.value.trim(),
            email: sesion.email,
            telefono: telefono.value.trim(),
            direccion: direccion.value.trim(),
            referencia: referencia.value.trim(),
            pago,
            subtotal: Number(subtotalActual.toFixed(2)),
            envio: ENVIO,
            total,
            ubicacion: { lat: ubicacion.lat, lng: ubicacion.lng },
            items: carritoActual.map(item => ({
                productoId: item.productoId, nombre: item.nombre, categoria: item.categoria,
                precio: item.precio, cantidad: item.cantidad
            }))
        });
        vaciarCarrito();

        await mostrarPedidoConfirmado(pedido);
        window.location.href = 'mis-pedidos.html';
    });

    if (textoCambios) await aviso('Actualizamos tu pedido', textoCambios);
}

document.addEventListener('DOMContentLoaded', () => {
    iniciarNavbar();
    initCheckout();
});
