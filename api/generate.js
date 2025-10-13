// /api/generate.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Méthode non autorisée" });
    }

    const { prompt } = await req.json();
    if (!prompt) {
      return res.status(400).json({ error: "Prompt manquant" });
    }

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({ error: "Clé API OpenRouter manquante" });
    }

    // 🧩 Appel au modèle de génération d’image (StabilityAI via OpenRouter)
    const response = await fetch("https://openrouter.ai/api/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "stabilityai/stable-diffusion-3.5",
        prompt,
        size: "512x512",
        n: 1,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Erreur OpenRouter:", err);
      return res.status(500).json({ error: "Erreur de génération d’image" });
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url;

    return res.status(200).json({ imageUrl });
  } catch (err) {
    console.error("Erreur API:", err);
    return res.status(500).json({ error: err.message || "Erreur serveur" });
  }
}
