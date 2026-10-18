type P = { size?: number };
const s = (size = 22) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const });

export const Pause = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M9 6.5v11M15 6.5v11" /></svg>;
export const Back = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M14.5 5.5 8 12l6.5 6.5" /></svg>;
export const Next = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M9.5 5.5 16 12l-6.5 6.5" /></svg>;
export const Undo = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M9 7 4.5 11.5 9 16" /><path d="M5 11.5h9a5 5 0 0 1 0 10h-2" /></svg>;
export const Restart = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" /><path d="M4 4.5v3.5h3.5" /></svg>;
export const Gear = ({ size }: P) => (
  <svg {...s(size)} aria-hidden><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" /></svg>
);
/** A lancet window outline. */
export const Window = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M6 21V10a6 6 0 0 1 12 0v11z" /><path d="M12 4.5V21M6 13h12" /></svg>;
export const Sun = ({ size }: P) => <svg {...s(size)} aria-hidden><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" /><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" /></svg>;
/** Stars are candles: lit or waiting. */
export const Candle = ({ size = 22, lit }: P & { lit?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    {lit && <ellipse cx="12" cy="6.5" rx="6" ry="7" fill="rgba(255,200,90,.28)" />}
    {lit ? <path d="M12 1.8c1.6 2.4 2.6 3.8 2.6 5.3a2.6 2.6 0 0 1-5.2 0c0-1.5 1-2.9 2.6-5.3z" fill="#ffd36b" /> : <path d="M12 7v3" stroke="rgba(244,234,210,.45)" strokeWidth="1.2" />}
    {lit && <path d="M12 4.6c.7 1.1 1.1 1.8 1.1 2.5a1.1 1.1 0 0 1-2.2 0c0-.7.4-1.4 1.1-2.5z" fill="#fff6dc" />}
    <rect x="8.6" y="10" width="6.8" height="11.5" rx="1.2" fill={lit ? '#f4ead2' : 'rgba(244,234,210,.22)'} stroke={lit ? '#d4a640' : 'rgba(212,166,64,.45)'} strokeWidth="1" />
    {lit && <path d="M10.2 10v4.5" stroke="rgba(212,166,64,.6)" strokeWidth=".8" />}
  </svg>
);
