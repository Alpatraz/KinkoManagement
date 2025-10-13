import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function ImageGenerator({ productName, description, onGenerated }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null); // ✅ ajouté pour corriger ton erreur

  async function handleGenerate() {
    try {
      setLoading(true);
      setError("");

      const fullPrompt =
        prompt ||
        `Produit ${productName || "inconnu"} : ${description || "aucune description fournie"}. Photo studio nette.`;

      const response = await fetch("https://kinko-image-proxy.onrender.com/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: fullPrompt }),
      });

      if (!response.ok) throw new Error(`Erreur proxy (${response.status})`);

      const data = await response.json();
      const imageBase64 = data.image_base64;

      if (!imageBase64) throw new Error("Aucune image reçue du serveur");

      // ✅ On affiche un aperçu local
      const imageUrl = `data:image/png;base64,${imageBase64}`;
      setPreview(imageUrl);

      // ✅ On renvoie l'image au parent sous forme de Blob
      const blob = await fetch(imageUrl).then((r) => r.blob());
      onGenerated(blob);
    } catch (err) {
      console.error("Erreur de génération :", err);
      setError(err.message || "Erreur lors de la génération de l'image");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-3 border rounded-lg bg-white shadow-sm">
      <label className="block text-sm font-medium mb-2">Prompt de génération</label>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Décris le produit à illustrer..."
        className="w-full text-sm border rounded p-2 focus:outline-none focus:ring focus:ring-blue-200"
        rows={3}
      />

      <Button
        onClick={handleGenerate}
        disabled={loading}
        className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin h-4 w-4 mr-2" /> Génération en cours…
          </>
        ) : (
          "🎨 Générer l’image"
        )}
      </Button>

      {error && <p className="text-red-600 text-xs mt-2">{error}</p>}

      {preview && (
        <div className="mt-4">
          <img
            src={preview}
            alt="Aperçu généré"
            className="rounded-lg border shadow-sm max-w-full"
          />
          <p className="text-xs text-slate-500 mt-1 text-center">
            ✅ Image générée avec succès
          </p>
        </div>
      )}
    </div>
  );
}
