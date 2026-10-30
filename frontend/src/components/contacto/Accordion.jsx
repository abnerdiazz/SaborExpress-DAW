import { useState } from 'react';

/** Acordeón de preguntas frecuentes: solo una respuesta abierta a la vez. */
export default function Accordion({ elementos }) {
  const [abierto, setAbierto] = useState(null);
  return (
    <div className="accordion contact-accordion">
      {elementos.map((elemento, indice) => {
        const activo = abierto === indice;
        return (
          <div className="accordion-item mb-2" key={elemento.pregunta}>
            <h3 className="accordion-header">
              <button
                className={`accordion-button${activo ? '' : ' collapsed'}`}
                type="button"
                aria-expanded={activo}
                onClick={() => setAbierto(activo ? null : indice)}
              >
                {elemento.pregunta}
              </button>
            </h3>
            <div className={`accordion-collapse collapse${activo ? ' show' : ''}`}>
              <div className="accordion-body section-text">{elemento.respuesta}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
