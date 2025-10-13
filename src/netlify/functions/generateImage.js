// netlify/functions/generateImage.js
// Fonction Netlify qui génère 1 à 3 images selon un prompt, en appliquant tes règles de marque.
// Nécessite OPENAI_API_KEY dans les variables d'env Netlify.

export default async (req, context) => {
    try {
      if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Use POST" }), { status: 405 });
      }
      const body = await req.json();
  
      const { baseType = "gant", userPrompt = "", theme = "auto" } = body || {};
  
      // --- Règles Kinko (logo & couleurs) ---
      const logoRuleByTheme = {
        dark: "Use Kinko logo in white & gold, keep contrast on dark base.",
        light: "Use Kinko logo in black & gold, keep contrast on light base.",
      };
  
      // auto = heuristique simple
      const inferredTheme =
        theme !== "auto"
          ? theme
          : /noir|dark|sombre|black/i.test(userPrompt) ? "dark" : "light";
  
      const logoRule = logoRuleByTheme[inferredTheme];
  
      // Prompt “système” (instructions constantes)
      const brandDirectives = `
  You are a product rendering engine for Kinko (martial arts brand).
  Always respect brand placement & proportions for the logo.
  Background must be clean, studio style, no watermark, no text overlay.
  Render as photorealistic product mockup, centered, high detail, 1 product per image.
  `;
  
      // Prompt “template” selon type
      const typePrompt = {
        gant: "Render a pair of martial arts gloves (boxing / karate style), slightly angled, left and right visible.",
        hoodie: "Render a unisex hoodie on invisible mannequin, front view.",
        tshirt: "Render a unisex t-shirt on invisible mannequin, front view.",
        kimono: "Render a martial arts gi (kimono) on hanger or invisible mannequin, front view.",
      }[baseType] || "Render the product, centered.";
  
      const finalPrompt = `
  ${brandDirectives}
  Product type: ${baseType}.
  ${typePrompt}
  Brand rule: ${logoRule}
  Apply this user change: ${userPrompt}
  `;
  
      // --- Appel OpenAI Images ---
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "OPENAI_API_KEY missing" }), { status: 500 });
      }
  
      // DALL·E 3 (Images API v1)
      const resp = await fetch("https://openrouter.ai/api/v1/images", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "stabilityai/stable-diffusion-3.5-large",
          prompt: finalPrompt,
          n: 3,
          size: "1024x1024",
        }),
      });
      
  
      if (!resp.ok) {
        const txt = await resp.text();
        return new Response(JSON.stringify({ error: "OpenAI error", detail: txt }), { status: 500 });
      }
  
      const json = await resp.json();
      // Retour : tableau d’images en base64
      const images = (json.data || []).map((d) => d.b64_json);
  
      return new Response(JSON.stringify({ images, theme: inferredTheme, prompt: finalPrompt }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message || String(e) }), { status: 500 });
    }
  }
  