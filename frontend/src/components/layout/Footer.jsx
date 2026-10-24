const REDES = [
  ['https://www.facebook.com/', 'bi-facebook', 'Facebook', 'me-5'],
  ['https://www.instagram.com/', 'bi-instagram', 'Instagram', 'me-5'],
  ['https://x.com/', 'bi-twitter-x', 'X', '']
];

export default function Footer() {
  return (
    <footer className="site-footer text-center p-2">
      <p>Síguenos en:</p>
      <p>
        {REDES.map(([url, icono, nombre, margen]) => (
          <a key={nombre} href={url} target="_blank" rel="noopener noreferrer" aria-label={nombre} className={`${margen} text-decoration-none`.trim()}>
            <i className={`bi ${icono} fs-4`} />
          </a>
        ))}
      </p>
      <p>📍 Dirección: Calle El Mirador, #123, Colonia Escalón, San Salvador.</p>
      <p>📞 Tel: +503 2200-0000</p>
      <p>
        <a href="mailto:soporte@saborexpress.com" style={{ color: '#fff', textDecoration: 'none' }}>✉ Email: soporte@saborexpress.com</a>
      </p>
      <p>&copy; 2026 SaborExpress</p>
    </footer>
  );
}
