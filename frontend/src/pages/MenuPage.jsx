import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductCard from '../components/menu/ProductCard.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';
import { usePaginacion } from '../hooks/usePaginacion.js';
import { mostrar, toast } from '../services/alertas.js';
import { CATEGORIAS } from '../services/catalogo.js';
import { MAX_POR_PRODUCTO } from '../services/compra.js';

const POR_PAGINA = 6;
const FILTROS = ['Todas', ...CATEGORIAS];

/** Menú público: búsqueda, filtro por categoría, paginación y agregar al carrito. */
export default function MenuPage() {
  const { productos } = useCatalog();
  const { sesion } = useAuth();
  const { agregar } = useCart();
  const navegar = useNavigate();

  const [categoria, setCategoria] = useState('Todas');
  const [busqueda, setBusqueda] = useState('');
  const [cantidades, setCantidades] = useState({});

  const filtrados = useMemo(() => {
    const consulta = busqueda.trim().toLowerCase();
    return productos.filter(producto => {
      const coincideCategoria = categoria === 'Todas' || producto.categoria === categoria;
      const texto = `${producto.nombre} ${producto.descripcion} ${producto.categoria}`.toLowerCase();
      return coincideCategoria && texto.includes(consulta);
    });
  }, [productos, categoria, busqueda]);

  const { pagina, setPagina, paginas, visibles } = usePaginacion(filtrados, POR_PAGINA);

  const cambiarCantidad = useCallback((id, delta) => {
    setCantidades(actuales => {
      const nueva = Math.min(MAX_POR_PRODUCTO, Math.max(1, (actuales[id] ?? 1) + delta));
      return { ...actuales, [id]: nueva };
    });
  }, []);

  /** Pide iniciar sesión (o crear cuenta) a quien aún no la tiene. */
  const pedirCuenta = useCallback(async () => {
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
    const destino = encodeURIComponent('/menu');
    if (resultado.isConfirmed) navegar(`/login?redirect=${destino}`);
    else if (resultado.isDenied) navegar(`/registro?redirect=${destino}`);
  }, [navegar]);

  const agregarAlCarrito = useCallback(async producto => {
    // Solo un cliente con cuenta puede hacer pedidos.
    if (!sesion) {
      await pedirCuenta();
      return;
    }
    const cantidad = cantidades[producto.id] ?? 1;
    try {
      const resultado = agregar(producto, cantidad);
      if (resultado.sinCambio) {
        toast(`Máximo ${MAX_POR_PRODUCTO} unidades de "${producto.nombre}" por pedido.`, 'warning', 3500);
        return;
      }
      const recortado = resultado.recortado ? ` (tope de ${MAX_POR_PRODUCTO} por pedido)` : '';
      toast(`${resultado.agregadas} × ${producto.nombre} agregado al carrito${recortado}.`);
    } catch (error) {
      console.error(error);
      toast('No se pudo guardar el carrito. Revisa el almacenamiento del navegador.', 'error', 4000);
    }
  }, [sesion, cantidades, agregar, pedirCuenta]);

  return (
    <div className="container">
      <div className="row align-items-end g-4 mb-4">
        <div className="col-lg-8">
          <h1 className="page-title">Nuestro Menú</h1>
          <p className="page-subtitle">Ordena en línea y recibe tus pupusas calientitas con curtido y salsa.</p>
        </div>
        <div className="col-lg-4">
          <label className="visually-hidden" htmlFor="menuSearch">Buscar especialidad</label>
          <div className="search-box">
            <i className="bi bi-search" />
            <input
              id="menuSearch"
              type="search"
              className="form-control"
              placeholder="Buscar especialidad..."
              autoComplete="off"
              value={busqueda}
              onChange={evento => { setBusqueda(evento.target.value); setPagina(1); }}
            />
          </div>
        </div>
      </div>

      <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap mb-4">
        <div className="category-filter" role="group" aria-label="Filtrar menú por categoría">
          {FILTROS.map(nombre => (
            <button
              key={nombre}
              type="button"
              className={`btn${categoria === nombre ? ' active' : ''}`}
              aria-pressed={categoria === nombre}
              onClick={() => { setCategoria(nombre); setPagina(1); }}
            >
              {nombre}
            </button>
          ))}
        </div>
      </div>

      {filtrados.length === 0 ? (
        <EmptyState titulo="No encontramos productos" texto="Prueba otra búsqueda o selecciona una categoría diferente." />
      ) : (
        <div className="row g-4" aria-live="polite">
          {visibles.map(producto => (
            <div className="col-12 col-md-6 col-xl-4" key={producto.id}>
              <ProductCard
                producto={producto}
                cantidad={cantidades[producto.id] ?? 1}
                onCambiarCantidad={cambiarCantidad}
                onAgregar={agregarAlCarrito}
              />
            </div>
          ))}
        </div>
      )}

      <Pagination pagina={pagina} paginas={paginas} onCambiar={setPagina} etiqueta="Paginación del menú" />
    </div>
  );
}
