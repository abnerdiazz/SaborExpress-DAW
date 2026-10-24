import { Link } from 'react-router-dom';

const ESPECIALIDADES = [
  { imagen: '/img/comida/pupusa-queso.jpg', titulo: 'Pupusa de queso', alt: 'Pupusa de queso', texto: 'Tradicional masa de maíz o arroz rellena de abundante queso derretido al estilo salvadoreño.' },
  { imagen: '/img/comida/pupusa-revuelta.jpg', titulo: 'Pupusa revuelta', alt: 'Pupusa revuelta', texto: 'Nuestra pupusa más popular, con la mezcla perfecta de chicharrón, frijoles refritos y queso.' },
  { imagen: '/img/comida/pupusa-chicharron.jpg', titulo: 'Pupusa de chicharrón', alt: 'Pupusa de chicharrón', texto: 'Rellena de chicharrón de cerdo finamente molido y sazonado, combinado con queso.' },
  { imagen: '/img/comida/pupusa-frijol.jpg', titulo: 'Pupusa de frijol con queso', alt: 'Pupusa de frijol con queso', texto: 'Suave combinación de frijoles rojos refritos artesanales y queso derretido.' }
];

export default function HomePage() {
  return (
    <div className="container">
      <section className="pt-5">
        <div className="row align-items-center g-4">
          <div className="col-lg-6">
            <h1 className="page-title hero-title mb-3">Las mejores pupusas, directo a tu puerta</h1>
            <p className="section-text mb-4">
              Ordena en línea y recibe a domicilio de forma rápida y sencilla. El auténtico sabor tradicional donde te encuentres.
            </p>
            <Link to="/menu" className="btn btn-brand">Ver Menú</Link>
          </div>
          <div className="col-lg-6">
            <img src="/img/inicio/hero.jpg" className="hero-image" alt="Pupusas SaborExpress" />
          </div>
        </div>
      </section>

      <section className="py-5">
        <h2 className="section-title">Nuestras Especialidades</h2>
        <p className="page-subtitle">Descubre nuestra variedad de pupusas preparadas con ingredientes frescos y recetas tradicionales.</p>
        <div className="row g-4 mt-2">
          {ESPECIALIDADES.map(item => (
            <div className="col-6 col-md-3" key={item.titulo}>
              <article className="menu-product-card h-100">
                <img src={item.imagen} className="menu-product-image" alt={item.alt} />
                <div className="menu-product-body">
                  <h3 className="menu-product-title">{item.titulo}</h3>
                  <p className="menu-product-description">{item.texto}</p>
                </div>
              </article>
            </div>
          ))}
        </div>
      </section>

      <section className="pb-5">
        <div className="row align-items-center g-4">
          <div className="col-lg-6 order-lg-2">
            <h2 className="section-title mb-3">Nosotros</h2>
            <p className="section-text">
              En SaborExpress nos dedicamos a mantener viva la tradición culinaria salvadoreña. Cada una de nuestras pupusas es elaborada a mano al momento, utilizando materias primas de la más alta calidad y un riguroso estándar de higiene.
            </p>
            <p className="section-text">
              Nacimos con el propósito de llevar la calidez y el sabor del hogar directamente a tu mesa, garantizando una experiencia deliciosa y confiable en cada entrega.
            </p>
            <Link to="/nosotros" className="btn btn-outline-brand">Conócenos</Link>
          </div>
          <div className="col-lg-6 order-lg-1">
            <img src="/img/inicio/pupuseria.jpg" className="hero-image" alt="Nuestra pupusería" />
          </div>
        </div>
      </section>
    </div>
  );
}
