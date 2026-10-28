/**
 * Gambar raster (foto/ilustrasi) lewat model image generation di OpenRouter.
 * Model Claude tidak membuat gambar raster, jadi agent memanggil ini lewat tool generate_image.
 *
 *   IMAGE_MODEL         slug OpenRouter, mis. "google/gemini-2.5-flash-image". Kosong = fitur mati.
 *   IMAGE_PRICE_USD     perkiraan biaya per gambar bila OpenRouter tidak mengirim usage.cost (default 0.04)
 */
export const imageEnabled = () => !!process.env.IMAGE_MODEL && !!process.env.OPENROUTER_API_KEY;

export type ImageResult = { dataUrl: string; mime: string; bytes: number; costUsd: number };

const ASPECTS = new Set(["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"]);

export async function generateImage(prompt: string, aspect = "16:9"): Promise<ImageResult> {
  if (!imageEnabled()) throw new Error("Pembuatan gambar belum diaktifkan (IMAGE_MODEL kosong).");
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "content-type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://buildoriel.com",
      "X-Title": "Oriel",
    },
    body: JSON.stringify({
      model: process.env.IMAGE_MODEL,
      modalities: ["image", "text"],
      messages: [{ role: "user", content: prompt.slice(0, 4000) }],
      image_config: { aspect_ratio: ASPECTS.has(aspect) ? aspect : "16:9" },
      usage: { include: true },
    }),
  });
  const j: any = await res.json().catch(() => ({}));
  if (!res.ok || j.error) throw new Error(`Gambar gagal dibuat: ${j.error?.message ?? res.status}`);
  const url: string | undefined = j.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  const m = url?.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
  if (!m) throw new Error("Model tidak mengembalikan gambar.");
  const cost = Number(j.usage?.cost);
  return {
    dataUrl: url!, mime: m[1], bytes: Math.floor((m[2].length * 3) / 4),
    costUsd: Number.isFinite(cost) && cost > 0 ? cost : Number(process.env.IMAGE_PRICE_USD ?? 0.04),
  };
}
