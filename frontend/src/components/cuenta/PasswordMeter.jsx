import { COLORES_PASSWORD, evaluarPassword } from '../../services/validaciones.js';

/** Barra de seguridad de la contraseña (muy débil → fuerte). No muestra nada si el campo está vacío. */
export default function PasswordMeter({ password }) {
  if (!password) return <div className="password-meter" aria-live="polite" />;
  const { puntaje, etiqueta } = evaluarPassword(password);
  return (
    <div className="password-meter" aria-live="polite">
      <div className="password-meter-bar">
        <span style={{ width: `${(puntaje + 1) * 20}%`, background: COLORES_PASSWORD[puntaje] }} />
      </div>
      <small className="password-meter-label">Seguridad: <strong>{etiqueta}</strong></small>
    </div>
  );
}
