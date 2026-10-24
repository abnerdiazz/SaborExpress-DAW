import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';

/**
 * Ventana modal controlada por React (estado `abierto`), con los estilos de Bootstrap.
 * Se cierra con la tecla Esc, con la X, o al pulsar fuera del cuadro.
 */
export default function Modal({ abierto, titulo, onCerrar, children, pie = null }) {
  const idTitulo = useId();

  useEffect(() => {
    if (!abierto) return undefined;
    const alTeclear = evento => { if (evento.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', alTeclear);
    document.body.classList.add('overflow-hidden');
    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.body.classList.remove('overflow-hidden');
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return createPortal(
    <>
      <div className="modal-react-backdrop" />
      <div
        className="modal-react"
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        onMouseDown={evento => { if (evento.target === evento.currentTarget) onCerrar(); }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title fs-5 fw-bold" id={idTitulo}>{titulo}</h2>
              <button type="button" className="btn-close" aria-label="Cerrar" onClick={onCerrar} />
            </div>
            <div className="modal-body">{children}</div>
            {pie && <div className="modal-footer">{pie}</div>}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
