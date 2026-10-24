/** Indicador de carga accesible. */
export default function Spinner({ texto = 'Cargando...' }) {
  return (
    <div className="spinner-wrap" role="status" aria-live="polite">
      <span className="spinner-border spinner-border-sm" aria-hidden="true" />
      <span>{texto}</span>
    </div>
  );
}
