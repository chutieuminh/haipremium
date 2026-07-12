import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import CartDrawer from './CartDrawer';

export default function Layout() {
  return (
    <div className="app-shell">
      <Header />
      <main><Outlet /></main>
      <Footer />
      <CartDrawer />
    </div>
  );
}
