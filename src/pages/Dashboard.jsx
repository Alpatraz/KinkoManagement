import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Package,
  Calendar,
  Clock,
  AlertTriangle,
  Heart,
  ThumbsUp,
  Meh,
  ThumbsDown,
  Skull,
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

  // Chargement des produits depuis Supabase
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

  // Statuts de pipeline (Kanban)
  const statuses = [
    "Idée",
    "Prototype",
    "En attente",
    "Validé",
    "Commandé",
    "Production",
    "Commercialisé",
  ];

  // Drag & Drop du pipeline
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

  // Section Suivi des rappels
  const suivi = products
    .filter((p) => p.reminder_date)
    .sort(
      (a, b) => new Date(a.reminder_date) - new Date(b.reminder_date)
    );

  const handleDone = async (id) => {
    await supabase
      .from("products")
      .update({ reminder_done: true })
      .eq("id", id);
    setProducts(
      products.map((p) =>
        p.id === id ? { ...p, reminder_done: true } : p
      )
    );
  };

  const colorDays = (days) => {
    if (days <= 0) return "bg-red-500 text-white";
    if (days <= 3) return "bg-orange-400 text-white";
    return "bg-green-500 text-white";
  };

  // Indicateurs principaux
  const indicators = [
    {
      label: "Produits totaux",
      icon: Package,
      value: products.length,
    },
    {
      label: "Rappels en attente",
      icon: Calendar,
      value: suivi.filter((p) => !p.reminder_done).length,
    },
    {
      label: "Produits validés unanimement ❤️",
      icon: Heart,
      value: products.filter(
        (p) =>
          p.votes &&
          Object.values(p.votes).every(
            (v) =>
              (v.guillaume === "❤️" && v.david === "❤️") ||
              (v.guillaume === "👍" && v.david === "👍")
          )
      ).length,
    },
    {
      label: "Produits sans votes / photo ⚠️",
      icon: AlertTriangle,
      value: products.filter(
        (p) => !p.votes || !p.files || p.files.length === 0
      ).length,
    },
  ];

  // -------------------------
  // RENDU VISUEL
  // -------------------------
  return (
    <div className="p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen space-y-8">
      {/* HEADER */}
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <LayoutDashboard className="text-blue-600 w-8 h-8" />
            Tableau de bord Kinko
          </h1>
          <p className="text-slate-500">
            Votre cockpit de pilotage — production, rappels et statut global
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
        <h2 className="text-xl font-semibold mb-4">📈 Indicateurs globaux</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {indicators.map((ind, i) => (
            <Card
              key={i}
              className="p-4 flex flex-col items-center border shadow-sm bg-white hover:shadow-md transition"
            >
              <ind.icon className="h-6 w-6 text-blue-500 mb-2" />
              <div className="text-2xl font-bold">{ind.value}</div>
              <div className="text-slate-500 text-sm text-center">
                {ind.label}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* === SECTION 2 : PIPELINE (KANBAN) === */}
      <section>
        <h2 className="text-xl font-semibold mb-4">📦 Pipeline produits</h2>
        <div className="overflow-x-auto">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 min-w-max">
              {statuses.map((status) => (
                <Droppable droppableId={status} key={status}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="bg-white rounded-xl shadow-sm border p-4 w-64 flex flex-col"
                    >
                      <h3 className="font-semibold text-center text-blue-600 mb-3">
                        {status}
                      </h3>
                      {products
                        .filter((p) => p.status === status)
                        .map((p, index) => (
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
                                className="p-3 bg-slate-100 hover:bg-slate-200 border rounded-md mb-2 text-sm cursor-grab transition"
                              >
                                <div className="font-medium">{p.name}</div>
                                {p.reminder_date && (
                                  <div className="text-xs text-slate-500">
                                    ⏰ {new Date(p.reminder_date).toLocaleDateString("fr-FR")}
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
              ))}
            </div>
          </DragDropContext>
        </div>
      </section>

      {/* === SECTION 3 : SUIVI DES RAPPELS === */}
      <section>
        <h2 className="text-xl font-semibold mb-4">⏰ Suivi des rappels</h2>
        <Card className="shadow-sm border bg-white">
          <CardContent className="divide-y">
            {suivi.length === 0 && (
              <p className="text-slate-500 text-sm py-3 text-center">
                Aucun rappel programmé.
              </p>
            )}
            {suivi.map((p) => {
              const daysLeft = differenceInDays(parseISO(p.reminder_date), new Date());
              return (
                <div
                  key={p.id}
                  className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition"
                >
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-slate-500">
                      Rappel prévu le{" "}
                      {new Date(p.reminder_date).toLocaleDateString("fr-FR", {
                        dateStyle: "medium",
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={colorDays(daysLeft)}>
                      {daysLeft} j
                    </Badge>
                    {!p.reminder_done && (
                      <Button
                        size="sm"
                        onClick={() => handleDone(p.id)}
                        className="bg-green-500 hover:bg-green-600"
                      >
                        ✅ Fait
                      </Button>
                    )}
                    {p.reminder_done && (
                      <CheckCircle className="text-green-600 w-5 h-5" />
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
