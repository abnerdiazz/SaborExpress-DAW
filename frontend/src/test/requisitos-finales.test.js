/**
 * Lista de verificación automática de los requisitos de la entrega final
 * (ruta de aprendizaje DAW901). Comprueba lo que se puede comprobar leyendo el
 * repositorio: licencia, README, rutas, roles, API, gráfica, secretos y despliegue.
 * Lo visual (diseño, responsive) se revisa a mano con la lista del LEEME.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const RAIZ_FRONTEND = process.cwd();                 // .../frontend
const RAIZ_REPO = resolve(RAIZ_FRONTEND, '..');      // raíz del repositorio
const leer = ruta => readFileSync(ruta, 'utf8');
const readme = () => leer(join(RAIZ_REPO, 'README.md'));

function archivos(carpeta, extensiones) {
  return readdirSync(carpeta).flatMap(nombre => {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return nombre === 'test' ? [] : archivos(ruta, extensiones);
    return extensiones.some(e => nombre.endsWith(e)) ? [ruta] : [];
  });
}

describe('Entrega final: requisitos del repositorio', () => {
  it('8. tiene licencia Creative Commons completa y la menciona el README', () => {
    const licencia = leer(join(RAIZ_REPO, 'LICENSE'));
    expect(licencia).toContain('Creative Commons');
    expect(licencia).toMatch(/Attribution-NonCommercial-ShareAlike 4\.0 International/);
    expect(licencia.length).toBeGreaterThan(10000);
    expect(readme()).toMatch(/creativecommons\.org\/licenses\/by-nc-sa\/4\.0/);
  });

  it('7. el README publica los mockups de Figma y las imágenes existen', () => {
    const texto = readme();
    expect(texto).toMatch(/mockups/i);
    expect(texto).toMatch(/figma/i);
    const imagenes = [...texto.matchAll(/!\[[^\]]*\]\((docs\/mockups\/[^)]+)\)/g)].map(m => m[1]);
    expect(imagenes.length).toBeGreaterThanOrEqual(5);
    imagenes.forEach(ruta => expect(existsSync(join(RAIZ_REPO, ruta)), `falta ${ruta}`).toBe(true));
  });

  it('9. el README es descriptivo: enlace de despliegue, instalación, equipo y ramas', () => {
    const texto = readme();
    expect(texto).toMatch(/https:\/\/saborexpress-react\.netlify\.app/);
    expect(texto).toMatch(/npm install/);
    expect(texto).toMatch(/npm run dev/);
    expect(texto).toMatch(/Integrantes/i);
    expect(texto).toMatch(/rama/i);
  });

  it('2. usa React (framework JS) y el despliegue es una SPA en hosting gratuito', () => {
    const paquete = JSON.parse(leer(join(RAIZ_FRONTEND, 'package.json')));
    expect(paquete.dependencies.react).toBeTruthy();
    expect(paquete.dependencies['react-router-dom']).toBeTruthy();
    expect(leer(join(RAIZ_FRONTEND, 'public', '_redirects'))).toMatch(/\/\*\s+\/index\.html\s+200/);
  });

  it('1. al menos 5 vistas navegables', () => {
    const app = leer(join(RAIZ_FRONTEND, 'src', 'App.jsx'));
    const rutas = [...app.matchAll(/<Route\s+(?:index|path="[^"]+")\s+element=\{<(\w+Page)/g)].map(m => m[1]);
    expect(new Set(rutas).size).toBeGreaterThanOrEqual(5);
  });

  it('2 roles con permisos diferenciados (cliente y administrador)', () => {
    const rutas = leer(join(RAIZ_FRONTEND, 'src', 'components', 'layout', 'RutasProtegidas.jsx'));
    expect(rutas).toMatch(/RutaAdmin/);
    expect(rutas).toMatch(/RutaCliente/);
  });

  it('3. consume una API externa (Nominatim) con tiempo máximo y cancelación', () => {
    const api = leer(join(RAIZ_FRONTEND, 'src', 'services', 'nominatim.js'));
    expect(api).toMatch(/nominatim\.openstreetmap\.org/);
    expect(api).toMatch(/AbortController/);
  });

  it('5. el módulo de reportes usa Chart.js', () => {
    expect(leer(join(RAIZ_FRONTEND, 'src', 'components', 'reportes', 'registrarChart.js'))).toMatch(/chart\.js/);
  });

  it('seguridad: no hay claves de API ni secretos escritos en el código', () => {
    const patrones = [/AIza[0-9A-Za-z_-]{20,}/, /sk-[A-Za-z0-9]{20,}/, /ghp_[A-Za-z0-9]{20,}/, /api[_-]?key\s*[:=]\s*['"][^'"]{8,}/i, /secret\s*[:=]\s*['"][^'"]{8,}/i];
    archivos(join(RAIZ_FRONTEND, 'src'), ['.js', '.jsx']).forEach(ruta => {
      const contenido = leer(ruta);
      patrones.forEach(patron => expect(contenido, `posible secreto en ${ruta}`).not.toMatch(patron));
    });
  });

  it('seguridad: los archivos .env quedan fuera del repositorio', () => {
    expect(leer(join(RAIZ_FRONTEND, '.gitignore'))).toMatch(/^\.env/m);
    expect(existsSync(join(RAIZ_FRONTEND, '.env'))).toBe(false);
  });
});
