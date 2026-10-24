import { Link } from 'react-router-dom';
import EmptyState from '../components/ui/EmptyState.jsx';

export default function NotFoundPage() {
  return (
    <div className="container py-5">
      <EmptyState icono="bi-compass" titulo="No encontramos esa página" texto="La dirección no existe o fue movida.">
        <Link to="/" className="btn btn-brand mt-4">Volver al inicio</Link>
      </EmptyState>
    </div>
  );
}
