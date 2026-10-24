import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';
import Swal from 'sweetalert2';
import { beforeEach, vi } from 'vitest';
import { reiniciarMemoria } from '../services/store.js';

// findBy* y waitFor esperan por defecto 1 s; en equipos lentos la primera carga de una página puede tardar más.
configure({ asyncUtilTimeout: 10000 });

// SweetAlert2 se reemplaza por un doble: por defecto "el usuario acepta".
// Si el cuadro trae `preConfirm`, se ejecuta (como haría la librería) y su resultado es el valor.
vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn(),
    showValidationMessage: vi.fn(),
    showLoading: vi.fn(),
    close: vi.fn()
  }
}));

export const aceptarPorDefecto = async (opciones = {}) => {
  if (opciones.preConfirm) {
    const valor = await opciones.preConfirm();
    if (valor === false) return { isConfirmed: false, isDenied: false, isDismissed: true };
    return { isConfirmed: true, isDenied: false, isDismissed: false, value: valor };
  }
  return { isConfirmed: true, isDenied: false, isDismissed: false };
};

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  reiniciarMemoria();
  window.scrollTo = vi.fn();
  Swal.fire.mockReset();
  Swal.fire.mockImplementation(aceptarPorDefecto);
  Swal.showValidationMessage.mockReset();
});
