import { describe, expect, it, vi } from 'vitest';
import { escribirJSON, instantanea, leerJSON, suscribir } from '../services/store.js';
import { esc, money, rutaImg, subtotalDe, totalUnidades } from '../services/compra.js';
import { PRODUCTOS_INICIALES, describirCambios, sincronizarCarrito } from '../services/catalogo.js';
import { agregarPedido, cambiarEstadoPedido, claveFiltroEstado, prepararPedidos } from '../services/pedidos.js';
import { destinoSeguro, sesionConRol, vieneDeUnPanel } from '../services/auth.js';
import { evaluarPassword, formatearTelefono, reglas } from '../services/validaciones.js';

describe('store: almacenamiento reactivo', () => {
  it('lee con respaldo cuando falta o está dañado', () => {
    expect(leerJSON('x', 5)).toBe(5);
    window.localStorage.setItem('x', '{roto');
    expect(leerJSON('x', 7)).toBe(7);
  });

  it('la instantánea devuelve el mismo objeto mientras el texto guardado no cambia', () => {
    escribirJSON('lista', [1, 2]);
    const a = instantanea('lista', []);
    const b = instantanea('lista', []);
    expect(a).toBe(b);
    escribirJSON('lista', [1, 2, 3]);
    expect(instantanea('lista', [])).not.toBe(a);
  });

  it('avisa a los suscritos al escribir y cuando otra pestaña dispara el evento storage', () => {
    const oyente = vi.fn();
    const cancelar = suscribir('clave', oyente);
    escribirJSON('clave', 1);
    expect(oyente).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new StorageEvent('storage', { key: 'clave' }));
    expect(oyente).toHaveBeenCalledTimes(2);
    window.dispatchEvent(new StorageEvent('storage', { key: 'otra' }));
    expect(oyente).toHaveBeenCalledTimes(2);
    cancelar();
    escribirJSON('clave', 2);
    expect(oyente).toHaveBeenCalledTimes(2);
  });
});

describe('validaciones', () => {
  it('nombre, correo y teléfono', () => {
    expect(reglas.nombre('')).toMatch(/nombre completo/);
    expect(reglas.nombre('A1')).toMatch(/solo letras/);
    expect(reglas.nombre('Ana Martínez')).toBe('');
    expect(reglas.correo('ana@correo')).toMatch(/válido/);
    expect(reglas.correo('ana@correo.com')).toBe('');
    expect(reglas.telefono('1234')).toMatch(/8 dígitos/);
    expect(reglas.telefono('7890-1234')).toBe('');
    expect(reglas.telefonoOpcional('')).toBe('');
    expect(reglas.telefonoOpcional('12')).not.toBe('');
  });

  it('formatea el teléfono y quita el prefijo del país solo cuando sobran dígitos', () => {
    expect(formatearTelefono('78901234')).toBe('7890-1234');
    expect(formatearTelefono('+503 7890 1234')).toBe('7890-1234');
    expect(formatearTelefono('50312345678')).toBe('1234-5678');
    expect(formatearTelefono('5031')).toBe('5031');
  });

  it('contraseña: mínimo 8 con letra y número, y puntaje del medidor', () => {
    expect(reglas.passwordNueva('abc')).not.toBe('');
    expect(reglas.passwordNueva('abcdefgh')).not.toBe('');
    expect(reglas.passwordNueva('abc12345')).toBe('');
    expect(evaluarPassword('abc12345').etiqueta).toBe('Aceptable');
    expect(evaluarPassword('Abc12345!xyz').puntaje).toBe(4);
    expect(reglas.coincide(() => 'abc12345')('abc12345')).toBe('');
    expect(reglas.coincide(() => 'abc12345')('otra')).toMatch(/no coinciden/);
  });

  it('texto y precio', () => {
    expect(reglas.texto('el asunto', 5, 10)('abc')).toMatch(/al menos 5/);
    expect(reglas.texto('el asunto', 5, 10)('a'.repeat(11))).toMatch(/Máximo 10/);
    expect(reglas.textoOpcional(3)('abcd')).toMatch(/Máximo 3/);
    expect(reglas.precio('')).toMatch(/válido/);
    expect(reglas.precio('0')).toMatch(/mayor que 0/);
    expect(reglas.precio('100')).toMatch(/máximo/);
    expect(reglas.precio('1.25')).toBe('');
  });
});

describe('compra y catálogo', () => {
  it('dinero, escape de HTML, subtotal, unidades y rutas de imagen', () => {
    expect(money(1.5)).toBe('$1.50');
    expect(esc('<b>"x"</b>')).toBe('&lt;b&gt;&quot;x&quot;&lt;/b&gt;');
    const carrito = [{ precio: 0.85, cantidad: 2 }, { precio: 1, cantidad: 3 }];
    expect(subtotalDe(carrito)).toBeCloseTo(4.7);
    expect(totalUnidades(carrito)).toBe(5);
    expect(rutaImg('img/menú/a.png')).toBe('/img/menú/a.png');
    expect(rutaImg('/img/a.png')).toBe('/img/a.png');
    expect(rutaImg('https://x.com/a.png')).toBe('https://x.com/a.png');
  });

  it('sincroniza el carrito: quita lo retirado y actualiza precios', () => {
    const activos = PRODUCTOS_INICIALES.filter(p => p.id !== 'pup-loca').map(p => (p.id === 'pup-queso' ? { ...p, precio: 0.95 } : p));
    const carrito = [
      { productoId: 'pup-loca', nombre: 'Pupusa Loca', precio: 1.5, cantidad: 1 },
      { productoId: 'pup-queso', nombre: 'Pupusa de Queso', precio: 0.8, cantidad: 2 },
      { productoId: 'pup-revuelta', nombre: 'Pupusa Revuelta', precio: 0.85, cantidad: 1 }
    ];
    const r = sincronizarCarrito(carrito, activos);
    expect(r.retirados).toEqual(['Pupusa Loca']);
    expect(r.actualizados).toEqual(['Pupusa de Queso']);
    expect(r.carrito).toHaveLength(2);
    expect(r.carrito.find(i => i.productoId === 'pup-queso').precio).toBe(0.95);
    expect(describirCambios(r)).toMatch(/Ya no están disponibles.*Cambió el precio/);
    expect(sincronizarCarrito(r.carrito, activos).cambio).toBe(false);
  });
});

describe('pedidos', () => {
  it('numera los pedidos, cambia estados y rechaza ids inexistentes', () => {
    const a = agregarPedido([], { cliente: 'A' });
    expect(a.pedido.id).toBe('SE-0001');
    expect(a.pedido.estado).toBe('Pendiente');
    const b = agregarPedido(a.lista, { cliente: 'B' });
    expect(b.pedido.id).toBe('SE-0002');
    expect(cambiarEstadoPedido(b.lista, 'SE-0001', 'Entregado').find(p => p.id === 'SE-0001').estado).toBe('Entregado');
    expect(cambiarEstadoPedido(b.lista, 'SE-9999', 'Entregado')).toBeNull();
  });

  it('prepara la lista: ordena por fecha y descarta los DEMO- heredados', () => {
    const lista = prepararPedidos([
      { id: 'SE-0001', creadoEn: '2026-01-01T10:00:00Z', items: [] },
      { id: 'DEMO-1', creadoEn: '2026-01-03T10:00:00Z', items: [] },
      { id: 'SE-0002', creadoEn: '2026-01-02T10:00:00Z', items: [] }
    ]);
    expect(lista.map(p => p.id)).toEqual(['SE-0002', 'SE-0001']);
    expect(lista[0].creadoEn).toBeInstanceOf(Date);
    expect(prepararPedidos('roto')).toEqual([]);
  });

  it('agrupa los estados en los filtros del panel', () => {
    expect(claveFiltroEstado('En camino')).toBe('preparando');
    expect(claveFiltroEstado('Entregado')).toBe('entregado');
    expect(claveFiltroEstado('Cancelado')).toBe('cancelado');
    expect(claveFiltroEstado('Pendiente')).toBe('pendiente');
  });
});

describe('autenticación', () => {
  it('solo acepta la sesión con el rol esperado', () => {
    expect(sesionConRol({ role: 'admin' }, 'cliente')).toBeNull();
    expect(sesionConRol({ role: 'cliente' }, 'cliente')).toEqual({ role: 'cliente' });
    expect(sesionConRol(null, 'admin')).toBeNull();
  });

  it('el destino tras iniciar sesión solo puede ser una ruta interna del rol correcto', () => {
    expect(destinoSeguro('/menu', 'cliente')).toBe('/menu');
    expect(destinoSeguro('/admin/pedidos', 'cliente')).toBe('/mis-pedidos');
    expect(destinoSeguro('//evil.com', 'cliente')).toBe('/mis-pedidos');
    expect(destinoSeguro('https://evil.com', 'cliente')).toBe('/mis-pedidos');
    expect(destinoSeguro('/admin/menu', 'admin')).toBe('/admin/menu');
    expect(destinoSeguro('/menu', 'admin')).toBe('/admin/reportes');
    expect(vieneDeUnPanel('/admin/pedidos')).toBe(true);
    expect(vieneDeUnPanel('/menu')).toBe(false);
  });
});
