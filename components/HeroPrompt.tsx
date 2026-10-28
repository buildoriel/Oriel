"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { motionOk } from "./Motion";

/**
 * The home page prompt. While it is empty, unfocused and on screen, the placeholder types out example
 * requests one after another, so visitors see what they can ask for. Static with reduced motion.
 */
export function HeroPrompt({ examples, className, noteClassName }: { examples: string[]; className?: string; noteClassName?: string }) {
  const [placeholder, setPlaceholder] = useState(examples[0]);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const ref = useRef<HTMLFormElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const pos = useRef({ i: 0, n: examples[0].length, dir: -1 as 1 | -1 });

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (paused || !visible || !motionOk()) return;
    let t: ReturnType<typeof setTimeout>;
    // start by holding the first example, then erase and type the next
    const step = () => {
      const p = pos.current, text = examples[p.i];
      p.n += p.dir;
      if (p.dir === 1 && p.n >= text.length) { p.n = text.length; p.dir = -1; setPlaceholder(text); t = setTimeout(step, 2400); return; }
      if (p.dir === -1 && p.n <= 0) { p.i = (p.i + 1) % examples.length; p.n = 0; p.dir = 1; setPlaceholder(""); t = setTimeout(step, 350); return; }
      setPlaceholder(text.slice(0, p.n));
      t = setTimeout(step, p.dir === 1 ? 26 + Math.random() * 30 : 12);
    };
    t = setTimeout(step, pos.current.dir === -1 && pos.current.n === examples[pos.current.i].length ? 2400 : 400);
    return () => clearTimeout(t);
  }, [paused, visible, examples]);

  // stop on focus or once something is typed; resume when left empty
  const sync = () => {
    const stop = document.activeElement === area.current || !!area.current?.value;
    if (stop) { const p = pos.current; p.n = examples[p.i].length; p.dir = -1; setPlaceholder(examples[p.i]); }
    setPaused(stop);
  };

  return (
    <form ref={ref} className={`composer ${className ?? ""}`} action="/workspace/new">
      <textarea ref={area} name="prompt" rows={2} required maxLength={2000} aria-label="What do you want to build"
        placeholder={placeholder} onFocus={sync} onBlur={sync} onInput={sync} />
      <div className="composer-foot">
        <span className={`small mute ${noteClassName ?? ""}`}><Icon name="spark" size={14} />60 free credits every month. No credit card.</span>
        <button className="send" type="submit" aria-label="Start building"><Icon name="arrowUp" /></button>
      </div>
    </form>
  );
}
