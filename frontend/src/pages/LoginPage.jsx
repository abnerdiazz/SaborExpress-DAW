import { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import FormField from '../components/ui/FormField.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { enfocarPrimerError, useCampo, validarTodos } from '../hooks/useCampo.js';
import { BLOQUEO_SEGUNDOS, MAX_INTENTOS, useLoginAttempts } from '../hooks/useLoginAttempts.js';
import { aviso, confirmar, toast } from '../services/alertas.js';
import { ADMIN_DEMO, destinoSeguro, vieneDeUnPanel } from '../services/auth.js';
import { PRIMER_NOMBRE } from '../services/compra.js';
import { reglas } from '../services/validaciones.js';

/** Inicio de sesión de clientes y del administrador (cuenta de demostración). */
export default function LoginPage() {
  const { sesion, usuarios, iniciarSesion } = useAuth();
  const navegar = useNavigate();
  const { search } = useLocation();
  const [params] = useSearchParams();
  const redirect = params.get('redirect');
  const intentos = useLoginAttempts();
  const formulario = useRef(null);

  const correo = useCampo(reglas.correo);
  const password = useCampo(reglas.passwordLogin);

  // Un cliente con sesión no necesita ver el login, salvo que venga de un panel de administración
  // (así puede entrar como admin sin cerrar la sesión de cliente).
  useEffect(() => {
    if (sesion && !vieneDeUnPanel(redirect)) navegar(destinoSeguro(redirect, 'cliente'), { replace: true });
    // Solo al abrir la página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function entrar(usuario) {
    intentos.limpiar();
    iniciarSesion(usuario);
    toast(`¡Bienvenido, ${PRIMER_NOMBRE(usuario.name)}!`, 'success', 1500);
    navegar(destinoSeguro(redirect, usuario.role), { replace: true });
  }

  async function enviar(evento) {
    evento.preventDefault();

    const restante = intentos.segundosDeBloqueo();
    if (restante > 0) {
      await aviso('Demasiados intentos', `Por seguridad, espera ${restante} segundos antes de volver a intentar.`);
      return;
    }

    if (!validarTodos([correo, password])) {
      enfocarPrimerError(formulario.current);
      return;
    }

    const correoTexto = correo.valor.trim().toLowerCase();

    if (correoTexto === ADMIN_DEMO.email && password.valor === ADMIN_DEMO.password) {
      entrar(ADMIN_DEMO);
      return;
    }

    const usuario = usuarios.find(u => u.email === correoTexto);
    if (!usuario) {
      const crear = await confirmar({
        titulo: 'No encontramos tu cuenta',
        texto: 'No existe una cuenta con ese correo. ¿Quieres crearla ahora?',
        icon: 'info',
        confirmText: 'Crear cuenta',
        cancelText: 'Reintentar'
      });
      if (crear) navegar(`/registro${search}`);
      return;
    }

    if (usuario.password !== password.valor) {
      const { quedan, bloqueado } = intentos.registrarFallo();
      password.mostrarError(bloqueado ? 'Contraseña incorrecta.' : `Contraseña incorrecta. Te quedan ${quedan} intento(s).`);
      if (bloqueado) {
        await aviso('Formulario bloqueado', `Superaste ${MAX_INTENTOS} intentos. Espera ${BLOQUEO_SEGUNDOS} segundos.`);
      }
      return;
    }

    entrar({ name: usuario.name, email: usuario.email, role: 'cliente' });
  }

  return (
    <div className="card login-card shadow-sm p-4 p-md-5">
      <div className="text-center mb-4">
        <div className="login-logo"><img src="/img/logo.png" alt="SaborExpress" /></div>
        <h1 className="fs-4 fw-bold mb-1">SaborExpress</h1>
        <p className="text-muted small mb-0">Las mejores pupusas de El Salvador</p>
      </div>
      <form ref={formulario} onSubmit={enviar} noValidate>
        <FormField
          id="loginCorreo" label="Correo Electrónico" type="email" campo={correo}
          labelClass="form-label-soft d-block" inputClass="form-control form-control-soft"
          placeholder="ejemplo@correo.com" autoComplete="username"
        />
        <FormField
          id="loginPassword" label="Contraseña" type="password" campo={password} className="mb-4"
          labelClass="form-label-soft d-block" inputClass="form-control form-control-soft"
          placeholder="••••••••" autoComplete="current-password"
        />
        <button type="submit" className="btn btn-brand w-100">Iniciar sesión</button>
      </form>
      <p className="text-center mt-3 mb-0 small">
        ¿No tienes cuenta? <Link to={`/registro${search}`} className="login-link">Crear cuenta</Link>
      </p>
    </div>
  );
}
