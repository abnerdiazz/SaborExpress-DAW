const VALORES = [
  { icono: '/img/nosotros/mision.png', alt: 'Icono Misión', titulo: 'Misión', texto: 'Llevar la mejor experiencia tradicional salvadoreña a los hogares con un servicio rápido, higiénico y con el sazón casero intacto.' },
  { icono: '/img/nosotros/vision.png', alt: 'Icono Visión', titulo: 'Visión', texto: 'Convertirnos en la pupusería líder de entrega a domicilio a nivel nacional, siendo reconocidos por nuestra innovación constante y fidelidad al sabor original.' },
  { icono: '/img/nosotros/valores.png', alt: 'Icono Valores', titulo: 'Valores', texto: 'Calidad artesanal, integridad en nuestros insumos, amabilidad en la entrega y respeto absoluto por la herencia culinaria de nuestro país.' }
];

const GALERIA = [
  ['parrilla', 'Nuestra parrilla'],
  ['ingredientes', 'Ingredientes frescos'],
  ['salon', 'Salón familiar'],
  ['preparacion-masa', 'Preparación de masa'],
  ['empaque', 'Empaque térmico'],
  ['motoristas', 'Motoristas Express']
];

const EQUIPO = [
  { foto: 'teresa', nombre: 'Doña Teresa Ortiz', rol: 'Maestra Pupusera Principal', texto: 'Más de 20 años dándole forma a las mejores pupusas de maíz y arroz del país.' },
  { foto: 'carlos', nombre: 'Carlos Mendoza', rol: 'Chef de Control de Calidad', texto: 'Asegura que los curtidos, salsas e ingredientes mantengan el estándar tradicional.' },
  { foto: 'sofia', nombre: 'Sofía Martínez', rol: 'Gerente de Logística de Entrega', texto: 'Supervisa que tu orden salga caliente y llegue rápida a cualquier rincón de la ciudad.' },
  { foto: 'julio', nombre: 'Julio Espinoza', rol: 'Atención al Cliente y Recepción', texto: 'El enlace directo que garantiza que tus peticiones especiales de ingredientes se cumplan.' }
];

export default function NosotrosPage() {
  return (
    <div className="container">
      <section className="pt-5">
        <div className="row align-items-center g-4">
          <div className="col-lg-6">
            <h1 className="page-title mb-3">Nuestra Historia</h1>
            <p className="section-text">
              Conoce el origen de SaborExpress, una tradición familiar que nace del amor por la gastronomía salvadoreña y el deseo de compartir nuestras deliciosas pupusas con cada familia. Desde nuestros inicios, hemos trabajado con dedicación, ingredientes de calidad y ese toque especial que caracteriza a la cocina hecha en casa. Cada pupusa es preparada con esmero, conservando los sabores y las tradiciones de nuestra tierra. En SaborExpress, creemos que la comida no solo alimenta, sino que también une corazones, crea recuerdos y alegra cada mesa. ❤️🇸🇻
            </p>
          </div>
          <div className="col-lg-6">
            <img src="/img/nosotros/historia.jpg" className="story-photo" alt="Historia de SaborExpress" />
          </div>
        </div>
      </section>

      <section className="py-5">
        <div className="row align-items-center g-4">
          <div className="col-lg-6">
            <img src="/img/nosotros/primer-local.jpg" className="story-photo" alt="Nuestro primer local" />
          </div>
          <div className="col-lg-6">
            <h2 className="section-title mb-3">Nuestra Tradición Familiar</h2>
            <p className="section-text">En SaborExpress nos dedicamos a mantener viva la tradición culinaria salvadoreña. Cada una de nuestras pupusas es elaborada a mano al momento, utilizando materias primas de la más alta calidad y un riguroso estándar de higiene.</p>
            <p className="section-text">Nacimos con el propósito de llevar la calidez y el sabor del hogar directamente a tu mesa, garantizando una experiencia deliciosa y confiable en cada entrega. Nos enorgullecemos de heredar recetas clásicas de generación en generación.</p>
          </div>
        </div>
      </section>

      <section className="py-5">
        <h2 className="section-title">Misión, Visión y Valores</h2>
        <p className="page-subtitle">Los pilares que sostienen nuestro compromiso con el sabor y la calidad en cada entrega de pupusas.</p>
        <div className="row g-4 mt-2">
          {VALORES.map(valor => (
            <div className="col-md-4" key={valor.titulo}>
              <div className="surface-card hover-lift h-100 p-4 text-center">
                <img src={valor.icono} alt={valor.alt} className="value-icon mb-2" />
                <h3 className="menu-product-title">{valor.titulo}</h3>
                <p className="menu-product-description text-start mb-0">{valor.texto}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-5">
        <h2 className="section-title">Galería del Restaurante</h2>
        <p className="page-subtitle">Un vistazo a nuestro ambiente cálido, nuestros procesos de cocina higiénica y la preparación diaria de tus pupusas favoritas.</p>
        <div className="row g-3 mt-2">
          {GALERIA.map(([archivo, alt]) => (
            <div className="col-6 col-md-4" key={archivo}>
              <img src={`/img/nosotros/${archivo}.jpg`} className="gallery-photo" alt={alt} />
            </div>
          ))}
        </div>
      </section>

      <section className="pb-5">
        <h2 className="section-title">Nuestro Equipo</h2>
        <p className="page-subtitle">Conoce a las personas dedicadas a garantizar la máxima calidad y sabor en cada pedido que realizas.</p>
        <div className="row g-4 mt-2">
          {EQUIPO.map(persona => (
            <div className="col-6 col-md-3" key={persona.foto}>
              <article className="menu-product-card h-100">
                <img src={`/img/nosotros/${persona.foto}.jpg`} className="menu-product-image team-photo" alt={persona.nombre} />
                <div className="menu-product-body">
                  <h3 className="menu-product-title mb-0">{persona.nombre}</h3>
                  <p className="team-role">{persona.rol}</p>
                  <p className="menu-product-description">{persona.texto}</p>
                </div>
              </article>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
