import { iniciarAdmin, leerProductosTodos, guardarProductos, PRODUCTOS_INICIALES } from './saborexpress-data.js';
import { money, esc } from './compra-utils.js';
import { confirmar, formulario, mensajeValidacion, toast } from './alertas.js';
import { reglas, validarCampo, vincularValidacion, limpiarCampo, enfocarPrimerError } from './validaciones.js';

let productos = [];

const reglaNombre = reglas.texto('el nombre', 3, 60);

function render() {
    const grid = document.getElementById('admin-menu-grid');
    grid.innerHTML = productos.length ? productos.map(producto => `
        <div class="col-md-4">
            <div class="admin-card ${producto.activo === false ? 'opacity-50' : ''}">
                <img src="${esc(producto.imagen)}" class="admin-card-img" alt="${esc(producto.nombre)}">
                <div class="admin-card-body">
                    <h3 class="admin-product-title">${esc(producto.nombre)} ${producto.activo === false ? '<span class="badge text-bg-secondary align-middle">Oculto</span>' : ''}</h3>
                    <p class="admin-product-category">${esc(producto.categoria)}</p>
                    <p class="admin-product-price">${money(producto.precio)}</p>
                </div>
                <div class="admin-card-footer d-flex justify-content-between align-items-center">
                    <button type="button" class="btn-action-text btn-action-edit" data-id="${esc(producto.id)}">[Editar]</button>
                    <button type="button" class="btn-action-text btn-action-toggle" data-id="${esc(producto.id)}">[${producto.activo === false ? 'Mostrar' : 'Ocultar'}]</button>
                    <button type="button" class="btn-action-text btn-action-delete" data-id="${esc(producto.id)}">[Eliminar]</button>
                </div>
            </div>
        </div>`).join('') : '<p class="text-secondary">El menú está vacío. Usa "Añadir Producto" para agregar platillos.</p>';
    llenarSelect();
}

// Solo se ofrecen los platillos base que todavía no están en el menú.
function llenarSelect() {
    const select = document.getElementById('new-prod-name');
    const existentes = new Set(productos.map(producto => producto.id));
    const disponibles = PRODUCTOS_INICIALES.filter(producto => !existentes.has(producto.id));
    select.innerHTML = '<option value="" selected disabled>-- Selecciona un platillo o bebida --</option>' +
        disponibles.map(producto => `<option value="${esc(producto.id)}" data-price="${producto.precio}">${esc(producto.nombre)} (${esc(producto.categoria)})</option>`).join('');
}

function persistir() {
    guardarProductos(productos);
    render();
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
            const duplicado = productos.some(item => item.id !== producto.id && item.nombre.toLowerCase() === nombre.toLowerCase());
            if (duplicado) { mensajeValidacion('Ya existe otro producto con ese nombre.'); return false; }
            const errorPrecio = reglas.precio(precioTexto);
            if (errorPrecio) { mensajeValidacion(errorPrecio); return false; }
            return { nombre, precio: Number(parseFloat(precioTexto).toFixed(2)) };
        }
    });
    if (!confirmado || !valor) return;
    producto.nombre = valor.nombre;
    producto.precio = valor.precio;
    persistir();
    toast(`"${producto.nombre}" actualizado.`);
}

async function eliminarProducto(producto) {
    const acepto = await confirmar({
        titulo: '¿Eliminar este producto?',
        texto: `"${producto.nombre}" dejará de mostrarse en el menú público. Podrás volver a agregarlo desde "Añadir Producto".`,
        icon: 'warning',
        confirmText: 'Sí, eliminar'
    });
    if (!acepto) return;
    productos = productos.filter(item => item.id !== producto.id);
    persistir();
    toast(`"${producto.nombre}" eliminado del menú.`, 'info');
}

function alternarVisibilidad(producto) {
    producto.activo = producto.activo === false;
    persistir();
    toast(producto.activo ? `"${producto.nombre}" visible en el menú.` : `"${producto.nombre}" oculto del menú público.`, 'info');
}

function init() {
    if (!iniciarAdmin('admin-menu.html')) return;
    productos = leerProductosTodos();
    render();

    const form = document.getElementById('form-add-product');
    const select = document.getElementById('new-prod-name');
    const precio = document.getElementById('new-prod-price');
    const error = document.getElementById('addProductError');
    const modal = document.getElementById('modalAddProduct');

    const reglaSeleccion = valor => (valor ? '' : 'Selecciona un platillo o bebida.');
    vincularValidacion(select, reglaSeleccion);
    vincularValidacion(precio, reglas.precio);

    select.addEventListener('change', () => {
        precio.value = select.selectedOptions[0]?.dataset.price || '';
        if (precio.value) validarCampo(precio, reglas.precio);
    });

    // Al cerrar el modal se limpian los avisos de validación.
    modal.addEventListener('hidden.bs.modal', () => {
        form.reset();
        limpiarCampo(select);
        limpiarCampo(precio);
        error.classList.add('d-none');
    });

    document.getElementById('admin-menu-grid').addEventListener('click', event => {
        const boton = event.target.closest('.btn-action-delete, .btn-action-edit, .btn-action-toggle');
        if (!boton) return;
        const producto = productos.find(item => item.id === boton.dataset.id);
        if (!producto) return;

        if (boton.classList.contains('btn-action-delete')) eliminarProducto(producto);
        else if (boton.classList.contains('btn-action-edit')) editarProducto(producto);
        else alternarVisibilidad(producto);
    });

    form.addEventListener('submit', event => {
        event.preventDefault();
        error.classList.add('d-none');

        const seleccionValida = validarCampo(select, reglaSeleccion);
        const precioValido = validarCampo(precio, reglas.precio);
        if (!seleccionValida || !precioValido) {
            enfocarPrimerError(form);
            return;
        }

        const base = PRODUCTOS_INICIALES.find(item => item.id === select.value);
        if (!base) {
            error.textContent = 'No se encontró el producto seleccionado.';
            error.classList.remove('d-none');
            return;
        }
        productos.push({ ...base, precio: Number(parseFloat(precio.value).toFixed(2)), activo: true });
        persistir();
        bootstrap.Modal.getOrCreateInstance(modal).hide();
        toast(`"${base.nombre}" agregado al menú.`);
    });
}

document.addEventListener('DOMContentLoaded', init);
