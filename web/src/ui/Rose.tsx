import type { Level } from '../game/levels';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
const JEWELS = ['#c4142c', '#1f56c8', '#f0a81a', '#2f8a4a', '#7a2bb0', '#1f56c8', '#c4142c', '#f0a81a'];

/**
 * The level select: each chapter is a rose window of eight lancet petals.
 * Finished petals glow in jewel colours, open ones are clear glass, locked ones are stone.
 */
export function Rose({ levels, stars, open, chapterName, onPick }: { levels: Level[]; stars: (l: Level) => number; open: (l: Level, i: number) => boolean; chapterName: string; onPick: (l: Level) => void }) {
  const petal = 'M0,-30 C10,-42 13,-64 0,-92 C-13,-64 -10,-42 0,-30 Z';
  return (
    <svg className="rose" viewBox="-110 -110 220 220" role="group" aria-label={`${chapterName} window`}>
      <defs>
        <radialGradient id="rose-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#2b2433" /><stop offset="1" stopColor="#120e16" />
        </radialGradient>
        <radialGradient id="glass-clear" cx="50%" cy="40%" r="70%">
          <stop offset="0" stopColor="#f1e6cc" /><stop offset="1" stopColor="#bfb39a" />
        </radialGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" /></filter>
      </defs>
      <circle r="106" fill="#8e8270" />
      <circle r="102" fill="url(#rose-bg)" stroke="#2a2420" strokeWidth="2" />
      {levels.map((l, i) => {
        const st = stars(l), isOpen = open(l, i), a = i * 45;
        const fill = st ? JEWELS[i] : isOpen ? 'url(#glass-clear)' : '#4d443c';
        return (
          <g key={l.id} transform={`rotate(${a})`}>
            {st > 0 && <path d={petal} fill={JEWELS[i]} filter="url(#glow)" opacity=".85" />}
            <path d={petal} fill={fill} stroke="#1e1a17" strokeWidth="2.6" />
            {isOpen && <path d="M0,-34 L0,-88" stroke="rgba(30,26,23,.5)" strokeWidth="1" />}
            {st > 0 && <ellipse cx="-3" cy="-66" rx="2.2" ry="9" fill="rgba(255,255,255,.35)" />}
            <foreignObject x="-24" y="-82" width="48" height="56" transform={`rotate(${-a} 0 -54)`}>
              <button className={`petal ${isOpen ? '' : 'locked'} ${st ? 'done' : ''}`} disabled={!isOpen} onClick={() => onPick(l)}
                aria-label={`${ROMAN[i]}. ${l.name}${isOpen ? '' : ' (locked)'}`} data-testid={`level-${l.id}`}>
                <span className="numeral">{ROMAN[i]}</span>
                <span className="candles">{[0, 1, 2].map((k) => <i key={k} className={k < st ? 'on' : ''} />)}</span>
              </button>
            </foreignObject>
          </g>
        );
      })}
      <circle r="30" fill="#8e8270" stroke="#1e1a17" strokeWidth="2.4" />
      <circle r="24" fill="#f0c75a" stroke="#1e1a17" strokeWidth="2" />
      {Array.from({ length: 8 }, (_, i) => <circle key={i} cx={Math.cos((i * Math.PI) / 4 + Math.PI / 8) * 101} cy={Math.sin((i * Math.PI) / 4 + Math.PI / 8) * 101} r="3.6" fill="#8e8270" stroke="#2a2420" />)}
      <text y="3.5" textAnchor="middle" className="rose-center">{chapterName}</text>
    </svg>
  );
}
