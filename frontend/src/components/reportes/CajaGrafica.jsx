/** Contenedor de una gráfica: muestra un mensaje de "sin datos" encima cuando no hay nada que graficar. */
export default function CajaGrafica({ vacio, icono, mensaje, children }) {
  return (
    <div className="chart-box">
      {children}
      {vacio && (
        <div className="chart-empty" role="status">
          <i className={`bi ${icono}`} aria-hidden="true" />
          <span>{mensaje}</span>
        </div>
      )}
    </div>
  );
}
