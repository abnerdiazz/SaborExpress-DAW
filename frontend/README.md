# SaborExpress · aplicación React (Foro 2)

Reescritura del sitio de la pupusería como aplicación de una sola página con **React 19** y **Vite**.

## Cómo ejecutarla

Requiere Node.js 20.19 o superior (o 22.12+). Desde esta carpeta:

```
npm install      # instala las dependencias (solo la primera vez)
npm run dev      # servidor de desarrollo: http://localhost:5173
npm test         # pruebas automáticas (Vitest + Testing Library)
npm run build    # versión de producción en la carpeta dist
```

## Estructura de `src/`

| Carpeta | Contenido |
|---|---|
| `pages/` | Una pantalla por ruta (cliente en la raíz, administrador en `admin/`) |
| `components/` | Piezas reutilizables: `layout/` (barras y rutas protegidas), `ui/` (formularios, modal, paginación), y una carpeta por módulo |
| `context/` | Estado global con la Context API: sesión, catálogo, carrito y pedidos |
| `hooks/` | Hooks propios: almacenamiento reactivo, campos de formulario, paginación, geocodificación |
| `services/` | Lógica sin React: validaciones, pedidos, reportes, cobertura, comprobante PDF y cliente de la API Nominatim |
| `styles/` | Estilos del sitio (Bootstrap 5 + hojas propias) |
| `test/` | Pruebas automáticas |

## API externa

El checkout consume **Nominatim** (OpenStreetMap): busca una dirección escrita y obtiene la dirección del punto marcado en el mapa. No necesita clave. Respeta su política de uso (una consulta por segundo, sin autocompletar).

## Imágenes

Las imágenes del sitio viven en `public/img/` (copia de la carpeta `img/` del Foro 1).
