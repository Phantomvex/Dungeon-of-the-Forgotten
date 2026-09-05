import type { CSSProperties, ReactNode } from 'react';

export type IconName = 'sword' | 'armory' | 'settings' | 'sound' | 'muted' | 'arrow' | 'back' | 'close' | 'shield' | 'flame' | 'daggers' | 'heart' | 'key' | 'coin' | 'skull' | 'crown' | 'check' | 'lock' | 'pause' | 'play' | 'fullscreen' | 'keyboard' | 'up' | 'down' | 'bolt' | 'clock' | 'map' | 'gate' | 'gem' | 'shop' | 'infinity' | 'ghost' | 'exchange' | 'chest' | 'sprint' | 'save' | 'download' | 'upload' | 'archive';

const paths: Record<IconName, ReactNode> = {
  save: <><path d="M4 3h13l4 4v14H3V3zM7 3v7h10V3M7 21v-8h10v8m-3-17v4" /></>,
  download: <><path d="M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6" /></>,
  upload: <><path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6" /></>,
  archive: <><path d="M3 3h18v5H3zm2 5v13h14V8M9 12h6m-5 3h4" /></>,
  gem: <><path d="m12 2 7 6-2 10-5 4-5-4L5 8zM5 8l7 3 7-3m-7 3V2m0 9v11M7 18l5-7 5 7" /></>,
  shop: <><path d="M3 9h18l-2-6H5zM4 9v12h16V9M9 21v-7h6v7M3 9v3h4V9m2 0v3h6V9m2 0v3h4V9" /></>,
  infinity: <path d="M12 12c-3-6-9-6-9 0s6 6 9 0 9-6 9 0-6 6-9 0Z" />,
  ghost: <><path d="M5 21V9l2-5 5-2 5 2 2 5v12l-4-3-3 3-3-3zM8 9h2v3H8zm6 0h2v3h-2z" /></>,
  exchange: <><path d="M3 7h17m-4-4 4 4-4 4M21 17H4m4-4-4 4 4 4" /></>,
  chest: <><path d="M3 10V6l3-3h12l3 3v15H3zM3 11h18M8 3v8m8-8v8M10 10h4v5h-4zM7 15v6m10-6v6" /></>,
  sprint: <><path d="m13 7 4 5h5M6 10l6-3 2-4h3v3l-3 1-3 8-6 6m6-6 6 1 2 5M2 9h4m-5 4h5" /></>,
  sword: <><path d="m5 19 3-3m-3-3 6 6m-4-4L17 5l3-1-1 3L9 17" /><path d="m4 20 2-1-1-1z" /></>,
  armory: <><path d="m5 3 14 14m-1-4 4 4m-7 1 4 4M19 3 5 17m1-4-4 4m7 1-4 4" /><path d="M5 3v4h4m10-4v4h-4" /></>,
  settings: <><path d="m9 3-1 3-3 1-2 4 2 2v4l4 2 3-1 3 1 4-2v-4l2-2-2-4-3-1-1-3z" /><circle cx="12" cy="11" r="3" /></>,
  sound: <><path d="M4 9h4l5-5v16l-5-5H4zM17 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14" /></>,
  muted: <><path d="M4 9h4l5-5v16l-5-5H4zM17 9l5 6m0-6-5 6" /></>,
  arrow: <><path d="M4 12h15m-6-6 6 6-6 6" /></>,
  back: <><path d="M20 12H5m6-6-6 6 6 6" /></>,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  shield: <><path d="M12 3 4 6v7c0 4 8 8 8 8s8-4 8-8V6z" /><path d="M12 7v10M8 11h8" /></>,
  flame: <path d="M13 2c1 7-6 7-5 12-3-1-3-4-3-4-5 10 5 15 12 10 6-5 0-12 0-12 0 4-3 5-3 5 2-6-1-11-1-11Z" />,
  daggers: <><path d="m3 3 2 8 4 4 2-2-4-4zM8 16l4-4m-2 3 4 5M21 3l-2 8-4 4-2-2 4-4zM16 16l-4-4m2 3-4 5" /></>,
  heart: <path d="M12 20 3 11V6l3-3h3l3 3 3-3h3l3 3v5z" />,
  key: <><path d="m10 14 10-10m-3 3 3 3m-6 0 3 3" /><circle cx="7" cy="17" r="4" /></>,
  coin: <><path d="m8 3-5 5v8l5 5h8l5-5V8l-5-5zM12 7v10m-3-8h5l1 3-6 1 1 3h5" /></>,
  skull: <><path d="M7 20v-4H4V7l4-4h8l4 4v9h-3v4zM10 17v3m4-3v3" /><path d="M7 9h3v3H7zm7 0h3v3h-3zm-3 6 1-2 1 2" /></>,
  crown: <><path d="M4 18 2 6l6 5 4-8 4 8 6-5-2 12zM4 21h16" /></>,
  check: <path d="m5 12 4 4L20 5" />,
  lock: <><path d="M5 10h14v11H5zM8 10V6a4 4 0 0 1 8 0v4m-4 4v3" /></>,
  pause: <><path d="M7 4h3v16H7zm7 0h3v16h-3z" /></>,
  play: <path d="m7 4 13 8-13 8z" />,
  fullscreen: <path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6" />,
  keyboard: <><path d="M2 5h20v14H2zM5 9h1m3 0h1m3 0h1m3 0h2M5 13h1m3 0h1m3 0h1m3 0h2M7 16h10" /></>,
  up: <path d="m6 14 6-6 6 6" />,
  down: <path d="m6 10 6 6 6-6" />,
  bolt: <path d="m14 2-10 12h7l-1 8 10-13h-7z" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 6v6l4 2" /></>,
  map: <><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16m6-14v16" /></>,
  gate: <><path d="M3 21V9l3-5 6-3 6 3 3 5v12M7 21V10l2-3 3-2 3 2 2 3v11M1 21h22M3 10h4m10 0h4M3 15h4m10 0h4M9 3l2 4m4-4-2 4" /><path d="M10 21v-7h4v7" /></>,
};

export default function Icon({ name, size = 20, className = '', style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" className={className} style={style} aria-hidden="true">{paths[name]}</svg>;
}