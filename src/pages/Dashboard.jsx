import React, { useEffect, useState, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Plus, Layers, Activity, Clock } from "lucide-react";

function makeClient() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error("⚠️ Supabase non configuré");
    return null;
  }
  return createClient(url, key);
}

export default function Dashboard() {
  const supabase = makeClient();
  const configured = !!supabase;

  const [products, setProducts] = useState([]);

  useEffect(() => {
    if (!configured) return;
    (async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) setProducts(data);
    })();
  }, [configured]);

  const stats = useMemo(() => {
    const total = products.length;
    const prototypes = products.filter((p) => p.status === "Prototype").length;
    const production = products.filter((p) => p.status === "Production").length;
    const commercial = products.filter((p) => p.status === "Commercialisé").length;
    return { total, prototypes, production, commercial };
  }, [products]);

  const recent = products.slice(0, 5);

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
          <Package className="h-6 w-6" />
          <h1 className="font-bold text-lg">Tableau de bord</h1>
          <Badge variant="secondary" className="ml-auto">Vue globale</Badge>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-6 grid gap-6">
        {/* ==== Stats rapides ==== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 flex flex-col items-center">
            <Layers className="h-6 w-6 text-blue-500" />
            <div className="text-lg font-bold">{stats.total}</div>
            <div className="text-slate-500 text-sm">Produits totaux</div>
          </Card>
          <Card className="p-4 flex flex-col items-center">
            <Clock className="h-6 w-6 text-amber-500" />
            <div className="text-lg font-bold">{stats.prototypes}</div>
            <div className="text-slate-500 text-sm">Prototypes</div>
          </Card>
          <Card className="p-4 flex flex-col items-center">
            <Activity className="h-6 w-6 text-green-500" />
            <div className="text-lg font-bold">{stats.production}</div>
            <div className="text-slate-500 text-sm">En production</div>
          </Card>
          <Card className="p-4 flex flex-col items-center">
            <Package className="h-6 w-6 text-purple-500" />
            <div className="text-lg font-bold">{stats.commercial}</div>
            <div className="text-slate-500 text-sm">Commercialisés</div>
          </Card>
        </div>

        {/* ==== Derniers produits ==== */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold">Derniers produits ajoutés</h2>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Nouveau produit
              </Button>
            </div>
            <div className="divide-y">
              {recent.length === 0 && (
                <div className="text-slate-500 text-sm">Aucun produit enregistré.</div>
              )}
              {recent.map((p) => (
                <div key={p.id} className="py-2 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-slate-500">{p.code} · {p.version || "—"}</div>
                  </div>
                  <Badge variant="outline">{p.status || "—"}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
