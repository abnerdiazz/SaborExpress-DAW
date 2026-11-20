import { useMemo, useState } from 'react';
import Pagination from '../../components/ui/Pagination.jsx';
import { useMensajes } from '../../hooks/useMensajes.js';
import { usePaginacion } from '../../hooks/usePaginacion.js';
import { confirmar, mostrar, toast } from '../../services/alertas.js';
import { esc } from '../../services/compra.js';
import { armarRespuesta, eliminarMensaje, marcarMensaje } from '../../services/mensajes.js';

const POR_PAGINA = 8;
const FILTROS = [['todos', 'Todos'], ['sin-leer', 'Sin leer'], ['leidos', 'Leídos']];

const fechaCorta = iso => {
  const fecha = iso ? new Date(iso) : null;
  if (!fecha || Number.isNaN(fecha.getTime())) return 'Sin fecha';
  return `${fecha.toLocaleDateString('es-SV')} ${fecha.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}`;
};

/** Bandeja de mensajes de contacto: filtro, búsqueda, lectura, marcar como leído y eliminar. */
export default function MensajesPage() {
  const { mensajes, noLeidos } = useMensajes();
  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  const filtrados = useMemo(() => {
    const consulta = busqueda.trim().toLowerCase();
    return mensajes.filter(m =>
      (filtro === 'todos' || (filtro === 'sin-leer' ? !m.leido : m.leido)) &&
      `${m.nombre} ${m.correo} ${m.asunto}`.toLowerCase().includes(consulta)
    );
  }, [mensajes, filtro, busqueda]);

  const { pagina, setPagina, paginas, visibles } = usePaginacion(filtrados, POR_PAGINA);

  /** Abre el mensaje completo y lo marca como leído. El texto del cliente se escapa antes de mostrarlo. */
  async function leer(mensaje) {
    marcarMensaje(mensaje.id, true);
    const respuesta = armarRespuesta(mensaje);
    await mostrar({
      title: esc(mensaje.asunto || 'Sin asunto'),
      html: `
        <div class="text-start">
          <p class="mb-1"><strong>De:</strong> ${esc(mensaje.nombre)} &lt;${esc(mensaje.correo)}&gt;</p>
          ${mensaje.telefono ? `<p class="mb-1"><strong>Teléfono:</strong> ${esc(mensaje.telefono)}</p>` : ''}
          <p class="mb-3"><strong>Recibido:</strong> ${esc(fechaCorta(mensaje.enviadoEn))}</p>
          <p style="white-space:pre-wrap">${esc(mensaje.mensaje)}</p>
          <hr>
          <p class="small text-secondary mb-2">
            Responder como <strong>${esc(respuesta.de)}</strong>. El mensaje de agradecimiento ya viene escrito y se puede editar antes de enviar.
          </p>
          <a class="btn btn-sm btn-brand me-2" href="${esc(respuesta.mailto)}">Responder por correo</a>
          <a class="btn btn-sm btn-outline-secondary" href="${esc(respuesta.gmail)}" target="_blank" rel="noopener noreferrer">Abrir en Gmail</a>
        </div>`,
      confirmButtonText: 'Cerrar',
      width: 560
    });
  }

  function alternarLectura(mensaje) {
    const nuevo = !mensaje.leido;
    if (marcarMensaje(mensaje.id, nuevo)) toast(nuevo ? 'Marcado como leído.' : 'Marcado como sin leer.', 'info', 2000);
  }

  async function borrar(mensaje) {
    const acepto = await confirmar({
      titulo: '¿Eliminar este mensaje?',
      texto: `Se borrará el mensaje de ${mensaje.nombre || 'este cliente'}. No se puede deshacer.`,
      icon: 'warning',
      confirmText: 'Sí, eliminar'
    });
    if (!acepto) return;
    if (eliminarMensaje(mensaje.id)) toast('Mensaje eliminado.');
  }

  return (
    <>
      <div className="mb-4">
        <h1 className="admin-wireframe-title">Mensajes</h1>
        <p className="admin-wireframe-subtitle">
          Consultas enviadas desde el formulario de contacto.{' '}
          <strong>{noLeidos}</strong> sin leer de {mensajes.length}.
        </p>
      </div>

      <section className="surface-card range-toolbar mb-4" aria-label="Filtro de mensajes">
        <strong className="me-1"><i className="bi bi-funnel me-2 text-secondary" />Mostrar:</strong>
        {FILTROS.map(([clave, texto]) => (
          <button key={clave} className={`range-chip${filtro === clave ? ' active' : ''}`} aria-pressed={filtro === clave} type="button"
            onClick={() => { setFiltro(clave); setPagina(1); }}>{texto}</button>
        ))}
        <div className="search-box admin-report-search ms-lg-auto">
          <i className="bi bi-search" />
          <input className="form-control form-control-sm" type="search" placeholder="Buscar mensaje..." aria-label="Buscar mensaje"
            value={busqueda} onChange={e => { setBusqueda(e.target.value); setPagina(1); }} />
        </div>
      </section>

      <section className="surface-card report-panel wireframe-chart-panel">
        <div className="table-responsive">
          <table className="table admin-table align-middle">
            <thead>
              <tr><th>Recibido</th><th>De</th><th>Asunto</th><th className="text-end">Acciones</th></tr>
            </thead>
            <tbody>
              {visibles.map(mensaje => (
                <tr key={mensaje.id} className={mensaje.leido ? '' : 'fw-semibold'}>
                  <td className="small">{fechaCorta(mensaje.enviadoEn)}</td>
                  <td>
                    {!mensaje.leido && <span className="badge text-bg-danger me-2">Nuevo</span>}
                    {mensaje.nombre || 'Cliente web'}
                    <br /><small className="text-secondary fw-normal">{mensaje.correo}</small>
                  </td>
                  <td>{mensaje.asunto || 'Sin asunto'}</td>
                  <td className="text-end text-nowrap">
                    <button type="button" className="btn btn-sm btn-outline-secondary me-1" aria-label={`Leer mensaje de ${mensaje.nombre}`} onClick={() => leer(mensaje)}>
                      <i className="bi bi-envelope-open" /> Leer
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-secondary me-1"
                      aria-label={`${mensaje.leido ? 'Marcar como sin leer' : 'Marcar como leído'} el mensaje de ${mensaje.nombre}`}
                      title={mensaje.leido ? 'Marcar como sin leer' : 'Marcar como leído'} onClick={() => alternarLectura(mensaje)}>
                      <i className={`bi ${mensaje.leido ? 'bi-envelope' : 'bi-check2'}`} />
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-danger" aria-label={`Eliminar mensaje de ${mensaje.nombre}`} onClick={() => borrar(mensaje)}>
                      <i className="bi bi-trash" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtrados.length === 0 && (
          <div className="text-center text-secondary py-4">
            {mensajes.length
              ? 'No se encontraron mensajes con ese criterio.'
              : 'Aún no hay mensajes. Aparecerán aquí cuando un cliente escriba desde la página de Contacto.'}
          </div>
        )}
        <Pagination pagina={pagina} paginas={paginas} onCambiar={setPagina} etiqueta="Paginación de mensajes" />
      </section>
    </>
  );
}
