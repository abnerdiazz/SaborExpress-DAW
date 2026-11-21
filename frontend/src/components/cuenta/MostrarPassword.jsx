/** Casilla "Mostrar contraseña": deja ver lo escrito para evitar errores de digitación (accesibilidad). */
export default function MostrarPassword({ id, visible, onCambiar }) {
  return (
    <div className="form-check mt-2">
      <input id={id} className="form-check-input" type="checkbox" checked={visible} onChange={evento => onCambiar(evento.target.checked)} />
      <label className="form-check-label small" htmlFor={id}>Mostrar contraseña</label>
    </div>
  );
}
