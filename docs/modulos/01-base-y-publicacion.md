# Módulo 1: base de la aplicación y publicación

**Responsable:** Abner Isaí Díaz Rivera (rama `Abner`)

## Qué hace
Es la estructura sobre la que se apoyan los demás módulos: arranque de la aplicación, enrutamiento con rutas protegidas por rol, estado global, componentes reutilizables, estilos y publicación.

## Archivos principales
| Archivo | Función |
| --- | --- |
| `src/main.jsx` | Monta React con `BrowserRouter` y los estilos |
| `src/App.jsx` | Mapa de rutas; cada página se carga bajo demanda (`lazy`) |
| `src/components/layout/RutasProtegidas.jsx` | `RutaCliente` y `RutaAdmin`: sin la sesión correcta, redirigen al login |
| `src/components/layout/Layouts.jsx`, `Navbar.jsx`, `AdminNavbar.jsx`, `Footer.jsx` | Estructura visual de la tienda, de la cuenta y del panel |
| `src/context/*` | Estado global: `AuthContext`, `CatalogContext`, `CartContext`, `OrdersContext` |
| `src/services/store.js`, `src/hooks/useStoredValue.js` | Lectura reactiva de `localStorage`, sincronizada entre pestañas con `useSyncExternalStore` |
| `src/hooks/useCampo.js`, `src/components/ui/FormField.jsx` | Validación de formularios campo por campo |
| `src/components/ui/*` | `Modal`, `Pagination`, `Spinner`, `EmptyState` |
| `src/services/auth.js`, `validaciones.js`, `alertas.js` | Sesiones, reglas de validación y diálogos de SweetAlert2 |
| `netlify.toml`, `public/_redirects` | Publicación en Netlify y rutas de una aplicación de una sola página |
| `LICENSE`, `README.md`, `src/test/requisitos-finales.test.js` | Licencia, documentación y comprobación automática de los requisitos |

## Decisiones técnicas
- **Dos sesiones independientes** (`saborExpressSession` y `saborExpressAdminSession`): permite probar cliente y administrador a la vez y evita que un cliente llegue a un panel.
- **`useSyncExternalStore`** en lugar de copiar `localStorage` a un estado: React se entera cuando otra pestaña escribe, así el administrador ve los pedidos nuevos sin recargar.
- **Carga bajo demanda** de cada página: el primer envío al navegador es más liviano.
- **Redirección segura después del login** (`destinoSeguro`): solo acepta rutas internas y nunca manda a un cliente a un panel.
