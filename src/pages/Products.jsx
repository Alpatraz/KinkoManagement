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
  

/* ========= CONSTANTES / HELPERS ========= */
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
  // Cherche V<number> dans items partageant le même code et retourne V(n+1)
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

/* ========= PAGE ========= */
export default function Products() {
  const supabase = makeClient();
  const configured = !!supabase;

  // Filtres / liste
  const [items, setItems] = useState([]);
  const [filterKind, setFilterKind] = useState("all");
  const [q, setQ] = useState("");

  // Formulaire
  const [editingId, setEditingId] = useState(null);
  const [kind, setKind] = useState("3d");
  const [status, setStatus] = useState("Prototype");

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [version, setVersion] = useState("V1"); // 🆕 champ Version
  const [desc, setDesc] = useState("");
  const [weight, setWeight] = useState(0);
  const [dimensions, setDimensions] = useState("");
  const [colors, setColors] = useState(["Noir"]);
  const [folder, setFolder] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [author, setAuthor] = useState(""); // 🆕 nouvel état

  // Clonage (basé sur produit existant)
  const [baseOnId, setBaseOnId] = useState(""); // 🆕

  const [threeD, setThreeD] = useState({ ...empty3D });
  const [ordered, setOrdered] = useState({ ...emptyOrdered });

  // Prix (saisie manuelle) + aides de calcul
  const [margin, setMargin] = useState(DEFAULT_MARGIN);
  const [resellerDiscount, setResellerDiscount] = useState(DEFAULT_RESELLER_DISCOUNT);
  const [retailPrice, setRetailPrice] = useState(0);   // saisi par toi
  const [resellerPrice, setResellerPrice] = useState(0); // saisi par toi

  // Fichiers en attente d’upload
  const [pendingFiles, setPendingFiles] = useState([]);

  const [msg, setMsg] = useState("");

  /* ======= Calcul du coût = matière + temps + énergie ======= */
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
        console.log("Upload OK:", data);
        uploaded.push({ name: f.name, path });
      }
    }
    return uploaded;
  }
  

  /* ======= Enregistrer / mettre à jour ======= */
  async function saveItem() {
    try {
      if (!name) return setMsg("Le nom est requis.");
      const code = sku || autoCode({ name, kind });
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
        const files = await uploadFiles(data.id);
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

      <main className="mx-auto max-w-6xl p-4 grid md:grid-cols-2 gap-4">
        {/* ========= FORM ========= */}
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4 space-y-4">
            {/* Lignes type / statut */}
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

        {/* ========= LISTE ========= */}
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Filter className="h-4 w-4" />
              <Select value={filterKind} onValueChange={setFilterKind}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="3d">Impression 3D</SelectItem>
                  <SelectItem value="ordered">Commandé</SelectItem>
                </SelectContent>
              </Select>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Recherche nom, code, tag…" className="ml-auto max-w-sm" />
            </div>

            <div className="grid gap-3">
              {filtered.length === 0 && (
                <div className="text-slate-500 text-sm">Aucun produit enregistré pour l'instant.</div>
              )}
              {filtered.map((it) => {
                // 🆕 essaie d’extraire une image si disponible
                const imageFile = (it.files || []).find((f) => isImagePath(f?.path || f?.name));
                const imgUrl = imageFile ? getPublicUrl(imageFile.path) : null;

                return (
                  <div key={it.id} className="border rounded-2xl p-3 flex items-center gap-3 bg-white">
                    {/* Aperçu image (optionnel) */}
                    {imgUrl ? (
                      <div className="shrink-0">
                        <img
                          src={imgUrl}
                          alt={imageFile?.name || "Aperçu produit"}
                          className="w-16 h-16 object-cover rounded-lg border"
                        />
                      </div>
                    ) : (
                      <div className="w-2 h-10 rounded-full" style={{ background: it.kind === "3d" ? "#60a5fa" : "#f59e0b" }} />
                    )}

                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-semibold">{it.name}</div>
                        <Badge variant="outline">{it.kind === "3d" ? "3D" : "CMD"}</Badge>
                        {it.version && <Badge variant="secondary">{it.version}</Badge>}
                        {it.status && <Badge variant="secondary">{it.status}</Badge>}
                        {it.author && <Badge variant="outline" className="bg-blue-50">{it.author}</Badge>}
                        {!!(it.tags && it.tags.length) && (
                          <span className="text-xs text-slate-500">#{it.tags.join(" #")}</span>
                        )}
                        <span className="text-xs text-slate-500">{new Date(it.created_at).toLocaleString()}</span>
                      </div>

                      <div className="text-xs text-slate-600">{it.code} · {it.description || "—"}</div>

                      {/* Liens fichiers */}
                      {it.files && it.files.length > 0 && (
                        <div className="text-xs mt-1 space-y-1">
                          {it.files.map((f, i) => {
                            const { data } = configured
                              ? supabase.storage.from("product_file").getPublicUrl(f.path)
                              : { data: { publicUrl: "#" } };
                            return (
                              <a
                                key={i}
                                href={data.publicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline block"
                              >
                                📎 {f.name}
                              </a>
                            );
                          })}
                        </div>
                      )}

                      <div className="text-sm mt-1 flex flex-wrap items-center gap-2">
                        {it.pricing && (
                          <>
                            <Badge variant="outline">Coût {currency(it.pricing.cost)}</Badge>
                            <Badge variant="outline">Public {currency(it.pricing.retail)}</Badge>
                            <Badge variant="outline">Revendeur {currency(it.pricing.reseller)}</Badge>
                          </>
                        )}
                      </div>
                    </div>

                    <Button size="icon" variant="ghost" title="Éditer" onClick={() => startEdit(it)}>
                      <PencilLine className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Supprimer" onClick={() => removeItem(it.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
