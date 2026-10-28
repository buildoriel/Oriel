import Link from "next/link";
import { OrielIcon } from "@/components/Logo";
import { admin } from "@/lib/supabase/admin";
import { ROOT_DOMAIN } from "@/lib/config";

export const revalidate = 300;

/** Showcase: proyek yang pemiliknya ikut showcase DAN dipilih tim Oriel (featured_at diisi). */
async function featured() {
  try {
    const { data } = await admin().from("projects").select("id, name, slug")
      .eq("showcase_opt_in", true).not("featured_at", "is", null).not("published_version", "is", null)
      .order("featured_at", { ascending: false }).limit(6);
    return (data ?? []) as { id: string; name: string; slug: string }[];
  } catch { return []; }
}

export default async function Home() {
  const show = await featured();
  return (
    <section className="page">
      <div className="hero">
        <div>
          <h1>Build anything. Own a piece of it.</h1>
          <p className="lead">Ceritakan apa yang kamu mau. Oriel membangunnya, menayangkannya dengan link, dan kamu bisa terus mengubahnya lewat chat.</p>
          <form className="prompt" action="/workspace/new">
            <input name="prompt" aria-label="Apa yang mau kamu buat" placeholder="Web portofolio untuk studio keramik saya" />
            <button className="pill ink" type="submit">Build</button>
          </form>
          <p className="mono mute" style={{ marginTop: 14 }}>Gratis 60 kredit per bulan. Tanpa kartu kredit.</p>
        </div>
        <div className="build" aria-label="Contoh proses build">
          <div className="bh"><OrielIcon size={18} /><span className="url">tanahliat.buildoriel.com</span><span className="mono mute">142 / 210</span></div>
          <div className="blocks"><div className="blk done w2" /><div className="blk done w4" /><div className="blk done w6" /><div className="blk done w3" /><div className="blk lit w3" /><div className="blk w4" /><div className="blk w2" /></div>
          <ol className="steps">
            <li><span>Rencana halaman</span><span>selesai</span></li><li><span>Hero + navigasi</span><span>selesai</span></li>
            <li className="now"><span>Galeri karya</span><span>menulis</span></li><li><span>Form kontak</span><span>antre</span></li>
          </ol>
        </div>
      </div>
      <div className="grid trio">
        {[["Web apa saja", "Landing page, toko online, blog, web komunitas, web bisnis. Langsung live di subdomain sendiri.", ["Portofolio", "Toko", "Blog"]],
          ["Alat interaktif", "Dashboard, kalkulator, form, mini-game. Bisa disambungkan ke database Supabase milikmu.", ["Dashboard", "Form", "Game"]],
          ["Desain dan dokumen", "Logo, poster, banner, mockup aplikasi, proposal, deck. Semua bisa diedit lagi lewat chat.", ["Logo", "Poster", "Deck"]]]
          .map(([t, d, k]) => (
            <div className="card" key={t as string}><h3>{t}</h3><p className="mute">{d}</p>
              <div className="kinds">{(k as string[]).map((x) => <span key={x}>{x}</span>)}</div></div>))}
      </div>
      {show.length > 0 && (
        <div style={{ marginTop: 96 }}>
          <h2>Dibuat di Oriel</h2>
          <div className="grid show">{show.map((p) => (
            <a key={p.id} className="card tc" href={`https://${p.slug}.${ROOT_DOMAIN}`} target="_blank" rel="noreferrer">
              <div className="frame"><iframe src={`https://${p.slug}.${ROOT_DOMAIN}`} title={p.name} loading="lazy" tabIndex={-1} aria-hidden="true" sandbox="allow-scripts" /></div>
              <div className="bd"><h3>{p.name}</h3><span className="mono mute">{p.slug}.{ROOT_DOMAIN}</span></div>
            </a>))}</div>
        </div>)}
      <div className="econ">
        <div>
          <h2>Stake instead of subscribe.</h2>
          <p className="mute" style={{ marginTop: 18, maxWidth: "40ch" }}>Kunci $ORIEL senilai harga tier, pakai kreditnya setiap bulan, tarik kembali kapan saja. Staker juga menerima bagian dari margin dalam stablecoin.</p>
          <Link className="pill" style={{ marginTop: 24 }} href="/stake">Hitung nilai stake</Link>
        </div>
        <div className="flow" aria-label="Contoh pembagian margin bulanan">
          <div className="row"><span>Margin kotor bulan lalu</span><span className="mono">$10.000</span></div>
          {[["Kredit untuk staker", "$4.000", 40, ""], ["Bagi hasil ke staker", "$3.000", 30, "a"], ["Operasional", "$1.800", 18, ""], ["Buyback $ORIEL", "$1.200", 12, ""]].map(([l, v, w, c]) => (
            <div className="row" key={l as string}><span>{l}</span><span className="mono">{v}</span><div className="bar2"><i className={c as string} style={{ width: `${w}%` }} /></div></div>))}
        </div>
      </div>
    </section>
  );
}
