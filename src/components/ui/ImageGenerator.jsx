import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ImageGenerator() {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setError("");
    setImageUrl("");
    setLoading(true);
    try {
      // 👉 Appelle ton API backend (Render, Cloudflare, etc.)
      // Ici on suppose que tu auras un endpoint /api/generate
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });      

      if (!res.ok) throw new Error("Erreur lors de la génération");
      const data = await res.json();
      setImageUrl(data.imageUrl);
    } catch (err) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 border rounded-2xl bg-white shadow-sm space-y-3">
      <div>
        <Label>Prompt de génération d’image</Label>
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ex: gants Kinko noirs avec éclairs dorés"
        />
      </div>

      <Button
        onClick={handleGenerate}
        disabled={!prompt || loading}
        className="w-full"
      >
        {loading ? "Génération..." : "Générer l’image"}
      </Button>

      {error && <div className="text-red-500 text-sm">{error}</div>}

      {imageUrl && (
        <div className="mt-4">
          <img
            src={imageUrl}
            alt="Résultat généré"
            className="rounded-xl shadow-md border"
          />
        </div>
      )}
    </div>
  );
}
