import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { Package } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Settings from "./pages/Settings";
import logo from "/Kinkotexte_logo.avif"; // ✅ Mets ton fichier dans /public ou /src selon ton setup

export default function App() {
  return (
    <Router>
      {/* === NAVBAR === */}
      <header className="sticky top-0 z-20 bg-white shadow-sm border-b flex items-center justify-between px-6 py-3">
        {/* Bloc gauche */}
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-slate-600" />
          <h1 className="font-bold text-lg">Kinko Manager</h1>
        </div>

        {/* ✅ Logo centré */}
        <div className="flex-1 flex justify-center">
          <img
            src={logo}
            alt="Kinko Logo"
            className="h-8 object-contain"
            style={{ maxHeight: "32px" }}
          />
        </div>

        {/* Menu de droite */}
        <nav className="flex items-center gap-4 text-sm font-medium">
          <NavLink to="/dashboard">Tableau de bord</NavLink>
          <NavLink to="/products">Produits</NavLink>
          <NavLink to="/settings">Paramètres</NavLink>
        </nav>
      </header>

      {/* === MAIN CONTENT === */}
      <main className="min-h-screen bg-slate-50">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </Router>
  );
}

/* === NavLink stylé (gère la page active) === */
function NavLink({ to, children }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      className={`pb-1 ${
        isActive
          ? "text-blue-600 border-b-2 border-blue-600"
          : "hover:text-blue-600 text-slate-600"
      }`}
    >
      {children}
    </Link>
  );
}
