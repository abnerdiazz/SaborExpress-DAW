import { useRef } from 'react';
import Accordion from '../components/contacto/Accordion.jsx';
import FormField from '../components/ui/FormField.jsx';
import { enfocarPrimerError, useCampo, validarTodos } from '../hooks/useCampo.js';
import { cargando, cerrar, esperar, exito } from '../services/alertas.js';
import { PRIMER_NOMBRE } from '../services/compra.js';
import { MAX_MENSAJE, guardarMensaje } from '../services/mensajes.js';
import { formatearTelefono, reglas } from '../services/validaciones.js';

const FAQ = [
  { pregunta: '¿Tienen cobertura de entrega en todo San Salvador?', respuesta: 'Sí, cubrimos el área metropolitana de San Salvador, incluyendo Santa Tecla, Antiguo Cuscatlán, San Salvador Centro, Escalón, y Ciudad Merliot sin costo adicional.' },
  { pregunta: '¿Ofrecen pupusas de masa de arroz?', respuesta: '¡Por supuesto! Todas nuestras especialidades pueden ordenarse tanto en masa de maíz tradicional como en masa de arroz premium seleccionándolo en tu carrito.' },
  { pregunta: '¿Cuál es el tiempo promedio de entrega?', respuesta: 'El tiempo estimado ronda entre 30 a 45 minutos. Puede variar levemente durante horas de alta demanda los fines de semana.' },
  { pregunta: '¿Cuáles son los métodos de pago aceptados?', respuesta: 'Aceptamos efectivo al recibir el pedido, Chivo Wallet, y tarjetas de crédito o débito Visa, Mastercard y American Express.' },
  { pregunta: '¿Se pueden realizar pedidos programados para eventos?', respuesta: 'Sí, puedes programar un pedido especial con un mínimo de 24 horas de anticipación a través de nuestro formulario de contacto o llamando directo a nuestra línea.' }
];

const DATOS = [
  ['bi-geo-alt', 'Dirección Principal', 'Calle El Mirador, #123, Colonia Escalón, San Salvador, El Salvador.'],
  ['bi-telephone', 'Teléfono Directo', '+503 2200-0000 / Whatsapp: +503 7777-7777'],
  ['bi-envelope', 'Correo Electrónico', 'soporte@saborexpress.com / ventas@saborexpress.com'],
  ['bi-clock', 'Horario de Atención', 'Lunes a Domingo: 11:00 AM - 10:00 PM (Pedidos cierran a las 9:45 PM)']
];

const ESTILO = { labelClass: 'contact-label', inputClass: 'form-control contact-input' };

/** Contacto: formulario validado campo por campo, datos del negocio, mapa y preguntas frecuentes. */
export default function ContactoPage() {
  const formulario = useRef(null);
  const nombre = useCampo(reglas.nombre);
  const correo = useCampo(reglas.correo);
  const telefono = useCampo(reglas.telefonoOpcional, '', { formatear: formatearTelefono });
  const asunto = useCampo(reglas.texto('el asunto', 5, 80));
  const mensaje = useCampo(reglas.texto('tu mensaje', 10, MAX_MENSAJE));
  const campos = [nombre, correo, telefono, asunto, mensaje];
  const enviando = useRef(false);

  async function enviar(evento) {
    evento.preventDefault();
    if (!validarTodos(campos)) {
      enfocarPrimerError(formulario.current);
      return;
    }
    if (enviando.current) return;
    enviando.current = true;
    try {
      cargando('Enviando tu mensaje...');
      await esperar(900); // simula el envío: todavía no hay servidor
      guardarMensaje({
        nombre: nombre.valor.trim(), correo: correo.valor.trim(), telefono: telefono.valor.trim(),
        asunto: asunto.valor.trim(), mensaje: mensaje.valor.trim()
      });
      cerrar();
      await exito('¡Mensaje enviado!', `Gracias, ${PRIMER_NOMBRE(nombre.valor)}. Te responderemos pronto a ${correo.valor.trim()}.`);
      campos.forEach(campo => campo.reiniciar());
    } finally {
      enviando.current = false;
    }
  }

  return (
    <>
      <div className="container">
        <section className="pt-4 text-center">
          <h1 className="page-title contact-title mb-3">Contáctanos</h1>
          <p className="section-text contact-lead mx-auto">
            ¿Tienes dudas, comentarios o un pedido corporativo de pupusas? Ponte en contacto con nosotros. Nuestro equipo te responderá de inmediato.
          </p>
        </section>
        <hr className="contact-divider my-5" />

        <section className="pb-5">
          <div className="row g-5">
            <div className="col-lg-7">
              <h2 className="section-title mb-4">Envíanos un Mensaje</h2>
              <form ref={formulario} onSubmit={enviar} noValidate>
                <FormField id="contactoNombre" label="Nombre" campo={nombre} {...ESTILO} placeholder="Ingresa tu nombre completo" autoComplete="name" />
                <FormField id="contactoCorreo" label="Correo Electrónico" type="email" campo={correo} {...ESTILO} placeholder="ejemplo@correo.com" autoComplete="email" />
                <FormField id="contactoTelefono" label="Teléfono" type="tel" campo={telefono} {...ESTILO} placeholder="+503 7000-0000" autoComplete="tel" />
                <FormField id="contactoAsunto" label="Asunto" campo={asunto} {...ESTILO} placeholder="Motivo de tu mensaje" />
                <FormField
                  id="contactoMensaje" label="Mensaje" as="textarea" rows={3} campo={mensaje} className="mb-4" {...ESTILO}
                  placeholder="Detalla tu consulta o pedido especial aquí..." maxLength={MAX_MENSAJE}
                  ayuda={<small className="text-secondary d-block text-end mt-1">{mensaje.valor.length}/{MAX_MENSAJE}</small>}
                />
                <button type="submit" className="btn btn-brand px-4">Enviar mensaje</button>
              </form>
            </div>
            <div className="col-lg-5">
              <h2 className="section-title mb-4">Información de Contacto</h2>
              {DATOS.map(([icono, titulo, texto]) => (
                <div className="d-flex mb-4" key={titulo}>
                  <span className="contact-icon me-3"><i className={`bi ${icono}`} /></span>
                  <div>
                    <p className="contact-item-title mb-1">{titulo}</p>
                    <p className="section-text mb-0">{texto}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="contact-map-section py-5">
        <div className="container">
          <h2 className="section-title mb-1">Nuestra Ubicación</h2>
          <p className="page-subtitle mb-4">Mueve, arrastra o haz zoom en el mapa para ver el área de cobertura.</p>
          <div className="rounded-3 overflow-hidden mb-3" style={{ border: '1px solid var(--se-border)', boxShadow: 'var(--se-shadow)' }}>
            <iframe
              src="https://www.google.com/maps?q=Colonia+Escal%C3%B3n,+San+Salvador,+El+Salvador&output=embed"
              width="100%" height="380" style={{ border: 0, display: 'block' }} allowFullScreen loading="lazy"
              referrerPolicy="no-referrer-when-downgrade" title="Mapa interactivo de cobertura de SaborExpress"
            />
          </div>
        </div>
      </section>

      <div className="container">
        <section className="py-5">
          <h2 className="section-title">Preguntas Frecuentes</h2>
          <p className="page-subtitle mb-4">Respuestas rápidas a las consultas más comunes sobre nuestras zonas de entrega, formas de pago e ingredientes.</p>
          <Accordion elementos={FAQ} />
        </section>
      </div>

      <section className="contact-info-strip py-5">
        <div className="container">
          <div className="row g-4">
            <div className="col-md-6">
              <h3 className="section-title">SaborExpress</h3>
              <p className="section-text mb-1"><strong className="text-brand-dark">Teléfono:</strong> +503 2200-0000</p>
              <p className="section-text mb-0"><strong className="text-brand-dark">Horario:</strong> Lunes a Domingo, 11:00 AM - 10:00 PM</p>
            </div>
            <div className="col-md-6">
              <h3 className="section-title">Ubicación</h3>
              <div className="map-placeholder map-placeholder-sm d-flex align-items-center justify-content-center overflow-hidden">
                <img src="/img/contacto/mapa.png" alt="Mapa de ubicación" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
