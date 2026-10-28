/** Line icons (24px grid, 1.6 stroke, currentColor). One set for the whole app. */
const P: Record<string, string> = {
  plus: "M12 5v14M5 12h14",
  arrowUp: "M12 19V5M6 11l6-6 6 6",
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  stop: "M7 7h10v10H7z",
  menu: "M4 7h16M4 12h16M4 17h16",
  sidebar: "M4 5h16v14H4zM9.5 5v14",
  home: "M4 11l8-6.5 8 6.5V20H4z M10 20v-5h4v5",
  folder: "M3.5 6.5h6l2 2h9v10.5h-17z",
  templates: "M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z",
  plug: "M9 4v4M15 4v4M7 8h10v3a5 5 0 0 1-10 0zM12 16v4",
  layers: "M12 4l8 4-8 4-8-4zM4 12l8 4 8-4M4 16l8 4 8-4",
  card: "M3.5 6h17v12h-17zM3.5 10h17M7 15h4",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0",
  bell: "M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20.5h4",
  external: "M14 4h6v6M20 4l-9 9M18 14v5.5H4.5V6H10",
  refresh: "M20 11a8 8 0 1 0-2.3 5.6M20 5v6h-6",
  monitor: "M3.5 5h17v11h-17zM9 20h6M12 16v4",
  tablet: "M6 3.5h12v17H6zM11 17.5h2",
  phone: "M8 3.5h8v17H8zM11 17.5h2",
  code: "M9 8l-4 4 4 4M15 8l4 4-4 4",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  file: "M6 3.5h8l4 4v13H6zM14 3.5v4h4",
  image: "M4 5h16v14H4zM4 16l5-5 4 4 2.5-2.5L20 17M15 9.5h.01",
  github: "M9 19c-4 1.3-4-2-6-2.5M15 21v-3.5a3 3 0 0 0-.9-2.4c3-.3 6-1.5 6-6.6a5.2 5.2 0 0 0-1.4-3.6 4.8 4.8 0 0 0-.1-3.6s-1.1-.3-3.7 1.4a12.6 12.6 0 0 0-6.6 0C5.7 1 4.6 1.3 4.6 1.3a4.8 4.8 0 0 0-.1 3.6A5.2 5.2 0 0 0 3 8.5c0 5.1 3 6.3 6 6.6a3 3 0 0 0-.9 2.4V21",
  rocket: "M5 15c-1.5 1.5-1.5 4-1.5 4s2.5 0 4-1.5M9.5 14.5l-2-2C9 8 13 4 20 4c0 7-4 11-8.5 12.5zM14.5 9.5h.01",
  cloud: "M7 18.5a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.5 1.5A3.75 3.75 0 0 1 17.5 18.5z",
  database: "M12 4c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
  globe: "M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM3.5 12h17M12 3.5c2.2 2.3 3.3 5.2 3.3 8.5S14.2 18.2 12 20.5C9.8 18.2 8.7 15.3 8.7 12S9.8 5.8 12 3.5z",
  download: "M12 4v11M7 10l5 5 5-5M5 19.5h14",
  tag: "M4 4h7.5l8.5 8.5-7.5 7.5L4 11.5zM8.5 8.5h.01",
  more: "M6 12h.01M12 12h.01M18 12h.01",
  check: "M5 12.5l4.5 4.5L19 7.5",
  x: "M6 6l12 12M18 6L6 18",
  chevronRight: "M9.5 6l6 6-6 6",
  chevronDown: "M6 9.5l6 6 6-6",
  alert: "M12 4l9 16H3zM12 10v4M12 17h.01",
  info: "M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM12 11v5M12 8h.01",
  copy: "M8.5 8.5h11v11h-11zM15.5 8.5v-4h-11v11h4",
  logout: "M14 4.5h5.5v15H14M10 16.5L5.5 12 10 7.5M5.5 12H16",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  link: "M10 14a4.5 4.5 0 0 0 6.4 0l2.6-2.6a4.5 4.5 0 0 0-6.4-6.4L11.5 6M14 10a4.5 4.5 0 0 0-6.4 0L5 12.6A4.5 4.5 0 0 0 11.4 19l1.1-1",
  wallet: "M4 7.5h15.5v12H4zM4 7.5l12-3v3M15.5 13.5h.01",
  shield: "M12 3.5l7.5 3v5.5c0 4.5-3.2 7.6-7.5 8.5-4.3-.9-7.5-4-7.5-8.5V6.5z",
  flag: "M5 21V4M5 4.5h12l-2.5 4 2.5 4H5",
  pencil: "M15 5l4 4L8.5 19.5H4.5v-4z",
  spark: "M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8z",
  chart: "M4.5 19.5h15M7.5 16v-4M12 16V7.5M16.5 16v-6.5",
  store: "M4.5 9.5l1.5-5h12l1.5 5M4.5 9.5h15M5.5 9.5v10h13v-10M10 19.5v-5h4v5",
  pen: "M4 20l4.5-1 11-11-3.5-3.5-11 11zM14 6.5l3.5 3.5",
  deck: "M3.5 4.5h17v11h-17zM12 15.5v4M8 19.5h8",
  palette: "M12 20.5a8.5 8.5 0 1 1 8.5-8.5c0 2.3-1.9 3.2-3.5 3.2H15a1.8 1.8 0 0 0-1.3 3.1c.6.6.3 2.2-1.7 2.2zM7.5 12h.01M9.5 8h.01M14.5 8h.01",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4",
  moon: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z",
  keyboard: "M3.5 6.5h17v11h-17zM7 10h.01M10 10h.01M13 10h.01M16 10h.01M8 14h8",
  book: "M5 4.5h9a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3zM5 16.5a3 3 0 0 1 3-3h9",
  clock: "M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM12 7.5V12l3 2",
  trash: "M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.8 12.5h9.4L17.5 7M10 11v5M14 11v5",
  paperclip: "M19 11.5l-7.2 7.2a4.6 4.6 0 0 1-6.5-6.5l7.6-7.6a3 3 0 0 1 4.3 4.3l-7.5 7.5a1.5 1.5 0 0 1-2.1-2.1l6.9-6.9",
  history: "M4 12a8 8 0 1 0 2.3-5.6M4 4.5v3.5h3.5M12 8v4.2l2.8 1.8",
};

export type IconName = keyof typeof P;

export function Icon({ name, size, className, title }: { name: IconName; size?: number; className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 24 24" data-icon={name} width={size} height={size} className={className} fill="none" stroke="currentColor"
      strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden={title ? undefined : true} role={title ? "img" : undefined}>
      {title && <title>{title}</title>}
      <path d={P[name]} />
    </svg>
  );
}
