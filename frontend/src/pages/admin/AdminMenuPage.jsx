import { useState } from 'react';
import Modal from '../../components/ui/Modal.jsx';
import FormField from '../../components/ui/FormField.jsx';
import { useCatalog } from '../../context/CatalogContext.jsx';
import { useCampo, validarTodos } from '../../hooks/useCampo.js';
import { confirmar, formulario, mensajeValidacion, toast } from '../../services/alertas.js';
import { PRODUCTOS_INICIALES } from '../../services/catalogo.js';
import { esc, money, rutaImg } from '../../services/compra.js';
import { reglas } from '../../services/validaciones.js';

const reglaNombre = reglas.texto('el nombre', 3, 60);
const reglaSeleccion = valor => (valor ? '' : 'Selecciona un platillo o bebida.');

/** Gestión del menú público: añadir desde el catálogo base, editar, ocultar/mostrar y eliminar. */
export default function AdminMenuPage() {
  const { todos, guardar } = useCatalog();
  const [modalAbierto, setModalAbierto] = useState(false);
  const seleccion = useCampo(reglaSeleccion);
  const precio = useCampo(reglas.precio);

  // Solo se ofrecen los platillos base que todavía no están en el menú.
  const existentes = new Set(todos.map(p => p.id));
  const disponibles = PRODUCTOS_INICIALES.filter(p => !existentes.has(p.id));

  function abrirModal() {
    seleccion.reiniciar();
    precio.reiniciar();
    setModalAbierto(true);
  }

  function elegirBase(evento) {
    const id = evento.target.value;
    seleccion.setValor(id);
    const base = PRODUCTOS_INICIALES.find(p => p.id === id);
    precio.setValor(base ? String(base.precio) : '');
    if (base) precio.validar();
  }

  function agregarProducto(evento) {
    evento.preventDefault();
    if (!validarTodos([seleccion, precio])) return;
    const base = PRODUCTOS_INICIALES.find(p => p.id === seleccion.valor);
    if (!base) {
      seleccion.mostrarError('No se encontró el producto seleccionado.');
      return;
    }
    guardar([...todos, { ...base, precio: Number(parseFloat(precio.valor).toFixed(2)), activo: true }]);
    setModalAbierto(false);
    toast(`"${base.nombre}" agregado al menú.`);
  }

  /** Cuadro de SweetAlert para editar nombre y precio, con validación antes de cerrar. */
  async function editarProducto(producto) {
    const { confirmado, valor } = await formulario({
      titulo: 'Editar producto',
      confirmText: 'Guardar cambios',
      html: `
        <div class="text-start">
          <label class="form-label small fw-bold" for="swal-nombre">Nombre</label>
          <input id="swal-nombre" class="form-control mb-3" maxlength="60" value="${esc(producto.nombre)}">
          <label class="form-label small fw-bold" for="swal-precio">Precio ($)</label>
          <input id="swal-precio" type="number" step="0.01" min="0.01" max="99" class="form-control" value="${Number(producto.precio).toFixed(2)}">
        </div>`,
      preConfirm: () => {
        const nombre = document.getElementById('swal-nombre').value.trim();
        const precioTexto = document.getElementById('swal-precio').value;
        const errorNombre = reglaNombre(nombre);
        if (errorNombre) { mensajeValidacion(errorNombre); return false; }
        const duplicado = todos.some(p => p.id !== producto.id && p.nombre.toLowerCase() === nombre.toLowerCase());
        if (duplicado) { mensajeValidacion('Ya existe otro producto con ese nombre.'); return false; }
        const errorPrecio = reglas.precio(precioTexto);
        if (errorPrecio) { mensajeValidacion(errorPrecio); return false; }
        return { nombre, precio: Number(parseFloat(precioTexto).toFixed(2)) };
      }
    });
    if (!confirmado || !valor) return;
    guardar(todos.map(p => (p.id === producto.id ? { ...p, ...valor } : p)));
    toast(`"${valor.nombre}" actualizado.`);
  }

  async function eliminarProducto(producto) {
    const acepto = await confirmar({
      titulo: '¿Eliminar este producto?',
      texto: `"${producto.nombre}" dejará de mostrarse en el menú público. Podrás volver a agregarlo desde "Añadir Producto".`,
      icon: 'warning',
      confirmText: 'Sí, eliminar'
    });
    if (!acepto) return;
    guardar(todos.filter(p => p.id !== producto.id));
    toast(`"${producto.nombre}" eliminado del menú.`, 'info');
  }

  function alternarVisibilidad(producto) {
    const visible = producto.activo === false;
    guardar(todos.map(p => (p.id === producto.id ? { ...p, activo: visible } : p)));
    toast(visible ? `"${producto.nombre}" visible en el menú.` : `"${producto.nombre}" oculto del menú público.`, 'info');
  }

  return (
    <>
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="admin-wireframe-title">Menú</h1>
          <p className="admin-wireframe-subtitle">Gestión de platillos y precios disponibles al público.</p>
        </div>
        <div>
          <button type="button" className="btn btn-add-product" onClick={abrirModal}>+ Añadir Producto</button>
        </div>
      </div>

      <div className="row g-4">
        {todos.length ? todos.map(producto => (
          <div className="col-md-4" key={producto.id}>
            <div className={`admin-card ${producto.activo === false ? 'opacity-50' : ''}`}>
              <img src={rutaImg(producto.imagen)} className="admin-card-img" alt={producto.nombre} />
              <div className="admin-card-body">
                <h3 className="admin-product-title">
                  {producto.nombre} {producto.activo === false && <span className="badge text-bg-secondary align-middle">Oculto</span>}
                </h3>
                <p className="admin-product-category">{producto.categoria}</p>
                <p className="admin-product-price">{money(producto.precio)}</p>
              </div>
              <div className="admin-card-footer d-flex justify-content-between align-items-center">
                <button type="button" className="btn-action-text btn-action-edit" onClick={() => editarProducto(producto)}>[Editar]</button>
                <button type="button" className="btn-action-text btn-action-toggle" onClick={() => alternarVisibilidad(producto)}>
                  [{producto.activo === false ? 'Mostrar' : 'Ocultar'}]
                </button>
                <button type="button" className="btn-action-text btn-action-delete" onClick={() => eliminarProducto(producto)}>[Eliminar]</button>
              </div>
            </div>
          </div>
        )) : <p className="text-secondary">El menú está vacío. Usa "Añadir Producto" para agregar platillos.</p>}
      </div>

      <Modal abierto={modalAbierto} titulo="Añadir Nuevo Producto al Menú" onCerrar={() => setModalAbierto(false)}>
        <form onSubmit={agregarProducto} noValidate>
          <FormField
            id="new-prod-name" as="select" label="Seleccionar Producto" campo={{ ...seleccion, props: { ...seleccion.props, onChange: elegirBase } }}
            labelClass="form-label text-uppercase fs-7 fw-bold" inputClass="form-select"
          >
            <option value="">-- Selecciona un platillo o bebida --</option>
            {disponibles.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.categoria})</option>)}
          </FormField>
          <FormField
            id="new-prod-price" type="number" label="Precio ($)" campo={precio} step="0.01" min="0.1" max="99" placeholder="0.85"
            labelClass="form-label text-uppercase fs-7 fw-bold"
          />
          <div className="text-end mt-4">
            <button type="button" className="btn btn-secondary me-2" onClick={() => setModalAbierto(false)}>Cancelar</button>
            <button type="submit" className="btn btn-brand fw-bold">Guardar Producto</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
