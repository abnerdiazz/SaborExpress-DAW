# Módulo 3: cuenta del cliente

**Responsable:** Jason Steven Durán López (rama `Jason`)

## Qué hace
- **Registro:** validación por campo, teléfono con formato automático (7890-1234), medidor de seguridad de la contraseña, casilla para mostrarla y correo no repetido.
- **Inicio de sesión:** clientes y cuenta de demostración del administrador. Tras 5 intentos fallidos se bloquea 30 segundos; el aviso indica cuántos intentos quedan.
- **Mis pedidos:** pedido en curso con línea de tiempo y historial; se actualiza solo cuando el administrador cambia el estado.

## Archivos principales
| Archivo | Función |
| --- | --- |
| `src/pages/RegistroPage.jsx`, `LoginPage.jsx`, `MisPedidosPage.jsx` | Pantallas |
| `src/components/cuenta/PasswordMeter.jsx`, `MostrarPassword.jsx`, `OrderTimeline.jsx` | Medidor, casilla "Mostrar contraseña" y línea de tiempo |
| `src/hooks/useLoginAttempts.js` | Conteo de intentos y bloqueo temporal |
| `src/test/cuenta.test.jsx` | Pruebas |

## Decisiones técnicas
- La contraseña exige 8 o más caracteres con al menos una letra y un número.
- El bloqueo por intentos se guarda en `localStorage` para que no se evite recargando la página.
- "Mostrar contraseña" es una casilla con etiqueta (accesible con teclado y lector de pantalla).
- Mis pedidos lee los pedidos del estado global; por eso se refresca sin recargar.
