/**
 * Raster images (photos/illustrations) via an image generation model on OpenRouter.
 * Claude models do not create raster images, so the agent calls this through the generate_image tool.
 *
 *   IMAGE_MODEL         OpenRouter slug, e.g. "google/gemini-2.5-flash-image". Empty = feature off.
 *   IMAGE_PRICE_USD     estimated cost per image when OpenRouter does not send usage.cost (default 0.04)
 */
export const imageEnabled = () => !!process.env.IMAGE_MODEL && !!process.env.OPENROUTER_API_KEY;

export type ImageResult = { dataUrl: string; mime: string; bytes: number; costUsd: number };

const ASPECTS = new Set(["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"]);

export async function generateImage(prompt: string, aspect = "16:9"): Promise<ImageResult> {
  if (!imageEnabled()) throw new Error("Image generation is not enabled (IMAGE_MODEL is empty).");
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
  if (!res.ok || j.error) throw new Error(`Image generation failed: ${j.error?.message ?? res.status}`);
  const url: string | undefined = j.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  const m = url?.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
  if (!m) throw new Error("The model did not return an image.");
  const cost = Number(j.usage?.cost);
  return {
    dataUrl: url!, mime: m[1], bytes: Math.floor((m[2].length * 3) / 4),
    costUsd: Number.isFinite(cost) && cost > 0 ? cost : Number(process.env.IMAGE_PRICE_USD ?? 0.04),
  };
}
