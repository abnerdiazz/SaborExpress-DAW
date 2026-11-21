# Módulo 5: carrito, checkout y API externa

**Responsable:** Elias Grande Beltrán (rama `Elias`)

## Qué hace
- **Carrito:** cambia cantidades (máximo 20 por producto), pide confirmación al vaciar o quitar un producto y calcula subtotal, envío fijo de $1.00 y total.
- **Checkout:** valida los datos, exige marcar la ubicación en el mapa y comprueba que esté dentro de los 5 km de cobertura. Al confirmar crea el pedido, ofrece el comprobante en PDF y el envío por WhatsApp.
- **API Nominatim (OpenStreetMap):** busca una dirección escrita (hasta 5 sugerencias, solo El Salvador) y obtiene la dirección del punto que se marca en el mapa.

## Archivos principales
| Archivo | Función |
| --- | --- |
| `src/pages/CarritoPage.jsx`, `CheckoutPage.jsx` | Pantallas |
| `src/components/checkout/MapPicker.jsx`, `ZoneStatus.jsx` | Mapa con `react-leaflet` y estado de la zona |
| `src/services/nominatim.js`, `src/hooks/useGeocodificacion.js` | Cliente de la API y hook que la usa |
| `src/services/cobertura.js` | Distancia por fórmula de Haversine y radio de cobertura |
| `src/services/comprobante.js` | Comprobante en PDF con jsPDF (se carga solo al descargar) |
| `src/test/compra.test.jsx`, `nominatim.test.js`, `cobertura.test.js`, `comprobante.test.js` | Pruebas |

## Cómo se usa la API de forma responsable
- **Una consulta por segundo:** cola con 1.1 s de espera entre peticiones (política de uso de Nominatim).
- **Sin autocompletado:** solo consulta cuando la persona pulsa buscar o suelta el pin, nunca letra por letra.
- **Caché** de respuestas repetidas, **tiempo máximo de 8 s** y **cancelación** con `AbortController` si la persona cambia de punto.
- **Errores claros** (sin internet, tiempo agotado, demasiadas consultas): el checkout sigue funcionando, hay un botón **Reintentar** y la dirección se puede escribir a mano.
