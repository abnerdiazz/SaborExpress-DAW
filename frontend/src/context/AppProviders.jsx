import { AuthProvider } from './AuthContext.jsx';
import { CatalogProvider } from './CatalogContext.jsx';
import { CartProvider } from './CartContext.jsx';
import { OrdersProvider } from './OrdersContext.jsx';

/** Reúne todos los proveedores de estado global en un solo lugar. */
export default function AppProviders({ children }) {
  return (
    <AuthProvider>
      <CatalogProvider>
        <CartProvider>
          <OrdersProvider>{children}</OrdersProvider>
        </CartProvider>
      </CatalogProvider>
    </AuthProvider>
  );
}
