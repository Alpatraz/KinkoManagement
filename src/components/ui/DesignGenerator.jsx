// version sans shadcn (HTML natif + classes Tailwind)
const Card = ({ children }) => <div className="border rounded-xl p-4 shadow-sm bg-white">{children}</div>;
const CardContent = ({ children }) => <div>{children}</div>;
const Button = ({ children, ...props }) => <button {...props} className="px-3 py-2 bg-black text-white rounded hover:bg-gray-800">{children}</button>;
const Input = (props) => <input {...props} className="border rounded p-2 w-full" />;
const Label = ({ children }) => <label className="text-sm font-semibold mb-1 block">{children}</label>;
const Select = ({ value, onChange, options }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} className="border rounded p-2 w-full">
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);


// Supabase client (même pattern que ton app)
function makeClient() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Props:
 * - productId: uuid du produit
 * - onUploaded: callback(files[]) -> déclencher un refresh sur la fiche si besoin
 * - bucket?: string (par défaut "product_photos")
 */
export default function DesignGenerator({ productId, onUploaded, bucket = "product_photos" }) {
  const supabase = makeClient();
  const [baseType, setBaseType] = useState("gant");
  const [theme, setTheme] = useState("auto"); // auto | dark | light
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function generate() {
    try {
      setBusy(true);
      setErr("");

      // 1) Appel de la fonction Netlify
      const r = await fetch("/.netlify/functions/generateImage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseType, userPrompt: prompt, theme }),
      });
      const { images, error } = await r.json();
      if (error) throw new Error(error);
      if (!images || !images.length) throw new Error("Aucune image générée.");

      // 2) Upload dans Supabase Storage
      const uploaded = [];
      const bucketRef = supabase.storage.from(bucket);

      for (const b64 of images) {
        const bin = Uint8Array.from(window.atob(b64), (c) => c.charCodeAt(0));
        const fileName = `${productId}/${Date.now()}_${Math.random().toString(36).slice(2)}.png`;
        const { data, error: upErr } = await bucketRef.upload(fileName, bin, {
          contentType: "image/png",
          upsert: false,
        });
        if (upErr) {
          console.error(upErr);
          continue;
        }
        uploaded.push({ path: data.path, name: fileName.split("/").pop(), source: "ai" });
      }

      // 3) Option : insérer une ligne dans product_photos (votes à faire)
      if (uploaded.length) {
        await supabase.from("product_photos").insert(
          uploaded.map((u) => ({
            product_id: productId,
            storage_path: u.path,
            source: "ai",
            votes: { guillaume: null, david: null }, // à voter
          }))
        );
      }

      // 4) callback UI
      if (onUploaded) onUploaded(uploaded);
    } catch (e) {
      console.error(e);
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-3">
        <div className="text-sm font-semibold">🧠 Générer un design IA</div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Type de produit</Label>
            <Select value={baseType} onValueChange={setBaseType}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gant">Gant</SelectItem>
                <SelectItem value="hoodie">Hoodie</SelectItem>
                <SelectItem value="tshirt">T-shirt</SelectItem>
                <SelectItem value="kimono">Kimono</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Thème logo/couleurs</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="dark">Fonds sombres</SelectItem>
                <SelectItem value="light">Fonds clairs</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-3">
            <Label>Prompt</Label>
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='Ex: "Version noire mat avec un éclair or sur la base"'
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={generate} disabled={busy || !productId}>
            {busy ? "Génération…" : "Générer 3 images"}
          </Button>
          {!productId && (
            <div className="text-xs text-amber-600 self-center">
              Enregistre d’abord le produit pour obtenir un ID.
            </div>
          )}
        </div>

        {err && <div className="text-xs text-red-600">{err}</div>}
        <div className="text-xs text-slate-500">
          Les images générées s’ajoutent à la galerie de ce produit pour voter.
        </div>
      </CardContent>
    </Card>
  );
}
