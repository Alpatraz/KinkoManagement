import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { Package } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <Router>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r p-4 space-y-4">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Package className="h-6 w-6" />
            Kinko Manager
          </div>
          <nav className="space-y-2">
            <Link to="/" className="block hover:underline">Tableau de bord</Link>
            <Link to="/products" className="block hover:underline">Produits</Link>
            <Link to="/settings" className="block hover:underline">Paramètres</Link>
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 bg-slate-50">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
