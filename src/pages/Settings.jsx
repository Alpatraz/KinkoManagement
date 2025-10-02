/* src/pages/Settings.jsx */
import React, { useState } from "react";
import { createClient } from "@supabase/supabase-js";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package } from "lucide-react";

export default function Settings() {
  const [sbUrl, setSbUrl] = useState(localStorage.getItem("supabaseUrl") || "");
  const [sbKey, setSbKey] = useState(localStorage.getItem("supabaseAnonKey") || "");
  const [msg, setMsg] = useState("");

  function saveConfig() {
    if (!sbUrl || !sbKey) {
      setMsg("❌ Merci de remplir les champs URL et Key.");
      return;
    }
    localStorage.setItem("supabaseUrl", sbUrl);
    localStorage.setItem("supabaseAnonKey", sbKey);
    setMsg("✅ Configuration sauvegardée !");
  }

  async function testConnection() {
    try {
      const client = createClient(sbUrl, sbKey);
      const { error } = await client.from("products").select("id").limit(1);
      if (error) {
        setMsg(`❌ Connexion échouée : ${error.message}`);
      } else {
        setMsg("✅ Connexion réussie !");
      }
    } catch (e) {
      setMsg(`❌ Erreur: ${String(e.message)}`);
    }
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Package className="h-5 w-5 text-slate-500" />
        <h1 className="text-xl font-semibold">Paramètres Supabase</h1>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <Label>Supabase URL</Label>
            <Input
              value={sbUrl}
              onChange={(e) => setSbUrl(e.target.value)}
              placeholder="https://xxx.supabase.co"
            />
          </div>
          <div>
            <Label>Supabase Anon Key</Label>
            <Input
              value={sbKey}
              onChange={(e) => setSbKey(e.target.value)}
              placeholder="eyJ..."
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={testConnection}>Tester</Button>
            <Button onClick={saveConfig}>Sauvegarder</Button>
          </div>
          {msg && <div className="text-sm text-slate-700 mt-2">{msg}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
