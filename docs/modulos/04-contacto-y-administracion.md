# Módulo 4: contacto y administración

**Responsable:** Blanca Margarita Rivas Sandoval (rama `Blanca`)

## Qué hace
- **Contacto:** formulario validado (nombre, correo, teléfono opcional, asunto y mensaje de hasta 500 caracteres con contador), datos del negocio, mapa y preguntas frecuentes que se abren de una en una.
- **Admin Pedidos:** filtro por estado, búsqueda, paginación de 10 y cambio de estado. Entregado y Cancelado son finales: piden confirmación y ya no se pueden revertir.
- **Admin Menú:** agregar platillos del catálogo base, editar precio, ocultar o mostrar y eliminar.
- **Admin Mensajes:** bandeja con los mensajes de Contacto: filtro (todos, sin leer, leídos), búsqueda, lectura, marcar como leído, responder por correo y eliminar con confirmación. La barra del administrador muestra el número de mensajes sin leer.

## Archivos principales
| Archivo | Función |
| --- | --- |
| `src/pages/ContactoPage.jsx`, `src/components/contacto/Accordion.jsx` | Contacto y preguntas frecuentes |
| `src/pages/admin/PedidosPage.jsx`, `AdminMenuPage.jsx`, `MensajesPage.jsx` | Paneles |
| `src/services/mensajes.js`, `src/hooks/useMensajes.js` | Guardado, lectura y gestión de los mensajes |
| `src/test/contacto-admin.test.jsx`, `mensajes.test.jsx` | Pruebas |

## Decisiones técnicas
- Cada mensaje guarda un `id` y un estado `leido`. Los mensajes guardados antes de existir la bandeja se completan al leerlos (`normalizarMensajes`).
- El texto del cliente se **escapa** antes de mostrarse en el diálogo de lectura: nadie puede inyectar HTML en el panel.
- **Responder:** `armarRespuesta(mensaje)` arma el correo: destinatario (el del cliente), asunto `Re: …`, saludo con el primer nombre, una frase de agradecimiento elegida al azar de `AGRADECIMIENTOS` (general, sin hablar de comida) y la firma con `CORREO_NEGOCIO`. Devuelve un enlace `mailto:` y un enlace de Gmail con `authuser` para elegir la cuenta del negocio. Un `mailto:` no puede fijar el remitente: sale de la cuenta configurada en el programa de correo; por eso existe el botón de Gmail.
- Se conservan los 20 mensajes más recientes, porque todo vive en el navegador.
- Los estados finales piden confirmación porque son irreversibles.
