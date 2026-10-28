import { createHmac, timingSafeEqual } from "crypto";
const secret = () => process.env.PREVIEW_SIGNING_SECRET!;
export function previewToken(projectId: string, ttlSec = 3600 * 6) {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const sig = createHmac("sha256", secret()).update(`${projectId}.${exp}`).digest("base64url").slice(0, 32);
  return `${exp}.${sig}`;
}
export function verifyPreview(projectId: string, token: string) {
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  const good = createHmac("sha256", secret()).update(`${projectId}.${exp}`).digest("base64url").slice(0, 32);
  return good.length === sig.length && timingSafeEqual(Buffer.from(good), Buffer.from(sig));
}
