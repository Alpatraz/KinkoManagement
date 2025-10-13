import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Save, Trash2, Package, Printer, DollarSign, Filter, Upload, PencilLine,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import ImageGenerator from "@/components/ui/ImageGenerator";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";


/* ========= SUPABASE CLIENT ========= */
function makeClient() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error("Supabase URL ou Anon Key manquante ⚠️");
    return null;
  }
  return createClient(url, key);
}

/* ========= COMPOSANT PRINCIPAL ========= */
export default function Products() {
  // ✅ États généraux
  const [author, setAuthor] = useState("");
  const [pipelineStatus, setPipelineStatus] = useState("Attente validation interne");
  const [followupAt, setFollowupAt] = useState("");
  const [images, setImages] = useState([]);
  const [votes, setVotes] = useState({});

    // ✅ États principaux du produit
    const [status, setStatus] = useState("Prototype");
    const [name, setName] = useState("");
    const [sku, setSku] = useState("");
    const [kind, setKind] = useState("3d");
    const [version, setVersion] = useState("V1");
    const [desc, setDesc] = useState("");
    const [folder, setFolder] = useState("");
    const [tagsText, setTagsText] = useState("");
    const [weight, setWeight] = useState(0);
    const [dimensions, setDimensions] = useState("");
    const [colors, setColors] = useState(["Noir"]);
    const [drawerProduct, setDrawerProduct] = useState(null);
  
    // ✅ États prix et calculs
    const [margin, setMargin] = useState(0.45);
    const [resellerDiscount, setResellerDiscount] = useState(0.30);
    const [retailPrice, setRetailPrice] = useState(0);
    const [resellerPrice, setResellerPrice] = useState(0);
  
    // ✅ États liés à la liste / filtrage
    const [items, setItems] = useState([]);
    const [filterKind, setFilterKind] = useState("all");
    const [q, setQ] = useState("");
  
    // ✅ États pour édition / messages / fichiers
    const [editingId, setEditingId] = useState(null);
    const [pendingFiles, setPendingFiles] = useState([]);
    const [baseOnId, setBaseOnId] = useState("");
    const [msg, setMsg] = useState("");
    const [configured, setConfigured] = useState(true); // à adapter si tu veux tester sans Supabase
  

  // ✅ États spécifiques aux coûts / commandes
  const [threeD, setThreeD] = useState({
    gramsUsed: 120,
    spoolCostPerKg: 25,
    printHours: 3,
    machineRate: 2,
    laborRate: 0,
    energyKwh: 0,
  });

  const [ordered, setOrdered] = useState({
    supplier: "",
    supplierContact: "",
    unitCost: 20,
    importPerUnit: 2.5,
    customizationCost: 0,
    moq: 0,
    leadTime: "",
  });

  /* ========= CONSTANTES / HELPERS ========= */
  const code = sku || autoCode({ name, kind });
  const DEFAULT_MARGIN = 0.45;
  const DEFAULT_RESELLER_DISCOUNT = 0.30;
  const ELECTRICITY_RATE = 0.12;

  const presets = {
    colors: ["Noir", "Blanc", "Rouge", "Bleu", "Vert", "Gris", "Or", "Argent"],
    filament: ["PLA", "PETG", "ABS", "TPU"],
    statuses: ["Idée", "Prototype", "Production", "Commercialisé"],
  };

  const empty3D = {
    filamentType: "PLA",
    color: "Noir",
    gramsUsed: 120,
    spoolCostPerKg: 25,
    printHours: 3,
    machineRate: 2,
    laborRate: 0,
    energyKwh: 0,
  };

  const emptyOrdered = {
    supplier: "",
    supplierContact: "",
    unitCost: 20,
    importPerUnit: 2.5,
    customizationCost: 0,
    moq: 0,
    leadTime: "",
  };

  /* ========= FONCTIONS UTILITAIRES ========= */
  function currency(n) {
    if (Number.isNaN(+n)) return "-";
    return new Intl.NumberFormat("fr-CA", {
      style: "currency",
      currency: "CAD",
    }).format(+n);
  }

  function slugify(s) {
    return (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function today() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}${m}${day}`;
  }

  function autoCode({ name, kind }) {
    const base = slugify(name || "produit");
    const t = kind === "3d" ? "3D" : "ORD";
    return `${t}_${base}_${today()}`.toUpperCase();
  }

  function nextVersionForCode(items, code) {
    const vers = (items || [])
      .filter((p) => p.code === code && typeof p.version === "string")
      .map((p) => {
        const m = (p.version || "").match(/^V(\d+)$/i);
        return m ? parseInt(m[1], 10) : 0;
      });
    const maxV = vers.length ? Math.max(...vers) : 0;
    return `V${maxV + 1}`;
  }

  function isImagePath(pathOrName = "") {
    return /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(pathOrName);
  }

  /* ======= Calcul du coût 3D ======= */
  const cost3D = useMemo(() => {
    const material = (threeD.gramsUsed / 1000) * threeD.spoolCostPerKg;
    const timeCost = threeD.printHours * (threeD.machineRate + threeD.laborRate);
    const energy = (threeD.energyKwh || 0) * ELECTRICITY_RATE;
    return Math.max(0, material + timeCost + energy);
  }, [threeD]);

  const costOrdered = useMemo(() => {
    return Math.max(0, ordered.unitCost + ordered.importPerUnit + ordered.customizationCost);
  }, [ordered]);

  const cost = kind === "3d" ? cost3D : costOrdered;

  /* ======= Chargement initial ======= */
  useEffect(() => {
    if (!configured) return;
    (async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) setItems(data);
    })();
  }, [configured]);

  /* ======= Options dynamiques (dossiers/tags) ======= */
  const existingFolders = useMemo(() => {
    const set = new Set((items || []).map((it) => it.folder).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const existingTags = useMemo(() => {
    const set = new Set();
    (items || []).forEach((it) => (it.tags || []).forEach((t) => set.add(t)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  /* ======= Helpers ======= */
  function toTagsArray(txt) {
    return (txt || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }

  function getPublicUrl(path) {
    if (!configured || !path) return "#";
    const { data } = supabase.storage.from("product_file").getPublicUrl(path);
    return data?.publicUrl || "#";
  }

  function resetForm() {
    setEditingId(null);
    setKind("3d");
    setStatus("Prototype");
    setName("");
    setSku("");
    setVersion("V1");
    setDesc("");
    setWeight(0);
    setDimensions("");
    setColors(["Noir"]);
    setFolder("");
    setTagsText("");
    setAuthor(""); // 🆕 reset par défaut
    setThreeD({ ...empty3D });
    setOrdered({ ...emptyOrdered });
    setMargin(DEFAULT_MARGIN);
    setResellerDiscount(DEFAULT_RESELLER_DISCOUNT);
    setRetailPrice(0);
    setResellerPrice(0);
    setPendingFiles([]);
    setBaseOnId("");
    setMsg("");
    setAuthor("");
setPipelineStatus("Attente validation interne");
setFollowupAt("");
setImages([]);
setVotes({});

  }

  function startEdit(it) {
    setEditingId(it.id);
    setKind(it.kind);
    setStatus(it.status || "Prototype");
    setName(it.name || "");
    setSku(it.code || "");
    setVersion(it.version || "V1");
    setDesc(it.description || "");
    setWeight((it.specs?.weight ?? 0) || 0);
    setDimensions(it.specs?.dimensions || "");
    setColors(it.specs?.colors || ["Noir"]);
    setFolder(it.folder || "");
    setTagsText((it.tags || []).join(", "));
    setAuthor(it.author || "");
setPipelineStatus(it.pipeline_status || "Attente validation interne");
setFollowupAt(it.followup_at ? it.followup_at.split("T")[0] : "");


    if (it.kind === "3d") {
      setThreeD({
        filamentType: it.build?.filamentType ?? "PLA",
        color: it.build?.color ?? "Noir",
        gramsUsed: it.build?.gramsUsed ?? 120,
        spoolCostPerKg: it.build?.spoolCostPerKg ?? 25,
        printHours: it.build?.printHours ?? 3,
        machineRate: it.build?.machineRate ?? 2,
        laborRate: it.build?.laborRate ?? 0,
        energyKwh: it.build?.energyKwh ?? 0,
      });
      setOrdered({ ...emptyOrdered });
    } else {
      setOrdered({
        supplier: it.build?.supplier ?? "",
        supplierContact: it.build?.supplierContact ?? "",
        unitCost: it.build?.unitCost ?? 0,
        importPerUnit: it.build?.importPerUnit ?? 0,
        customizationCost: it.build?.customizationCost ?? 0,
        moq: it.build?.moq ?? 0,
        leadTime: it.build?.leadTime ?? "",
      });
      setThreeD({ ...empty3D });
    }

    setMargin(it.pricing?.margin ?? DEFAULT_MARGIN);
    setResellerDiscount(it.pricing?.resellerDiscount ?? DEFAULT_RESELLER_DISCOUNT);
    setRetailPrice(it.pricing?.retail ?? 0);
    setResellerPrice(it.pricing?.reseller ?? 0);
    setBaseOnId("");
    setMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ======= Clonage depuis produit existant ======= */
  function cloneFromProduct(productId) {
    const src = items.find((p) => p.id === productId);
    if (!src) return;
    // On ne bascule PAS en mode "édition" : on prépare une NOUVELLE entrée
    setEditingId(null);
    setKind(src.kind);
    setStatus(src.status || "Prototype");
    setName(src.name || "");
    setSku(src.code || "");
    // Propose la prochaine version à partir du code
    const nextV = nextVersionForCode(items, src.code || "");
    setVersion(nextV || "V1");
    setDesc(src.description || "");
    setWeight((src.specs?.weight ?? 0) || 0);
    setDimensions(src.specs?.dimensions || "");
    setColors(src.specs?.colors || ["Noir"]);
    setFolder(src.folder || "");
    setTagsText((src.tags || []).join(", "));
    setAuthor(""); // 🆕 on force la sélection à refaire
    if (src.kind === "3d") {
      setThreeD({
        filamentType: src.build?.filamentType ?? "PLA",
        color: src.build?.color ?? "Noir",
        gramsUsed: src.build?.gramsUsed ?? 120,
        spoolCostPerKg: src.build?.spoolCostPerKg ?? 25,
        printHours: src.build?.printHours ?? 3,
        machineRate: src.build?.machineRate ?? 2,
        laborRate: src.build?.laborRate ?? 0,
        energyKwh: src.build?.energyKwh ?? 0,
      });
      setOrdered({ ...emptyOrdered });
    } else {
      setOrdered({
        supplier: src.build?.supplier ?? "",
        supplierContact: src.build?.supplierContact ?? "",
        unitCost: src.build?.unitCost ?? 0,
        importPerUnit: src.build?.importPerUnit ?? 0,
        customizationCost: src.build?.customizationCost ?? 0,
        moq: src.build?.moq ?? 0,
        leadTime: src.build?.leadTime ?? "",
      });
      setThreeD({ ...empty3D });
    }
    setMargin(src.pricing?.margin ?? DEFAULT_MARGIN);
    setResellerDiscount(src.pricing?.resellerDiscount ?? DEFAULT_RESELLER_DISCOUNT);
    setRetailPrice(src.pricing?.retail ?? 0);
    setResellerPrice(src.pricing?.reseller ?? 0);
    setPendingFiles([]); // on ne clone pas les fichiers
    setMsg("Pré-rempli depuis le produit sélectionné. Pense à ajuster le code/nom si besoin.");
  }

  /* ======= Upload fichiers ======= */
  async function uploadFiles(productId) {
    if (!configured || pendingFiles.length === 0) return [];
  
    const bucket = supabase.storage.from("product_file");
    const uploaded = [];
  
    for (const f of pendingFiles) {
      const path = `${productId}/${Date.now()}_${f.name}`;
      const { data, error } = await bucket.upload(path, f, { upsert: false });
      if (error) {
        console.error("Erreur upload Supabase:", error.message);
      } else {
        uploaded.push({
          name: f.name,
          path,
          size: f.size || 0,
          type: f.type || "unknown",
        });
      }
    }
  
    return uploaded;
  }
  
  // 🆕 Nouvelle fonction : suppression d’un fichier
  async function deleteFile(productId, filePath) {
    if (!configured) return;
    const bucket = supabase.storage.from("product_file");
    const { error } = await bucket.remove([filePath]);
    if (error) console.error("Erreur suppression fichier:", error.message);
  }
  
  

  /* ======= Enregistrer / mettre à jour ======= */
  const validFiles = (pendingFiles || []).filter(f => f && f.name);

  async function saveItem() {
    try {
      if (!name) return setMsg("Le nom est requis.");
      
      const record = {
        kind,
        name,
        code,
        version: version || "V1",
        description: desc,
        status,
        folder: folder || null,
        tags: toTagsArray(tagsText),
        author, // 🆕
        specs: {
          weight,
          dimensions,
          colors,
        },
        pricing: {
          cost,
          margin,
          retail: retailPrice,
          reseller: resellerPrice,
          resellerDiscount,
        },
        build: kind === "3d" ? { ...threeD } : { ...ordered },
        author: author || null,
  pipeline_status: pipelineStatus,
  followup_at: followupAt ? new Date(followupAt).toISOString() : null,
      };

      if (!configured) {
        const local = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...record };
        setItems((prev) => [local, ...prev]);
        setMsg("Enregistré en local (Supabase non configuré).");
        resetForm();
        return;
      }

      if (!editingId) {
        // INSERT
        const { data, error } = await supabase
          .from("products")
          .insert([record])
          .select()
          .single();
        if (error) throw error;

        // Upload fichiers si besoin puis PATCH la ligne pour stocker les paths
        const files = validFiles.length ? await uploadFiles(data.id) : [];
        if (files.length) {
          const { data: patched, error: e2 } = await supabase
            .from("products")
            .update({ ...record, files })   // ✅ merge record + files
            .eq("id", data.id)
            .select()
            .single();
          if (!e2) setItems((prev) => [patched, ...prev.filter((p) => p.id !== data.id)]);
        } else {
          setItems((prev) => [data, ...prev]);
        }

        setMsg("Produit enregistré ✔");
        resetForm();
      } else {
        // UPDATE
        const files = await uploadFiles(editingId);
        const patch = { ...record };

        // ✅ MERGE fichiers (anciens + nouveaux)
        if (files.length) {
          const current = (items.find((p) => p.id === editingId)?.files) || [];
          patch.files = [...current, ...files];
        }

        const { data, error } = await supabase
          .from("products")
          .update(patch)
          .eq("id", editingId)
          .select()
          .single();
        if (error) throw error;

        setItems((prev) => [data, ...prev.filter((p) => p.id !== data.id)]);
        setMsg("Produit mis à jour ✔");
        resetForm();
      }
    } catch (e) {
      console.error("Erreur saveItem:", e);
      setMsg(`Erreur: ${e.message || e}`);
    }
  }


  async function removeItem(id) {
    if (!configured) {
      setItems((prev) => prev.filter((p) => p.id !== id));
      return;
    }
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (!error) setItems((prev) => prev.filter((p) => p.id !== id));
  }

  function onFileChange(e) {
    const list = Array.from(e.target.files || []);
    setPendingFiles((prev) => [...prev, ...list]);
  }

  /* Ajout tag existant via dropdown (concatène dans input texte) */
  function addExistingTag(tag) {
    const current = toTagsArray(tagsText);
    if (!current.includes(tag)) {
      const next = [...current, tag].join(", ");
      setTagsText(next);
    }
  }

  /* ======= Filtrage ======= */
  const filtered = useMemo(() => {
    return items.filter((it) => {
      const okKind = filterKind === "all" || it.kind === filterKind;
      const txt = `${it.name} ${it.code} ${it.description} ${(it.tags || []).join(" ")}`.toLowerCase();
      const okQ = !q || txt.includes(q.toLowerCase());
      return okKind && okQ;
    });
  }, [items, filterKind, q]);
// 🧩 Suppression visuelle et en DB
async function removeImage(productId, file) {
  if (!window.confirm(`Supprimer ${file.name} ?`)) return;

  await deleteFile(productId, file.path);

  const current = items.find((p) => p.id === productId);
  if (!current) return;

  const newFiles = (current.files || []).filter((f) => f.path !== file.path);

  const { data, error } = await supabase
    .from("products")
    .update({ files: newFiles })
    .eq("id", productId)
    .select()
    .single();

  if (!error) {
    setItems((prev) => [data, ...prev.filter((p) => p.id !== productId)]);
  }
}

// ✅ Nouvelle fonction de vote émotionnel multi-utilisateurs
async function handleVote(productId, imagePath, user, emoji) {
  try {
    const current = items.find((p) => p.id === productId);
    if (!current) return;

    const updatedVotes = { ...(current.votes || {}) };
    if (!updatedVotes[imagePath]) updatedVotes[imagePath] = {};
    updatedVotes[imagePath][user] = emoji;

    const { data, error } = await supabase
      .from("products")
      .update({ votes: updatedVotes })
      .eq("id", productId)
      .select()
      .single();

    if (error) throw error;

    setItems((prev) => [data, ...prev.filter((p) => p.id !== productId)]);
    if (drawerProduct?.id === productId) setDrawerProduct(data);
  } catch (e) {
    console.error("Erreur vote:", e);
  }
}


  /* ======= Rendu ======= */
  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
          <Package className="h-6 w-6" />
          <h1 className="font-bold text-lg">Gestion des produits</h1>
          <Badge variant="secondary" className="ml-auto">Demo</Badge>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 grid md:grid-cols-2 gap-4">
  {/* ========= FORMULAIRE (colonne gauche) ========= */}
  <Card className="shadow-sm border-slate-200">
    <CardContent className="p-4 space-y-4">
            {/* Lignes type / statut */}
            <div className="grid grid-cols-2 gap-3 mt-4">
  <div>
    <Label>Auteur de la fiche</Label>
    <Select value={author} onValueChange={setAuthor}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Choisir" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="David">David</SelectItem>
        <SelectItem value="Guillaume">Guillaume</SelectItem>
      </SelectContent>
    </Select>
  </div>

  <div>
    <Label>Statut (pipeline CRM)</Label>
    <Select value={pipelineStatus} onValueChange={setPipelineStatus}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Sélectionner" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="Attente validation interne">Attente validation interne</SelectItem>
        <SelectItem value="En attente retour fournisseur">En attente retour fournisseur</SelectItem>
        <SelectItem value="Validé">Validé</SelectItem>
        <SelectItem value="Commandé">Commandé</SelectItem>
        <SelectItem value="Annulé">Annulé</SelectItem>
      </SelectContent>
    </Select>
  </div>
</div>

<div className="mt-3">
  <Label>Date de suivi (optionnel)</Label>
  <Input type="date" value={followupAt} onChange={(e) => setFollowupAt(e.target.value)} />
</div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={kind} onValueChange={setKind}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3d">Impression 3D</SelectItem>
                    <SelectItem value="ordered">Commandé (fournisseur)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
  <div>
    <Label>Auteur de la fiche</Label>
    <Select value={author} onValueChange={setAuthor}>
      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="David">David</SelectItem>
        <SelectItem value="Guillaume">Guillaume</SelectItem>
      </SelectContent>
    </Select>
  </div>
</div>
              <div>
                <Label>Statut</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {presets.statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 🆕 Basé sur produit existant (clonage) */}
            <div>
              <Label>Basé sur produit existant (optionnel)</Label>
              <Select value={baseOnId} onValueChange={(v) => { setBaseOnId(v); if (v) cloneFromProduct(v); }}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Choisir un produit à cloner (optionnel)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_empty">— Aucun —</SelectItem>
                  {items.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} · {p.code} {p.version ? `(${p.version})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-slate-500 mt-1">
                Choisis un produit pour pré-remplir tous les champs et proposer la prochaine version.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nom</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Boîte protège-dents" />
              </div>
              <div>
                <Label>Code / SKU</Label>
                <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="auto si vide" />
              </div>
            </div>

            {/* 🆕 Version */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Version</Label>
                <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="ex: V1, V2…" />
                <div className="text-xs text-slate-500 mt-1">
                  Si tu as cloné un produit, on te propose la prochaine version automatiquement.
                </div>
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Usage, public, points forts" />
            </div>

            {/* Dossier + dropdown existants */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Dossier</Label>
                <Input value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="ex: Bô, Kama, Boîtier…" />
              </div>
              <div>
                <Label>Dossiers existants</Label>
                <Select
                  value=""
                  onValueChange={(v) => setFolder(v)}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder="Choisir un dossier existant (optionnel)" /></SelectTrigger>
                  <SelectContent>
                    {existingFolders.length === 0 && <SelectItem value="_empty" disabled>Aucun dossier encore</SelectItem>}
                    {existingFolders.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tags + dropdown existants */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tags (séparés par virgules)</Label>
                <Input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="ex: armes, rangement" />
              </div>
              <div>
                <Label>Ajouter un tag existant</Label>
                <Select
                  value=""
                  onValueChange={(v) => addExistingTag(v)}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder="Sélectionne un tag à ajouter" /></SelectTrigger>
                  <SelectContent>
                    {existingTags.length === 0 && <SelectItem value="_empty" disabled>Aucun tag encore</SelectItem>}
                    {existingTags.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-slate-500 mt-1">Tu peux cumuler et aussi taper tes propres tags.</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Poids (g)</Label>
                <Input type="number" value={weight} onChange={(e) => setWeight(+e.target.value)} />
              </div>
              <div>
                <Label>Dimensions (L×l×H)</Label>
                <Input value={dimensions} onChange={(e) => setDimensions(e.target.value)} placeholder="ex: 120×80×45 mm" />
              </div>
            </div>

            <Tabs value={kind} onValueChange={setKind}>
              <TabsList className="mb-2">
                <TabsTrigger value="3d" className="gap-1"><Printer className="h-4 w-4" /> 3D</TabsTrigger>
                <TabsTrigger value="ordered" className="gap-1"><DollarSign className="h-4 w-4" /> Fournisseur</TabsTrigger>
              </TabsList>

              {/* ---- 3D ---- */}
              <TabsContent value="3d" className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Filament</Label>
                    <Select
                      value={threeD.filamentType}
                      onValueChange={(v) => setThreeD((s) => ({ ...s, filamentType: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {presets.filament.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Couleur</Label>
                    <Select
                      value={threeD.color}
                      onValueChange={(v) => setThreeD((s) => ({ ...s, color: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {presets.colors.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Grammes utilisés</Label>
                    <Input type="number" value={threeD.gramsUsed} onChange={(e) => setThreeD((s) => ({ ...s, gramsUsed: +e.target.value }))} />
                  </div>
                  <div>
                    <Label>Coût bobine / kg (CAD)</Label>
                    <Input type="number" value={threeD.spoolCostPerKg} onChange={(e) => setThreeD((s) => ({ ...s, spoolCostPerKg: +e.target.value }))} />
                  </div>
                  <div>
                    <Label>Heures impression</Label>
                    <Input type="number" value={threeD.printHours} onChange={(e) => setThreeD((s) => ({ ...s, printHours: +e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Taux machine $/h</Label>
                    <Input type="number" value={threeD.machineRate} onChange={(e) => setThreeD((s) => ({ ...s, machineRate: +e.target.value }))} />
                  </div>
                  <div>
                    <Label>Main d’œuvre $/h</Label>
                    <Input type="number" value={threeD.laborRate} onChange={(e) => setThreeD((s) => ({ ...s, laborRate: +e.target.value }))} />
                  </div>
                  <div>
                    <Label>Énergie (kWh)</Label>
                    <Input type="number" value={threeD.energyKwh} onChange={(e) => setThreeD((s) => ({ ...s, energyKwh: +e.target.value }))} />
                  </div>
                </div>

                <div className="text-sm text-slate-600">
                  Coût matière: <b>{currency((threeD.gramsUsed / 1000) * threeD.spoolCostPerKg)}</b> — Coût temps:{" "}
                  <b>{currency(threeD.printHours * (threeD.machineRate + threeD.laborRate))}</b>
                </div>
              </TabsContent>

              {/* ---- Commandé ---- */}
              <TabsContent value="ordered" className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Fournisseur</Label>
                    <Input value={ordered.supplier} onChange={(e) => setOrdered((s) => ({ ...s, supplier: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Contact</Label>
                    <Input value={ordered.supplierContact} onChange={(e) => setOrdered((s) => ({ ...s, supplierContact: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Coût unitaire</Label>
                    <Input type="number" value={ordered.unitCost} onChange={(e) => setOrdered((s) => ({ ...s, unitCost: +e.target.value }))} />
                  </div>
                  <div>
                    <Label>Import / unité</Label>
                    <Input type="number" value={ordered.importPerUnit} onChange={(e) => setOrdered((s) => ({ ...s, importPerUnit: +e.target.value }))} />
                  </div>
                  <div>
                    <Label>Customisation</Label>
                    <Input type="number" value={ordered.customizationCost} onChange={(e) => setOrdered((s) => ({ ...s, customizationCost: +e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>MOQ</Label>
                    <Input type="number" value={ordered.moq} onChange={(e) => setOrdered((s) => ({ ...s, moq: +e.target.value }))} />
                  </div>
                  <div>
                    <Label>Délais (jours)</Label>
                    <Input value={ordered.leadTime} onChange={(e) => setOrdered((s) => ({ ...s, leadTime: e.target.value }))} />
                  </div>
                </div>
                <div className="text-sm text-slate-600">
                  Coût fournisseur total: <b>{currency(ordered.unitCost + ordered.importPerUnit + ordered.customizationCost)}</b>
                </div>
              </TabsContent>
            </Tabs>

            {/* Prix – saisis manuellement */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prix public (saisi)</Label>
                <Input type="number" value={retailPrice} onChange={(e) => setRetailPrice(+e.target.value)} />
                <div className="text-xs text-slate-500 mt-1">
                  Astuce: {currency(cost)} × (1 + {Math.round(margin * 100)}%) = {currency(cost * (1 + margin))}
                </div>
              </div>
              <div>
                <Label>Prix revendeur (saisi)</Label>
                <Input type="number" value={resellerPrice} onChange={(e) => setResellerPrice(+e.target.value)} />
                <div className="text-xs text-slate-500 mt-1">
                  Astuce: prix public × (1 − {Math.round(resellerDiscount * 100)}%)
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <Label>Marge cible (%)</Label>
                <div className="flex items-center gap-3">
                  <Slider value={[Math.round(margin * 100)]} onValueChange={(v) => setMargin(v[0] / 100)} step={1} min={10} max={80} className="w-56" />
                  <span className="font-semibold w-12 text-right">{Math.round(margin * 100)}%</span>
                </div>
              </div>
              <div>
                <Label>Remise revendeur (%)</Label>
                <div className="flex items-center gap-3">
                  <Slider value={[Math.round(resellerDiscount * 100)]} onValueChange={(v) => setResellerDiscount(v[0] / 100)} step={1} min={0} max={60} className="w-56" />
                  <span className="font-semibold w-12 text-right">{Math.round(resellerDiscount * 100)}%</span>
                </div>
              </div>
            </div>

            {/* Résumé coût */}
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="p-3 bg-slate-100 rounded-xl">
                <div className="text-slate-500">Coût de revient</div>
                <div className="text-xl font-bold">{currency(cost)}</div>
              </div>
              <div className="p-3 bg-slate-100 rounded-xl">
                <div className="text-slate-500">Prix public</div>
                <div className="text-xl font-bold">{currency(retailPrice)}</div>
              </div>
              <div className="p-3 bg-slate-100 rounded-xl">
                <div className="text-slate-500">Prix revendeur</div>
                <div className="text-xl font-bold">{currency(resellerPrice)}</div>
              </div>
            </div>

            {/* Fichiers */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                <Label>Fichiers (STL, GCODE, PDF, images)</Label>
              </div>
              <Input type="file" multiple onChange={onFileChange} />
              {!!pendingFiles.length && (
                <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                  {pendingFiles.map((f, i) => (
                    <span key={i} className="px-2 py-1 bg-slate-100 rounded-xl">{f.name}</span>
                  ))}
                </div>
              )}
            </div>

{/* ====== Génération d'image par IA ====== */}
<div className="mt-6">
  <h2 className="text-md font-semibold mb-2">🎨 Génération d’image</h2>
  <p className="text-sm text-slate-600 mb-2">
    Génère une image conceptuelle du produit à partir de sa description ou de son nom.
  </p>
  <ImageGenerator
    productName={name}
    description={desc}
    onGenerated={async (imageBlob) => {
      if (!imageBlob) return;
      const file = new File([imageBlob], `${slugify(name)}_ai.png`, { type: "image/png" });
      setPendingFiles((prev) => [...prev, file]);
    }}
  />
</div>

            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={resetForm} className="gap-2">
                Réinitialiser
              </Button>
              <Button onClick={saveItem} className="gap-2">
                <Save className="h-4 w-4" /> {editingId ? "Mettre à jour" : "Enregistrer"}
              </Button>
            </div>

            {msg && <div className="text-xs text-slate-600">{msg}</div>}
            {!configured && (
              <div className="text-xs text-amber-600">
                Supabase non configuré (Paramètres ▶️ renseigne URL & Anon Key).
              </div>
            )}
          </CardContent>
        </Card>

{/* ========= LISTE PRODUITS (colonne droite) ========= */}
<section className="flex flex-col">
    {/* ===== BARRE DE FILTRES ===== */}
    <div className="sticky top-16 z-10 bg-white/90 backdrop-blur border rounded-xl px-3 py-2 flex items-center gap-3">
      <Filter className="h-4 w-4 text-slate-500" />
      <Select value={filterKind} onValueChange={setFilterKind}>
        <SelectTrigger className="w-32"><SelectValue placeholder="Type" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous</SelectItem>
          <SelectItem value="3d">Impression 3D</SelectItem>
          <SelectItem value="ordered">Commandé</SelectItem>
        </SelectContent>
      </Select>

      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Recherche nom, code, tag…"
        className="ml-auto max-w-xs"
      />
    </div>

    {/* ===== GRILLE DE MINI-CARTES ===== */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
      {filtered.length === 0 && (
        <Card className="border-slate-200">
          <CardContent className="p-6 text-slate-500 text-sm">
            Aucun produit ne correspond aux filtres.
          </CardContent>
        </Card>
      )}

      {filtered.map((it) => {
        const validFiles = (it.files || []).filter((f) => f && (f.path || f.name));
        const imageFiles = validFiles.filter((f) => isImagePath(f.path || f.name));
        const mainImg = imageFiles[0]
          ? supabase.storage.from("product_file").getPublicUrl(imageFiles[0].path).data.publicUrl
          : "https://placehold.co/400x300?text=No+Image";

        return (
          <div
            key={it.id}
            onClick={() => setDrawerProduct(it)}
            className="cursor-pointer border rounded-xl bg-white hover:shadow-lg transition p-3 flex flex-col"
          >
            <div className="relative">
              <img
                src={mainImg}
                alt={it.name}
                className="w-full h-36 object-cover rounded-lg border"
              />
              {it.status && (
                <span className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full bg-white/90 border">
                  {it.status}
                </span>
              )}
            </div>

            <div className="mt-2 space-y-1">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-sm truncate">{it.name}</h3>
                <Badge variant="outline">{it.kind === "3d" ? "3D" : "CMD"}</Badge>
              </div>

              <p className="text-xs text-slate-500 line-clamp-2">
                {it.description || "—"}
              </p>

              <div className="flex flex-wrap gap-1 mt-1">
              {it.pipeline_status && (
  <span
    className="text-[11px] border rounded-md px-2 py-0.5 bg-gray-50 text-gray-700 hover:bg-gray-700 hover:text-white transition-colors"
    title="Statut CRM"
  >
    {it.pipeline_status}
  </span>
)}
                {Array.isArray(it.tags) && it.tags.slice(0, 2).map((t) => (
                  <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                ))}
              </div>

              <div className="flex justify-between mt-2 text-[11px] text-slate-500">
                <span>{it.author || "—"}</span>
                <span>{new Date(it.created_at).toLocaleDateString()}</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  size="icon"
                  variant="ghost"
                  title="Éditer"
                  onClick={(e) => { e.stopPropagation(); startEdit(it); }}
                >
                  <PencilLine className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  title="Supprimer"
                  onClick={(e) => { e.stopPropagation(); removeItem(it.id); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </section>

  {/* ===== DRAWER DÉTAIL PRODUIT ===== */}
  <Drawer open={!!drawerProduct} onOpenChange={(open) => !open && setDrawerProduct(null)}>
    <DrawerContent className="max-w-md ml-auto border-l bg-white p-0 overflow-y-auto">
      {drawerProduct && (
        <>
          <DrawerHeader className="px-4 py-3 border-b">
            <DrawerTitle className="text-lg">{drawerProduct.name}</DrawerTitle>
            <p className="text-xs text-slate-500">{drawerProduct.code}</p>
          </DrawerHeader>

          <div className="p-4 space-y-4">
            {/* Image principale réduite et centrée */}
            <div className="flex justify-center">
              <img
                src={
                  (drawerProduct.files || []).some((f) => isImagePath(f.path))
                    ? supabase.storage
                        .from("product_file")
                        .getPublicUrl(
                          drawerProduct.files.find((f) => isImagePath(f.path)).path
                        ).data.publicUrl
                    : "https://placehold.co/600x400?text=No+Image"
                }
                className="max-w-[300px] rounded-lg border shadow-sm"
                alt={drawerProduct.name}
              />
            </div>

            {/* Métadonnées */}
            <div className="flex flex-wrap gap-2 justify-center">
              {drawerProduct.status && <Badge>{drawerProduct.status}</Badge>}
              {drawerProduct.pipeline_status && (
                <Badge variant="outline">{drawerProduct.pipeline_status}</Badge>
              )}
              <Badge variant="outline">
                {drawerProduct.kind === "3d" ? "Impression 3D" : "Commandé"}
              </Badge>
              {drawerProduct.version && <Badge variant="secondary">{drawerProduct.version}</Badge>}
            </div>

            <p className="text-sm text-slate-700 text-center">
              {drawerProduct.description || "Aucune description."}
            </p>

            {/* Galerie & votes améliorés */}
{(() => {
  const imgs = (drawerProduct.files || []).filter(
    (f) => f && (f.path || f.name) && isImagePath(f.path || f.name)
  );
  if (!imgs.length) return null;

  const votes = drawerProduct.votes || {};
  const users = ["Guillaume", "David"];

  const emojiColor = {
    "❤️": "bg-pink-100 text-pink-700",
    "👍": "bg-green-100 text-green-700",
    "😐": "bg-yellow-100 text-yellow-700",
    "👎": "bg-orange-100 text-orange-700",
    "💀": "bg-red-100 text-red-700",
  };

  const avgEmoji = (filePath) => {
    const v = votes[filePath] || {};
    const vals = Object.values(v);
    if (vals.length === 0) return "❓";
    const rank = ["💀", "👎", "😐", "👍", "❤️"];
    const avgIndex = Math.round(
      vals.map((e) => rank.indexOf(e)).reduce((a, b) => a + b, 0) / vals.length
    );
    return rank[Math.max(0, Math.min(rank.length - 1, avgIndex))];
  };

  return (
    <div>
      <h3 className="text-sm font-medium mb-2">Images & votes</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {imgs.map((file, idx) => {
          const { data } = supabase.storage
            .from("product_file")
            .getPublicUrl(file.path);
          const url = data.publicUrl;
          const fileVotes = votes[file.path] || {};
          const avg = avgEmoji(file.path);

          return (
            <div
              key={idx}
              className="border rounded-xl p-3 bg-white shadow-sm flex flex-col items-center hover:shadow-md transition"
            >
              <img
                src={url}
                alt={file.name}
                className="w-full h-32 object-cover rounded-lg border"
              />

              {/* Barre colorée score moyen */}
              <div
                className={`mt-2 text-xs px-2 py-1 rounded-full font-medium ${emojiColor[avg] || "bg-gray-100 text-gray-700"}`}
              >
                Score moyen : {avg}
              </div>

              {/* Votes utilisateurs */}
              <div className="mt-3 w-full space-y-2">
                {users.map((u) => (
                  <div
                    key={u}
                    className="flex flex-col items-center border-t pt-2"
                  >
                    <span className="text-[11px] font-semibold mb-1 text-slate-600">
                      {u}
                    </span>
                    <div className="grid grid-cols-5 gap-1">
                      {["❤️", "👍", "😐", "👎", "💀"].map((emoji) => (
                        <Button
                          key={emoji}
                          size="sm"
                          variant={fileVotes[u] === emoji ? "default" : "outline"}
                          className="h-7 w-7 p-0 text-sm flex items-center justify-center"
                          onClick={() =>
                            handleVote(drawerProduct.id, file.path, u, emoji)
                          }
                        >
                          {emoji}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
})()}


            {/* Liens fichiers */}
            {(drawerProduct.files || []).length > 0 && (
              <div>
                <div className="text-xs font-medium text-slate-600 mb-1">Fichiers</div>
                <div className="space-y-1 text-xs">
                  {drawerProduct.files.map((f, i) => {
                    const { data } = supabase.storage.from("product_file").getPublicUrl(f.path);
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <a
                          href={data.publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          📎 {f.name}
                        </a>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={async () => { await removeImage(drawerProduct.id, f); }}
                          title="Supprimer"
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Métadonnées bas */}
            {/* Détails techniques */}
<div className="mt-4 border-t pt-3">
  <h3 className="text-sm font-semibold mb-2">Spécifications techniques</h3>
  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
    <p><strong>Type :</strong> {drawerProduct.kind === "3d" ? "Impression 3D" : "Commandé"}</p>
    <p><strong>Statut :</strong> {drawerProduct.status || "—"}</p>
    <p><strong>Pipeline :</strong> {drawerProduct.pipeline_status || "—"}</p>
    <p><strong>Auteur :</strong> {drawerProduct.author || "—"}</p>
    <p><strong>Version :</strong> {drawerProduct.version || "—"}</p>
    <p><strong>Poids :</strong> {drawerProduct.weight ? `${drawerProduct.weight} g` : "—"}</p>
    <p><strong>Dimensions :</strong> {drawerProduct.dimensions || "—"}</p>
    <p><strong>Dossier :</strong> {drawerProduct.folder || "—"}</p>
    <p><strong>Tags :</strong> {Array.isArray(drawerProduct.tags) && drawerProduct.tags.length > 0 ? drawerProduct.tags.join(", ") : "—"}</p>
    <p><strong>Date de création :</strong> {new Date(drawerProduct.created_at).toLocaleDateString()}</p>
  </div>
</div>

            {/* Actions */}
            <div className="flex justify-center gap-2 pt-2">
              <Button variant="outline" onClick={() => startEdit(drawerProduct)}>
                Modifier
              </Button>
              <Button variant="destructive" onClick={() => removeItem(drawerProduct.id)}>
                Supprimer
              </Button>
            </div>
          </div>
        </>
      )}
    </DrawerContent>
  </Drawer>
</main>
</div>
);
}
