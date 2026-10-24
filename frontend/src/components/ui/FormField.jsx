/**
 * Campo de formulario con etiqueta, validación visual (is-invalid / is-valid de Bootstrap)
 * y mensaje de error. Recibe el objeto que devuelve el hook useCampo.
 */
export default function FormField({
  id,
  label,
  campo,
  as: Etiqueta = 'input',
  type = 'text',
  className = 'mb-3',
  labelClass = 'form-label',
  inputClass = 'form-control',
  ayuda = null,
  children,
  ...atributos
}) {
  const claseEstado = campo.estado === 'invalido' ? 'is-invalid' : campo.estado === 'valido' ? 'is-valid' : '';
  const propiedadesTipo = Etiqueta === 'input' ? { type } : {};
  return (
    <div className={className}>
      {label && <label htmlFor={id} className={labelClass}>{label}</label>}
      <Etiqueta
        id={id}
        className={`${inputClass} ${claseEstado}`.trim()}
        aria-invalid={campo.estado === 'invalido' ? 'true' : undefined}
        aria-describedby={`${id}-error`}
        {...propiedadesTipo}
        {...campo.props}
        {...atributos}
      >
        {children}
      </Etiqueta>
      {ayuda}
      <div id={`${id}-error`} className="invalid-feedback">{campo.error}</div>
    </div>
  );
}
