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
