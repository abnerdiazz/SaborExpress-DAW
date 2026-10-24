/** Mensaje de "no hay nada que mostrar", con ícono y acciones opcionales. */
export default function EmptyState({ icono = 'bi-search', titulo, texto = '', children = null, className = '' }) {
  return (
    <div className={`surface-card p-5 text-center ${className}`.trim()}>
      <i className={`bi ${icono} fs-1 text-brand`} aria-hidden="true" />
      <h2 className="h5 fw-bold mt-3">{titulo}</h2>
      {texto && <p className="text-secondary mb-0">{texto}</p>}
      {children}
    </div>
  );
}
