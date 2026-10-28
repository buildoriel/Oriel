import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
// AES-256-GCM. CONNECTOR_ENCRYPTION_KEY = 32 bytes base64 (openssl rand -base64 32)
const key = () => {
  const k = Buffer.from(process.env.CONNECTOR_ENCRYPTION_KEY ?? "", "base64");
  if (k.length !== 32) throw new Error("CONNECTOR_ENCRYPTION_KEY must be 32 bytes base64");
  return k;
};
export function encrypt(plain: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `v1.${iv.toString("base64")}.${c.getAuthTag().toString("base64")}.${data.toString("base64")}`;
}
export function decrypt(enc: string) {
  const [v, iv, tag, data] = enc.split(".");
  if (v !== "v1") throw new Error("unknown token format");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(data, "base64")), d.final()]).toString("utf8");
}
