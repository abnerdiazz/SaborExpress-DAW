import { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import PasswordMeter from '../components/cuenta/PasswordMeter.jsx';
import FormField from '../components/ui/FormField.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { enfocarPrimerError, useCampo, validarTodos } from '../hooks/useCampo.js';
import { mostrar } from '../services/alertas.js';
import { CORREO_RESERVADO, destinoSeguro } from '../services/auth.js';
import { PRIMER_NOMBRE } from '../services/compra.js';
import { formatearTelefono, reglas } from '../services/validaciones.js';

const ESTILO_FORM = { labelClass: 'form-label-soft d-block', inputClass: 'form-control form-control-soft' };

/** Registro de clientes con validación por campo, formato de teléfono y medidor de contraseña. */
export default function RegistroPage() {
  const { usuarios, registrarUsuario } = useAuth();
  const navegar = useNavigate();
  const { search } = useLocation();
  const [params] = useSearchParams();
  const formulario = useRef(null);

  /** Regla del correo: formato válido, no reservado y no repetido. */
  const reglaCorreoDisponible = valor => {
    const mensaje = reglas.correo(valor);
    if (mensaje) return mensaje;
    const correoTexto = valor.trim().toLowerCase();
    if (correoTexto === CORREO_RESERVADO) return 'Ese correo está reservado. Usa otro.';
    if (usuarios.some(u => u.email === correoTexto)) return 'Ya existe una cuenta con ese correo. Inicia sesión en su lugar.';
    return '';
  };

  const nombre = useCampo(reglas.nombre);
  const correo = useCampo(reglaCorreoDisponible);
  const telefono = useCampo(reglas.telefono, '', { formatear: formatearTelefono });
  const password = useCampo(reglas.passwordNueva);
  const confirmar = useCampo(reglas.coincide(() => password.valor));

  // Si se cambia la contraseña después de repetirla, la confirmación se vuelve a comprobar.
  useEffect(() => {
    if (confirmar.tocado) confirmar.validar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password.valor]);

  async function enviar(evento) {
    evento.preventDefault();
    if (!validarTodos([nombre, correo, telefono, password, confirmar])) {
      enfocarPrimerError(formulario.current);
      return;
    }
    const nuevo = {
      name: nombre.valor.trim(),
      email: correo.valor.trim().toLowerCase(),
      phone: telefono.valor.trim(),
      password: password.valor
    };
    registrarUsuario(nuevo);
    await mostrar({
      icon: 'success',
      title: '¡Cuenta creada!',
      text: `Bienvenido a SaborExpress, ${PRIMER_NOMBRE(nuevo.name)}.`,
      timer: 1600,
      timerProgressBar: true,
      showConfirmButton: false
    });
    navegar(destinoSeguro(params.get('redirect'), 'cliente'), { replace: true });
  }

  return (
    <div className="card login-card p-4 p-md-5" style={{ maxWidth: 420 }}>
      <h1 className="fs-4 fw-bold mb-1">Crear cuenta nueva</h1>
      <p className="text-muted small mb-4">Regístrate para ordenar tus pupusas favoritas calentitas directo a tu domicilio.</p>
      <form ref={formulario} onSubmit={enviar} noValidate>
        <FormField id="registroNombre" label="Nombre Completo" campo={nombre} {...ESTILO_FORM}
          placeholder="Juan Pérez" autoComplete="name" maxLength={60} />
        <FormField id="registroCorreo" label="Correo Electrónico" type="email" campo={correo} {...ESTILO_FORM}
          placeholder="juan.perez@correo.com" autoComplete="email" />
        <FormField id="registroTelefono" label="Teléfono (WhatsApp)" type="tel" campo={telefono} {...ESTILO_FORM}
          placeholder="7777-7777" inputMode="numeric" autoComplete="tel" maxLength={9} />
        <FormField id="registroPassword" label="Contraseña" type="password" campo={password} {...ESTILO_FORM}
          placeholder="Mínimo 8 caracteres, con letras y números" autoComplete="new-password"
          ayuda={<PasswordMeter password={password.valor} />} />
        <FormField id="registroConfirmar" label="Confirmar Contraseña" type="password" campo={confirmar} className="mb-4"
          {...ESTILO_FORM} placeholder="Repetir contraseña" autoComplete="new-password" />
        <button type="submit" className="btn btn-brand w-100">Registrarse</button>
      </form>
      <p className="text-center mt-3 mb-0 small">
        ¿Ya tienes cuenta? <Link to={`/login${search}`} className="login-link">Inicia sesión</Link>
      </p>
    </div>
  );
}
