/** Paginación numerada con botones Anterior y Siguiente (clases de Bootstrap). */
export default function Pagination({ pagina, paginas, onCambiar, etiqueta = 'Paginación' }) {
  if (paginas <= 1) return null;
  const numeros = Array.from({ length: paginas }, (_, i) => i + 1);
  return (
    <nav className="mt-4" aria-label={etiqueta}>
      <ul className="pagination justify-content-center mb-0">
        <li className={`page-item ${pagina === 1 ? 'disabled' : ''}`}>
          <button type="button" className="page-link" aria-label="Página anterior" disabled={pagina === 1} onClick={() => onCambiar(pagina - 1)}>
            <i className="bi bi-chevron-left" />
          </button>
        </li>
        {numeros.map(numero => (
          <li key={numero} className={`page-item ${numero === pagina ? 'active' : ''}`}>
            <button type="button" className="page-link" aria-current={numero === pagina ? 'page' : undefined} onClick={() => onCambiar(numero)}>
              {numero}
            </button>
          </li>
        ))}
        <li className={`page-item ${pagina === paginas ? 'disabled' : ''}`}>
          <button type="button" className="page-link" aria-label="Página siguiente" disabled={pagina === paginas} onClick={() => onCambiar(pagina + 1)}>
            <i className="bi bi-chevron-right" />
          </button>
        </li>
      </ul>
    </nav>
  );
}
