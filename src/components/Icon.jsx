// Kleine Inline-Icons im einheitlichen Strichstil (24er-Raster, currentColor).
//
// Warum nicht Emojis: 🔥 🃏 ⚡ sehen auf iOS, Android und Windows jeweils völlig
// anders aus, lassen sich nicht einfärben und wechseln nicht mit in den
// Dusk-Modus. Diese Icons erben die Textfarbe und bleiben überall gleich.
// Bewusst ohne Icon-Bibliothek – ein Dutzend Pfade rechtfertigt keine Abhängigkeit.
const PATHS = {
  flame: 'M12 3c.5 3-1.5 4.5-3 6.5C7.7 11.2 7 12.8 7 14.5 7 17.5 9.2 20 12 20s5-2.5 5-5.5c0-2-1-3.5-2-4.5-.300 1.5-1 2.5-2 3 .5-3-.5-6-1-10Z',
  cards: 'M8 7h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2ZM4 15V7a2 2 0 0 1 2-2h9',
  bolt: 'M13 3 5 13.5h6L10 21l8-10.5h-6L13 3Z',
  chevronDown: 'm6 9 6 6 6-6',
  share: 'M12 15V4m0 0L8 8m4-4 4 4M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5',
  download: 'M12 4v11m0 0-4-4m4 4 4-4M5 19h14',
  upload: 'M12 15V4m0 0L8 8m4-4 4 4M5 19h14',
  mail: 'M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Zm0 .5 8 5.5 8-5.5',
  speaker: 'M11 5 6 9H3v6h3l5 4V5Zm4.5 3.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12',
  stop: 'M7 7h10v10H7Z',
  note: 'M4 20l1-4L16.5 4.5a1.8 1.8 0 0 1 2.5 0l.5.5a1.8 1.8 0 0 1 0 2.5L8 19l-4 1Z',
  play: 'M8 5v14l11-7L8 5Z',
  bulb: 'M9 18h6m-5 3h4M12 3a6 6 0 0 0-3.5 10.9c.7.6 1 1.3 1 2.1h5c0-.8.3-1.5 1-2.1A6 6 0 0 0 12 3Z',
  mic: 'M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm-6-3a6 6 0 0 0 12 0M12 18v3',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14',
  repeat: 'M4 12a8 8 0 0 1 13.5-5.8L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.5 5.8L4 15.5M4 20v-4.5h4.5',
  file: 'M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 0v5h5',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z',
  warning: 'M12 4 2.5 20h19L12 4Zm0 6v4m0 3h.01',
  ban: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM5.6 5.6l12.8 12.8',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v5l3 2',
  brain: 'M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 4.5A3 3 0 0 0 9 20h.5V4H9Zm6 0a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 4.5A3 3 0 0 1 15 20h-.5V4H15Z',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-3.5a.500.5 0 1 0 0-1 .5.5 0 0 0 0 1Z',
};

export default function Icon({ name, size = 18, style }) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0, ...style }}
    >
      <path d={d} />
    </svg>
  );
}
