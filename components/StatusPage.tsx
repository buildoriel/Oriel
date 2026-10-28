import Link from "next/link";
import { OrielMark } from "./Logo";
import s from "./StatusPage.module.css";

/** Full-page message used by the 404 and error pages. */
export function StatusPage({ code, title, children, actions }: { code: string; title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <main className={s.wrap}>
      <div className={s.box}>
        <Link href="/" aria-label="Oriel home"><OrielMark size={40} /></Link>
        <span className={s.code}>{code}</span>
        <h1 className={s.title}>{title}</h1>
        <p className="lead">{children}</p>
        <div className={s.actions}>{actions}</div>
      </div>
    </main>
  );
}
