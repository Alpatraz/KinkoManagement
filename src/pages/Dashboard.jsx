import React, { useEffect, useState, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Plus,
  Layers,
  Activity,
  Clock,
  Filter,
  BarChart3,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/lib/supabaseClient";

export default function Dashboard() {
  // --- Connexion Supabase ---
  function makeClient() {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) {
      console.error("⚠️ Supabase non configuré");
      return null;
    }
    return createClient(url, key);
  }

  const sb = makeClient();
  const configured = !!sb;

  // --- États ---
  const [products, setProducts] = useState([]);
  const [filterStatus, setFilterStatus] = useState("Tous");
  const [filterAuthor, setFilterAuthor] = useState("Tous");

  // --- Chargement des produits ---
  useEffect(() => {
    if (!configured) return;
    (async () => {
      const { data, error } = await sb
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) setProducts(data);
      else console.error("Erreur chargement produits :", error);
    })();
  }, [configured]);

  // --- Helpers ---
  function isImagePath(pathOrName = "") {
    return /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(pathOrName);
  }

  // --- Statistiques globales ---
  const stats = useMemo(() => {
    const total = products.length;
    const prototypes = products.filter((p) => p.status === "Prototype").length;
    const production = products.filter((p) => p.status === "Production").length;
    const commercial = products.filter((p) => p.status === "Commercialisé").length;
    const idee = products.filter((p) => p.status === "Idée").length;
    return { total, prototypes, production, commercial, idee };
  }, [products]);

  // --- Graphique circulaire ---
  const chartData = [
    { name: "Idée", value: stats.idee, color: "#d1d5db" },
    { name: "Prototype", value: stats.prototypes, color: "#fbbf24" },
    { name: "Production", value: stats.production, color: "#3b82f6" },
    { name: "Commercialisé", value: stats.commercial, color: "#10b981" },
  ];

  // --- Calcul de la moyenne de votes ---
  const totalVotes = products.reduce((acc, p) => {
    const votes = Object.values(p.votes || {}).reduce(
      (sum, v) => sum + (v.up || 0) + (v.down || 0),
      0
    );
    return acc + votes;
  }, 0);

  const avgVotes =
    products.length > 0 ? Math.round(totalVotes / products.length) : 0;

  // --- Produits filtrés ---
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchStatus = filterStatus === "Tous" || p.status === filterStatus;
      const matchAuthor = filterAuthor === "Tous" || p.author === filterAuthor;
      return matchStatus && matchAuthor;
    });
  }, [products, filterStatus, filterAuthor]);

  // --- Produits à valider (peu de votes) ---
  const lowVoteProducts = products.filter((p) => {
    const votes = Object.values(p.votes || {}).reduce(
      (sum, v) => sum + (v.up || 0) + (v.down || 0),
      0
    );
    return votes < 2;
  });

  // --- Rendu principal ---
  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-800">
      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
          <Package className="h-6 w-6" />
          <h1 className="font-bold text-lg">Tableau de bord</h1>
          <Badge variant="secondary" className="ml-auto">
            Vue globale
          </Badge>
        </div>
      </header>

      {/* ===== CONTENU ===== */}
      <main className="mx-auto max-w-6xl p-6 grid gap-6">
        {/* ==== Stats rapides ==== */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
          <Card className="p-4 flex flex-col items-center">
            <BarChart3 className="h-6 w-6 text-emerald-500" />
            <div className="text-lg font-bold">{avgVotes}</div>
            <div className="text-slate-500 text-sm">Votes moyens / produit</div>
          </Card>
        </div>

        {/* ==== Graphique circulaire ==== */}
        <Card>
          <CardContent className="p-6 flex flex-col md:flex-row items-center justify-center gap-6">
            <div className="w-full md:w-1/2 h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-sm text-slate-600 space-y-2">
              {chartData.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: d.color }}
                  ></span>
                  <span className="font-medium">{d.name}</span> : {d.value}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ==== Produits à valider ==== */}
        {lowVoteProducts.length > 0 && (
          <Card className="border-amber-300 bg-amber-50">
            <CardContent className="p-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-amber-700 mb-3">
                <ThumbsDown className="h-5 w-5" /> Produits à valider
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {lowVoteProducts.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 border rounded-lg bg-white shadow-sm flex flex-col gap-1"
                  >
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-slate-500">
                      {p.status || "—"} ·{" "}
                      {(Object.values(p.votes || {}).reduce(
                        (sum, v) => sum + (v.up || 0) + (v.down || 0),
                        0
                      ) || 0)}{" "}
                      vote(s)
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ==== Suivi CRM & Médias ==== */}
        <section className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Filter className="h-5 w-5 text-slate-500" /> Suivi CRM et médias
            </h2>
            <div className="flex gap-3">
              <select
                className="border rounded-lg p-2 text-sm bg-white shadow-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="Tous">Tous les statuts</option>
                <option value="Idée">Idée</option>
                <option value="Prototype">Prototype</option>
                <option value="Production">Production</option>
                <option value="Commercialisé">Commercialisé</option>
              </select>
              <select
                className="border rounded-lg p-2 text-sm bg-white shadow-sm"
                value={filterAuthor}
                onChange={(e) => setFilterAuthor(e.target.value)}
              >
                <option value="Tous">Tous les auteurs</option>
                <option value="Guillaume">Guillaume</option>
                <option value="David">David</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((p) => {
              const statusColor =
                {
                  Idée: "bg-gray-200 text-gray-800",
                  Prototype: "bg-yellow-100 text-yellow-800",
                  Production: "bg-blue-100 text-blue-800",
                  Commercialisé: "bg-green-100 text-green-800",
                }[p.status] || "bg-slate-100 text-slate-800";

              const imageCount = (p.files || []).filter((f) =>
                isImagePath(f.path)
              ).length;
              const votesTotal = Object.values(p.votes || {}).reduce(
                (acc, v) => acc + (v.up || 0) + (v.down || 0),
                0
              );

              return (
                <div
                  key={p.id}
                  className="p-4 border rounded-xl bg-white shadow-sm flex flex-col gap-2"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{p.name}</span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${statusColor}`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600">
                    {imageCount} image(s) · {votesTotal} vote(s)
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full mt-1">
                    <div
                      className="h-2 bg-emerald-500 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          (votesTotal / (imageCount * 5 || 1)) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
