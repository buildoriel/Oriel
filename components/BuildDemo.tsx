"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { motionOk } from "./Motion";
import s from "./BuildDemo.module.css";

const PROMPT = "A landing page for Ember & Oak, a small coffee roastery. Warm and simple, with our menu and opening hours.";
const STEPS = ["Planning the layout", "Writing the page", "Adding the menu", "Checking it on mobile"];
const MENU: [string, string][] = [["Flat white", "$4.50"], ["Pour over", "$5.00"], ["Cardamom bun", "$3.75"]];
const URL = "ember-oak.buildoriel.com";

// phase: 0 reset · 1 typing · 2-5 one agent step each · 6 reply · 7 published
const HOLD = [700, 0, 1100, 1300, 1300, 1100, 1500, 4200];
const FINAL = 7;

/** Decorative loop of a build in the workspace: prompt, agent steps, live preview, publish. */
export function BuildDemo() {
  const [phase, setPhase] = useState(FINAL);
  const [typed, setTyped] = useState(PROMPT.length);
  const [out, setOut] = useState(false);
  const [running, setRunning] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // play only while on screen (pauses where it is when scrolled away); reduced motion keeps the finished state
  useEffect(() => {
    const el = ref.current;
    if (!el || !motionOk() || !("IntersectionObserver" in window)) return;
    setPhase(0); setTyped(0);
    const io = new IntersectionObserver(([e]) => setRunning(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!running) return;
    let t: ReturnType<typeof setTimeout>;
    if (phase === 1) {
      if (typed < PROMPT.length) t = setTimeout(() => setTyped((n) => n + 1), 22 + Math.random() * 26);
      else t = setTimeout(() => setPhase(2), 450);
    } else if (phase === FINAL) {
      t = setTimeout(() => {
        setOut(true);
        t = setTimeout(() => { setOut(false); setTyped(0); setPhase(0); }, 450);
      }, HOLD[FINAL]);
    } else {
      t = setTimeout(() => setPhase(phase + 1), HOLD[phase]);
    }
    return () => clearTimeout(t);
  }, [running, phase, typed]);

  const on = (p: number) => phase >= p;
  const step = (i: number) => (phase > i + 2 ? "done" : phase === i + 2 ? "run" : "wait");

  return (
    <div ref={ref} className={s.window} data-out={out || undefined} role="img"
      aria-label="Demo: Oriel builds a coffee shop landing page from one sentence, then publishes it.">
      <div className={s.bar}>
        <span className={s.dots}><i /><i /><i /></span>
        <span className={s.title}>Ember &amp; Oak</span>
        <span className={s.publish} data-on={on(7) || undefined}>
          <Icon name={on(7) ? "check" : "globe"} size={13} />{on(7) ? "Live" : "Publish"}
        </span>
      </div>

      <div className={s.body}>
        <div className={s.chat} aria-hidden="true">
          <div className={s.user} data-on={on(1) || undefined}>
            {PROMPT.slice(0, typed)}{phase === 1 && <span className={s.caret} />}
          </div>
          <ol className={s.steps}>
            {STEPS.map((label, i) => (
              <li key={label} className={s.step} data-on={on(i + 2) || undefined} data-state={step(i)}>
                {step(i) === "done" ? <Icon name="check" size={14} /> : <span className="spinner" />}
                {label}
              </li>
            ))}
          </ol>
          <p className={s.reply} data-on={on(6) || undefined}>
            Done. The page has a hero, your menu with prices, and opening hours. It looks good on phones too.
          </p>
          <div className={s.composer}>Ask for a change…</div>
        </div>

        <div className={s.preview} aria-hidden="true">
          <div className={s.url}>
            <span className={s.lock} data-on={on(7) || undefined} />
            <span className={s.urlText}>{on(7) ? URL : "Preview"}</span>
          </div>
          <div className={s.site}>
            <div className={s.empty} data-on={!on(2) || undefined}>Your preview appears here</div>
            <nav className={`${s.part} ${s.nav}`} data-on={on(3) || undefined}>
              <b>Ember &amp; Oak</b><span>Menu</span><span>Visit</span>
            </nav>
            <div className={`${s.part} ${s.hero}`} data-on={on(3) || undefined}>
              <div>
                <h4>Slow coffee, roasted down the street.</h4>
                <p>Small-batch beans, fresh bread, and a quiet corner to sit.</p>
                <span className={s.cta}>See the menu</span>
              </div>
              <div className={s.photo} />
            </div>
            <div className={`${s.part} ${s.menu}`} data-on={on(4) || undefined}>
              {MENU.map(([name, price]) => <div key={name}><span>{name}</span><b>{price}</b></div>)}
            </div>
            <div className={`${s.part} ${s.hours}`} data-on={on(5) || undefined}>Open daily 7am – 5pm · 12 Mill Lane</div>
            <div className={s.skel} data-on={(on(2) && !on(3)) || undefined}><i /><i /><i /><i /></div>
          </div>
          <div className={s.toast} data-on={on(7) || undefined}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path className={s.tick} d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
            Live at {URL}
          </div>
        </div>
      </div>
    </div>
  );
}
