import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Package,
  Calendar,
  AlertTriangle,
  Layers,
  Workflow,
  Tag,
  Clock,
  LayoutDashboard,
  CheckCircle,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import differenceInDays from "date-fns/differenceInDays";
import parseISO from "date-fns/parseISO";

// -------------------------
// DASHBOARD PRINCIPAL
// -------------------------
export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const navigate = useNavigate();

  // Chargement des produits
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) console.error(error);
      else setProducts(data || []);
    }
    load();
  }, []);

  // Statuts du pipeline
  const statuses = [
    "Idée",
    "Prototype",
    "En attente",
    "Validé",
    "Commandé",
    "Production",
    "Commercialisé",
  ];

  // Gestion du Drag & Drop
  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;

    if (source.droppableId !== destination.droppableId) {
      const updated = products.map((p) =>
        p.id === draggableId ? { ...p, status: destination.droppableId } : p
      );
      setProducts(updated);
      await supabase
        .from("products")
        .update({ status: destination.droppableId })
        .eq("id", draggableId);
    }
  };

  // -------- LOGIQUE D’ANALYSE --------

  // Comptages par type
  const countByType = {
    "3D": products.filter((p) => p.kind === "3d").length,
    Commandé: products.filter((p) => p.kind === "ordered").length,
  };

  // Comptage des statuts pipeline
  const countByStatus = statuses.map((s) => ({
    name: s,
    total: products.filter((p) => p.status === s).length,
  }));

  // Tags uniques
  const allTags = [
    ...new Set(products.flatMap((p) => p.tags || [])),
  ].filter(Boolean);

  // Rappels
  const now = new Date();
  const upcomingReminders = products.filter((p) => {
    if (!p.followup_at) return false;
    const days = differenceInDays(parseISO(p.followup_at), now);
    return days >= 0 && days <= 7 && !p.reminder_done;
  });

  const overdueReminders = products.filter((p) => {
    if (!p.followup_at) return false;
    const days = differenceInDays(parseISO(p.followup_at), now);
    return days < 0 && !p.reminder_done;
  });

  const futureReminders = products.filter((p) => {
    if (!p.followup_at) return false;
    const days = differenceInDays(parseISO(p.followup_at), now);
    return days > 7 && !p.reminder_done;
  });

  // Fonction de couleur pour badges
  const colorDays = (days) => {
    if (days < 0) return "bg-red-500 text-white";
    if (days <= 3) return "bg-orange-400 text-white";
    return "bg-green-500 text-white";
  };

  // -------- RENDU --------
  return (
    <div className="p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen space-y-10">
      {/* HEADER */}
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <LayoutDashboard className="text-blue-600 w-8 h-8" />
            Tableau de bord Kinko
          </h1>
          <p className="text-slate-500">
            Un vrai cockpit pour suivre vos produits, rappels et statuts
          </p>
        </div>
        <Button
          onClick={() => window.location.reload()}
          className="bg-blue-600 hover:bg-blue-700"
        >
          🔄 Actualiser
        </Button>
      </header>

      {/* === SECTION 1 : INDICATEURS === */}
      <section>
        <h2 className="text-xl font-semibold mb-3">📈 Vue d’ensemble</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="flex flex-col items-center p-4 text-center shadow-sm">
            <Package className="text-blue-500 mb-2" />
            <div className="text-2xl font-bold">{products.length}</div>
            <div className="text-slate-500 text-sm">Produits totaux</div>
          </Card>

          <Card className="flex flex-col items-center p-4 text-center shadow-sm">
            <Layers className="text-blue-500 mb-2" />
            <div className="text-lg font-bold">
              {countByType["3D"]} / {countByType["Commandé"]}
            </div>
            <div className="text-slate-500 text-sm">3D / Commandés</div>
          </Card>

          <Card className="flex flex-col items-center p-4 text-center shadow-sm">
            <Workflow className="text-blue-500 mb-2" />
            <div className="text-lg font-bold">
              {countByStatus.filter((s) => s.total > 0).length}
            </div>
            <div className="text-slate-500 text-sm">
              Statuts actifs pipeline
            </div>
          </Card>

          <Card className="flex flex-col items-center p-4 text-center shadow-sm">
            <Tag className="text-blue-500 mb-2" />
            <div className="text-lg font-bold">{allTags.length}</div>
            <div className="text-slate-500 text-sm">Tags uniques</div>
          </Card>

          <Card className="flex flex-col items-center p-4 text-center shadow-sm">
            <Clock className="text-blue-500 mb-2" />
            <div className="text-lg font-bold">{upcomingReminders.length}</div>
            <div className="text-slate-500 text-sm">Rappels 7j à venir</div>
          </Card>

          <Card className="flex flex-col items-center p-4 text-center shadow-sm">
            <AlertTriangle className="text-red-500 mb-2" />
            <div className="text-lg font-bold">{overdueReminders.length}</div>
            <div className="text-slate-500 text-sm">Rappels en retard</div>
          </Card>
        </div>
      </section>

      {/* === SECTION 2 : PIPELINE PRODUITS === */}
      <section>
        <h2 className="text-xl font-semibold mb-4">📦 Pipeline produits</h2>
        <div className="overflow-x-auto">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 min-w-max">
              {statuses.map((status) => {
                const prods = products.filter((p) => p.status === status);
                return (
                  <Droppable droppableId={status} key={status}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="bg-white rounded-xl shadow-sm border p-4 w-64 flex flex-col"
                      >
                        <h3 className="font-semibold text-center text-blue-600 mb-2">
                          {status}{" "}
                          <span className="text-slate-500 text-sm">
                            ({prods.length})
                          </span>
                        </h3>
                        {prods.map((p, index) => (
                          <Draggable
                            key={p.id}
                            draggableId={p.id}
                            index={index}
                          >
                            {(prov) => (
                              <div
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                {...prov.dragHandleProps}
                                onClick={() =>
                                  navigate(`/products?id=${p.id}`)
                                }
                                className="p-3 bg-slate-100 hover:bg-blue-100 border rounded-md mb-2 text-sm cursor-pointer transition"
                              >
                                <div className="font-medium">{p.name}</div>
                                {p.folder && (
                                  <div className="text-xs text-slate-500">
                                    📁 {p.folder}
                                  </div>
                                )}
                                {Array.isArray(p.tags) && p.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {p.tags.slice(0, 2).map((t) => (
                                      <Badge
                                        key={t}
                                        variant="outline"
                                        className="text-[10px]"
                                      >
                                        {t}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </DragDropContext>
        </div>
      </section>

      {/* === SECTION 3 : RAPPELS === */}
      <section>
        <h2 className="text-xl font-semibold mb-3">⏰ Suivi des rappels</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {/* En retard */}
          <Card className="border bg-white shadow-sm">
            <CardContent className="p-3">
              <h3 className="font-semibold text-red-600 mb-2">
                🔴 En retard ({overdueReminders.length})
              </h3>
              {overdueReminders.length === 0 && (
                <p className="text-xs text-slate-400">Aucun rappel en retard</p>
              )}
              {overdueReminders.map((p) => (
                <div key={p.id} className="border-t py-1 text-sm">
                  <div
                    onClick={() => navigate(`/products?id=${p.id}`)}
                    className="cursor-pointer hover:underline"
                  >
                    {p.name}
                  </div>
                  <Badge className="bg-red-500 text-white mt-1">
                    {differenceInDays(parseISO(p.followup_at), now)} j
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Bientôt */}
          <Card className="border bg-white shadow-sm">
            <CardContent className="p-3">
              <h3 className="font-semibold text-orange-600 mb-2">
                🟠 Cette semaine ({upcomingReminders.length})
              </h3>
              {upcomingReminders.length === 0 && (
                <p className="text-xs text-slate-400">Aucun rappel proche</p>
              )}
              {upcomingReminders.map((p) => (
                <div key={p.id} className="border-t py-1 text-sm">
                  <div
                    onClick={() => navigate(`/products?id=${p.id}`)}
                    className="cursor-pointer hover:underline"
                  >
                    {p.name}
                  </div>
                  <Badge className={colorDays(
                    differenceInDays(parseISO(p.followup_at), now)
                  )}>
                    {differenceInDays(parseISO(p.followup_at), now)} j
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Plus tard */}
          <Card className="border bg-white shadow-sm">
            <CardContent className="p-3">
              <h3 className="font-semibold text-green-600 mb-2">
                🟢 À venir ({futureReminders.length})
              </h3>
              {futureReminders.length === 0 && (
                <p className="text-xs text-slate-400">Aucun rappel prévu</p>
              )}
              {futureReminders.map((p) => (
                <div key={p.id} className="border-t py-1 text-sm">
                  <div
                    onClick={() => navigate(`/products?id=${p.id}`)}
                    className="cursor-pointer hover:underline"
                  >
                    {p.name}
                  </div>
                  <Badge className="bg-green-500 text-white mt-1">
                    {differenceInDays(parseISO(p.followup_at), now)} j
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
