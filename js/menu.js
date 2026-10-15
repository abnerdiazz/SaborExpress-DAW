import { obtenerProductos, iniciarNavbar, leerSesion, leerCarrito, guardarCarrito } from './saborexpress-data.js';
import { MAX_POR_PRODUCTO, money, esc } from './compra-utils.js';
import { mostrar, toast } from './alertas.js';

const state = {
    productos: [],
    categoria: 'Todas',
    busqueda: '',
    pagina: 1,
    porPagina: 6,
    cantidades: new Map()
};

function productosFiltrados() {
    const query = state.busqueda.toLowerCase();
    return state.productos.filter(producto => {
        const coincideCategoria = state.categoria === 'Todas' || producto.categoria === state.categoria;
        const texto = `${producto.nombre} ${producto.descripcion} ${producto.categoria}`.toLowerCase();
        return coincideCategoria && texto.includes(query);
    });
}

function cantidadSeleccionada(id) {
    return state.cantidades.get(id) ?? 1;
}

function renderPaginacion(total) {
    const ul = document.getElementById('menuPagination');
    const paginas = Math.ceil(total / state.porPagina);
    ul.innerHTML = '';
    if (paginas <= 1) return;

    const prevDisabled = state.pagina === 1 ? 'disabled' : '';
    ul.insertAdjacentHTML('beforeend', `<li class="page-item ${prevDisabled}"><button class="page-link" data-page="${state.pagina - 1}" aria-label="Página anterior"><i class="bi bi-chevron-left"></i></button></li>`);
    for (let page = 1; page <= paginas; page += 1) {
        ul.insertAdjacentHTML('beforeend', `<li class="page-item ${page === state.pagina ? 'active' : ''}"><button class="page-link" data-page="${page}">${page}</button></li>`);
    }
    const nextDisabled = state.pagina === paginas ? 'disabled' : '';
    ul.insertAdjacentHTML('beforeend', `<li class="page-item ${nextDisabled}"><button class="page-link" data-page="${state.pagina + 1}" aria-label="Página siguiente"><i class="bi bi-chevron-right"></i></button></li>`);
}

function render() {
    const grid = document.getElementById('menuGrid');
    const empty = document.getElementById('menuEmpty');
    const productos = productosFiltrados();
    const paginas = Math.max(1, Math.ceil(productos.length / state.porPagina));
    state.pagina = Math.min(state.pagina, paginas);
    const inicio = (state.pagina - 1) * state.porPagina;
    const visibles = productos.slice(inicio, inicio + state.porPagina);

    grid.innerHTML = visibles.map(producto => {
        const qty = cantidadSeleccionada(producto.id);
        return `
        <div class="col-12 col-md-6 col-xl-4">
            <article class="menu-product-card h-100">
                <div class="menu-product-image-wrap">
                    <img src="${esc(producto.imagen)}" class="menu-product-image" alt="${esc(producto.nombre)}" loading="lazy">
                    <span class="menu-price-badge">${money(producto.precio)}</span>
                </div>
                <div class="menu-product-body">
                    <h2 class="menu-product-title">${esc(producto.nombre)}</h2>
                    <p class="menu-product-description">${esc(producto.descripcion)}</p>
                    <div class="d-flex align-items-center justify-content-between gap-3 mt-auto">
                        <div class="quantity-control" aria-label="Cantidad de ${esc(producto.nombre)}">
                            <button type="button" data-qty-action="minus" data-id="${esc(producto.id)}" aria-label="Disminuir cantidad"><i class="bi bi-dash"></i></button>
                            <span data-qty-value="${esc(producto.id)}">${qty}</span>
                            <button type="button" data-qty-action="plus" data-id="${esc(producto.id)}" aria-label="Aumentar cantidad"><i class="bi bi-plus"></i></button>
                        </div>
                        <button type="button" class="btn btn-brand px-4" data-add-cart="${esc(producto.id)}">Agregar</button>
                    </div>
                </div>
            </article>
        </div>`;
    }).join('');

    empty.classList.toggle('d-none', productos.length !== 0);
    renderPaginacion(productos.length);
}

function cambiarCantidad(id, delta) {
    const actual = cantidadSeleccionada(id);
    const nueva = Math.min(20, Math.max(1, actual + delta));
    state.cantidades.set(id, nueva);
    const node = document.querySelector(`[data-qty-value="${CSS.escape(id)}"]`);
    if (node) node.textContent = nueva;
}

/** Pide iniciar sesión (o crear cuenta) a quien aún no la tiene. */
async function pedirCuenta() {
    const resultado = await mostrar({
        icon: 'info',
        title: 'Necesitas una cuenta',
        text: 'Para hacer un pedido inicia sesión o crea una cuenta gratis.',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: 'Iniciar sesión',
        denyButtonText: 'Crear cuenta',
        cancelButtonText: 'Ahora no'
    });
    if (resultado.isConfirmed) window.location.href = 'login.html?redirect=menu.html';
    else if (resultado.isDenied) window.location.href = 'registro.html?redirect=menu.html';
}

async function agregarAlCarrito(id) {
    const producto = state.productos.find(item => item.id === id);
    if (!producto) return;

    // Solo un cliente con cuenta puede hacer pedidos.
    if (!leerSesion()) {
        await pedirCuenta();
        return;
    }

    const cantidad = cantidadSeleccionada(id);
    const carrito = leerCarrito();
    const existente = carrito.find(item => item.productoId === id);
    const actual = existente ? existente.cantidad : 0;
    const nueva = Math.min(MAX_POR_PRODUCTO, actual + cantidad);

    if (nueva === actual) {
        toast(`Máximo ${MAX_POR_PRODUCTO} unidades de "${producto.nombre}" por pedido.`, 'warning', 3500);
        return;
    }

    if (existente) existente.cantidad = nueva;
    else carrito.push({
        productoId: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        imagen: producto.imagen,
        categoria: producto.categoria,
        cantidad: nueva
    });

    try {
        guardarCarrito(carrito);
    } catch (error) {
        console.error(error);
        toast('No se pudo guardar el carrito. Revisa el almacenamiento del navegador.', 'error', 4000);
        return;
    }

    const agregadas = nueva - actual;
    const recortado = agregadas < cantidad ? ` (tope de ${MAX_POR_PRODUCTO} por pedido)` : '';
    toast(`${agregadas} × ${producto.nombre} agregado al carrito${recortado}.`);
}

async function init() {
    iniciarNavbar();

    try {
        const { datos, origen } = await obtenerProductos();
        state.productos = datos;
        console.info(`Fuente del catálogo: ${origen}`);
        render();
    } catch (error) {
        console.error(error);
        document.getElementById('menuGrid').innerHTML = '<p class="text-danger" role="alert">No se pudo leer el catalogo guardado. Revisa el almacenamiento del navegador.</p>';
    }

    document.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => {
        document.querySelectorAll('[data-category]').forEach(item => item.classList.remove('active'));
        button.classList.add('active');
        state.categoria = button.dataset.category;
        state.pagina = 1;
        render();
    }));

    document.getElementById('menuSearch').addEventListener('input', event => {
        state.busqueda = event.target.value.trim();
        state.pagina = 1;
        render();
    });

    document.getElementById('menuGrid').addEventListener('click', event => {
        const qtyButton = event.target.closest('[data-qty-action]');
        if (qtyButton) {
            cambiarCantidad(qtyButton.dataset.id, qtyButton.dataset.qtyAction === 'plus' ? 1 : -1);
            return;
        }
        const addButton = event.target.closest('[data-add-cart]');
        if (addButton) agregarAlCarrito(addButton.dataset.addCart);
    });

    document.getElementById('menuPagination').addEventListener('click', event => {
        const button = event.target.closest('[data-page]');
        if (!button || button.parentElement.classList.contains('disabled')) return;
        state.pagina = Number(button.dataset.page);
        render();
        window.scrollTo({ top: 120, behavior: 'smooth' });
    });
}

document.addEventListener('DOMContentLoaded', init);