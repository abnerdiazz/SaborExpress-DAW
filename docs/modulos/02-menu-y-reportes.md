# Módulo 2: menú público y reportes

**Responsable:** Marlene Yamileth Pérez Alvarado (rama `Marlene`)

## Qué hace
- **Menú:** muestra el catálogo con búsqueda, filtro por categoría, paginación de 6 productos y tope de 20 unidades por producto. Sin sesión, "Agregar" invita a iniciar sesión o crear cuenta.
- **Reportes (administrador):** indicadores y cuatro gráficas de Chart.js (ventas por día, pedidos por día, ingresos por categoría y estado de los pedidos), filtros por rango de fechas, detalle de los pedidos de un día al hacer clic en una barra, exportación a CSV (resumen por categoría y detalle de pedidos) y datos de demostración identificados.

## Archivos principales
| Archivo | Función |
| --- | --- |
| `src/pages/MenuPage.jsx`, `src/components/menu/ProductCard.jsx` | Pantalla del menú y tarjeta de producto |
| `src/pages/admin/ReportesPage.jsx` | Pantalla de reportes |
| `src/components/reportes/Graficas.jsx`, `CajaGrafica.jsx`, `registrarChart.js` | Gráficas con `react-chartjs-2` y contenedor con mensaje de "sin datos" |
| `src/services/reportes.js` | Cálculos puros: indicadores, series diarias, rangos, CSV y datos de demostración |
| `src/test/menu-reportes.test.jsx`, `reportes.test.js` | Pruebas |

## Decisiones técnicas
- Los cálculos viven en `services/reportes.js`, sin React: se prueban solos y la página solo los muestra.
- Chart.js se registra una sola vez (`registrarChart.js`) y solo con los elementos que se usan, para no cargar de más.
- Los pedidos cancelados no cuentan como ventas, pero sí aparecen en la gráfica de estados.
- Los datos de demostración llevan un correo reservado, así se pueden quitar sin tocar pedidos reales.
- Al exportar, el texto que empieza con `=`, `+`, `-` o `@` se neutraliza (`celdaCsv`): un cliente no puede colar una fórmula de Excel en el nombre.
