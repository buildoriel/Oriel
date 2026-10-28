// Kurasi showcase halaman utama. Hanya proyek yang pemiliknya mencentang "Boleh tampil di showcase".
//   npx tsx --env-file=.env.local scripts/showcase.ts                 (daftar kandidat)
//   npx tsx --env-file=.env.local scripts/showcase.ts add <slug>
//   npx tsx --env-file=.env.local scripts/showcase.ts remove <slug>
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const [op, slug] = process.argv.slice(2);
  if (op === "add" || op === "remove") {
    const { data, error } = await db.from("projects").update({ featured_at: op === "add" ? new Date().toISOString() : null })
      .eq("slug", slug).eq("showcase_opt_in", true).not("published_version", "is", null).select("slug");
    if (error) throw error;
    return console.log(data?.length ? `${op === "add" ? "ditampilkan" : "diturunkan"}: ${slug}` : `tidak diubah: ${slug} belum tayang atau pemilik belum mengizinkan showcase`);
  }
  const { data } = await db.from("projects").select("slug, name, featured_at, updated_at").eq("showcase_opt_in", true)
    .not("published_version", "is", null).order("updated_at", { ascending: false }).limit(50);
  for (const p of data ?? []) console.log(`${p.featured_at ? "*" : " "} ${p.slug.padEnd(40)} ${p.name}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
