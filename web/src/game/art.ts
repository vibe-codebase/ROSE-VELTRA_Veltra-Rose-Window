/**
 * Rose Window art: a dim nave of carved limestone around a lancet window of hand-made glass.
 * Every texture is painted procedurally at the device's pixel density.
 */
import type { Board, Pigment } from './sim';

export type Palette = { wall: [string, string, string]; stone: string; stoneDark: string; light: string; glassTints: string[]; sky: string };
export const PALETTES: Palette[] = [
  { wall: ['#3b3442', '#241f2b', '#141118'], stone: '#a99c8a', stoneDark: '#5d544a', light: '#ffe6c4', glassTints: ['#d9cdb4', '#c9d3c4', '#cfd6dd', '#e2d2c0'], sky: '#f6c9a8' },
  { wall: ['#3d3a35', '#26231f', '#141210'], stone: '#b8aa92', stoneDark: '#62584b', light: '#fff4d6', glassTints: ['#dfd6bd', '#cfdacb', '#d2dce4', '#e6dac4'], sky: '#fff1cc' },
  { wall: ['#3a2a3a', '#231823', '#120c12'], stone: '#a38f86', stoneDark: '#57464a', light: '#ffc98a', glassTints: ['#d8c2b0', '#c6c4c9', '#cbbfd2', '#dcc0ae'], sky: '#f2a067' },
];

/** The colours light takes on, by pigment set. */
export const LIGHT: Record<number, string> = { 0: '#fff6dc', 1: '#ff4a3d', 2: '#ffc93a', 4: '#4f8bff', 3: '#ff8a26', 5: '#b45cff', 6: '#3fd47a', 7: '#3a2a22' };
/** Deep glass colours for the panes themselves. */
export const GLASS: Record<number, [string, string]> = { 1: ['#c4142c', '#5e0612'], 2: ['#f0a81a', '#8a5205'], 4: ['#1f56c8', '#0b1f5c'] };

export function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return { c, g: c.getContext('2d')! };
}
export function rng(seed: number) {
  let s = Math.imul(seed | 0, 2654435761) >>> 0;
  s ^= s >>> 15; s = Math.imul(s, 0x2c1b3c6d) >>> 0; s ^= s >>> 12;
  s = s >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
export function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export type Layout = { cs: number; ox: number; oy: number; gw: number; gh: number; archH: number };

export const archHeight = (w: number) => { const R = 0.6 * w; return Math.sqrt(R * R - (R - w / 2) ** 2); };
/** A pointed lancet: straight sides of height h below the springing line y, two arcs meeting at the apex. */
function archPath(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const R = 0.6 * w, hA = archHeight(w);
  const aL = Math.atan2(-hA, w / 2 - R) + Math.PI * 2;
  const aR = Math.atan2(-hA, R - w / 2);
  g.beginPath();
  g.moveTo(x, y + h);
  g.lineTo(x, y);
  g.arc(x + R, y, R, Math.PI, aL, false);
  g.arc(x + w - R, y, R, aR, 0, false);
  g.lineTo(x + w, y + h);
  g.closePath();
}

/** The nave: stone courses, the window's carved frame and splayed jambs, a sill and the floor. */
export function naveTexture(p: Palette, W: number, H: number, L: Layout, r: number, seed: number, floorY: number) {
  const { c, g } = canvas(W * r, H * r);
  g.scale(r, r);
  const rand = rng(seed);
  const wall = g.createRadialGradient(W / 2, L.oy + L.gh * 0.4, 40, W / 2, L.oy + L.gh / 2, Math.max(W, H) * 0.8);
  wall.addColorStop(0, p.wall[0]); wall.addColorStop(0.55, p.wall[1]); wall.addColorStop(1, p.wall[2]);
  g.fillStyle = wall; g.fillRect(0, 0, W, H);
  // ashlar courses
  for (let y = 0, row = 0; y < floorY; y += 26, row++) {
    for (let x = -((row % 2) * 30); x < W; x += 60) {
      const shade = 0.03 + rand() * 0.05;
      g.fillStyle = `rgba(255,240,220,${shade})`; g.fillRect(x + 1, y + 1, 58, 24);
      g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, 59, 25);
    }
  }
  // the window's deep splay: light-catching stone around the opening
  const fx = L.ox - 16, fw = L.gw + 32, fh = L.gh + L.archH + 32;
  g.save();
  archPath(g, fx - 10, L.oy, fw + 20, fh - L.archH - 6);
  const splay = g.createLinearGradient(fx - 10, 0, fx + fw + 10, 0);
  splay.addColorStop(0, p.stoneDark); splay.addColorStop(0.08, p.stone); splay.addColorStop(0.92, p.stone); splay.addColorStop(1, p.stoneDark);
  g.fillStyle = splay; g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 2; g.stroke();
  g.restore();
  g.save();
  archPath(g, fx, L.oy, fw, fh - L.archH - 16);
  g.fillStyle = p.stoneDark; g.fill();
  g.restore();
  // sill and floor with a worn edge
  const sill = g.createLinearGradient(0, floorY - 10, 0, floorY + 14);
  sill.addColorStop(0, p.stone); sill.addColorStop(1, p.stoneDark);
  g.fillStyle = sill; g.fillRect(fx - 24, L.oy + L.gh + 12, fw + 48, 14);
  const floor = g.createLinearGradient(0, floorY, 0, H);
  floor.addColorStop(0, '#2b2622'); floor.addColorStop(1, '#0f0d0b');
  g.fillStyle = floor; g.fillRect(0, floorY, W, H - floorY);
  g.strokeStyle = 'rgba(255,230,200,0.06)';
  for (let i = 0; i < 9; i++) { const y = floorY + 8 + i * i * 4; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  for (let i = -6; i <= 6; i++) { g.beginPath(); g.moveTo(W / 2 + i * 22, floorY); g.lineTo(W / 2 + i * 80, H); g.stroke(); }
  return c;
}

/** The glass itself: the lancet opening, every quarry of glass, stone pieces, coloured panes and fixed mirrors, all leaded. */
export function windowTexture(p: Palette, b: Board, L: Layout, W: number, r: number, seed: number) {
  const top = L.oy - L.archH - 4;
  const H = L.gh + L.archH + 8;
  const { c, g } = canvas(W * r, H * r);
  g.scale(r, r);
  g.translate(0, -top);
  const rand = rng(seed);
  const cs = L.cs;
  // the arch head: a small rose of tracery
  g.save();
  archPath(g, L.ox, L.oy + 1, L.gw, 0);
  const sky = g.createLinearGradient(0, L.oy - L.archH, 0, L.oy);
  sky.addColorStop(0, hexA(p.sky, 0.95)); sky.addColorStop(1, hexA(p.glassTints[0], 0.9));
  g.fillStyle = sky; g.fill();
  g.clip();
  const cx = L.ox + L.gw / 2, cy = L.oy - L.archH * 0.42, rr = Math.min(L.gw * 0.28, L.archH * 0.36);
  const jewels = ['#c4142c', '#1f56c8', '#f0a81a', '#2f8a4a', '#7a2bb0', '#1f56c8'];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    g.fillStyle = hexA(jewels[i], 0.85);
    g.beginPath(); g.arc(cx + Math.cos(a) * rr * 0.62, cy + Math.sin(a) * rr * 0.62, rr * 0.36, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = '#f0c75a'; g.beginPath(); g.arc(cx, cy, rr * 0.3, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#2a2420'; g.lineWidth = 3;
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 - Math.PI / 2; g.beginPath(); g.arc(cx + Math.cos(a) * rr * 0.62, cy + Math.sin(a) * rr * 0.62, rr * 0.36, 0, Math.PI * 2); g.stroke(); }
  g.beginPath(); g.arc(cx, cy, rr * 0.3, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.lineWidth = 5; g.strokeStyle = p.stone; g.stroke();
  g.restore();

  for (let y = 0; y < b.h; y++)
    for (let x = 0; x < b.w; x++) {
      const cell = b.cells[y * b.w + x];
      const px = L.ox + x * cs, py = L.oy + y * cs;
      if (cell.k === 'stone') { stoneBlock(g, p, px, py, cs, rand); continue; }
      if (cell.k === 'filter') { jewelPane(g, cell.p, px, py, cs, rand); }
      else quarry(g, p, px, py, cs, rand);
      if (cell.k === 'mirror' && cell.fixed) { /* drawn as its own image so it can shine */ }
    }
  // lead cames over everything
  g.strokeStyle = '#1e1a17'; g.lineCap = 'round';
  for (let x = 0; x <= b.w; x++) { g.lineWidth = x === 0 || x === b.w ? 5 : 3; g.beginPath(); g.moveTo(L.ox + x * cs, L.oy); g.lineTo(L.ox + x * cs, L.oy + L.gh); g.stroke(); }
  for (let y = 0; y <= b.h; y++) { g.lineWidth = y === b.h ? 5 : 3; g.beginPath(); g.moveTo(L.ox, L.oy + y * cs); g.lineTo(L.ox + L.gw, L.oy + y * cs); g.stroke(); }
  g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 0.8;
  for (let x = 1; x < b.w; x++) { g.beginPath(); g.moveTo(L.ox + x * cs - 1, L.oy); g.lineTo(L.ox + x * cs - 1, L.oy + L.gh); g.stroke(); }
  // carved stone frame (mullion moulding) round the opening
  g.save();
  archPath(g, L.ox - 3, L.oy + 1, L.gw + 6, L.gh + 3);
  g.lineWidth = 7; g.strokeStyle = p.stone; g.stroke();
  g.lineWidth = 1.5; g.strokeStyle = 'rgba(0,0,0,0.5)'; g.stroke();
  g.restore();
  g.strokeStyle = p.stone; g.lineWidth = 6; g.beginPath(); g.moveTo(L.ox - 3, L.oy); g.lineTo(L.ox + L.gw + 3, L.oy); g.stroke();
  return { canvas: c, top };
}

function quarry(g: CanvasRenderingContext2D, p: Palette, x: number, y: number, s: number, rand: () => number) {
  const tint = p.glassTints[Math.floor(rand() * p.glassTints.length)];
  const grd = g.createLinearGradient(x, y, x + s, y + s);
  grd.addColorStop(0, hexA(tint, 0.95)); grd.addColorStop(1, hexA(tint, 0.78));
  g.fillStyle = grd; g.fillRect(x, y, s, s);
  // hand-made glass: seeds (bubbles) and gentle streaks
  for (let i = 0; i < 5; i++) { g.fillStyle = `rgba(255,255,255,${0.15 + rand() * 0.2})`; g.beginPath(); g.arc(x + rand() * s, y + rand() * s, 0.5 + rand() * 1, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = 'rgba(120,100,80,0.12)'; g.lineWidth = 1;
  for (let i = 0; i < 3; i++) { const yy = y + rand() * s; g.beginPath(); g.moveTo(x, yy); g.quadraticCurveTo(x + s / 2, yy + (rand() - 0.5) * 8, x + s, yy + (rand() - 0.5) * 6); g.stroke(); }
  // diamond quarry lead
  g.strokeStyle = 'rgba(40,34,30,0.45)'; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(x + s / 2, y); g.lineTo(x + s, y + s / 2); g.lineTo(x + s / 2, y + s); g.lineTo(x, y + s / 2); g.closePath(); g.stroke();
}

function jewelPane(g: CanvasRenderingContext2D, pig: Pigment, x: number, y: number, s: number, rand: () => number) {
  const [hi, lo] = GLASS[pig];
  const grd = g.createRadialGradient(x + s * 0.35, y + s * 0.3, 2, x + s / 2, y + s / 2, s * 0.8);
  grd.addColorStop(0, hi); grd.addColorStop(1, lo);
  g.fillStyle = grd; g.fillRect(x, y, s, s);
  g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 1.2;
  for (let i = 0; i < 6; i++) { const yy = y + rand() * s; g.beginPath(); g.moveTo(x, yy); g.bezierCurveTo(x + s * 0.3, yy - 6, x + s * 0.6, yy + 6, x + s, yy + (rand() - 0.5) * 6); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,0.25)';
  g.beginPath(); g.ellipse(x + s * 0.3, y + s * 0.25, s * 0.16, s * 0.06, -0.6, 0, Math.PI * 2); g.fill();
}

function stoneBlock(g: CanvasRenderingContext2D, p: Palette, x: number, y: number, s: number, rand: () => number) {
  const grd = g.createLinearGradient(x, y, x + s, y + s);
  grd.addColorStop(0, p.stone); grd.addColorStop(1, p.stoneDark);
  g.fillStyle = grd; g.fillRect(x, y, s, s);
  // carved quatrefoil
  const cx = x + s / 2, cy = y + s / 2, rr = s * 0.17;
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1.6;
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; g.beginPath(); g.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, rr, 0, Math.PI * 2); g.stroke(); }
  g.strokeStyle = 'rgba(255,240,220,0.18)'; g.lineWidth = 1;
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; g.beginPath(); g.arc(cx + Math.cos(a) * rr + 0.8, cy + Math.sin(a) * rr + 0.8, rr, Math.PI, Math.PI * 1.6); g.stroke(); }
  for (let i = 0; i < 12; i++) { g.fillStyle = `rgba(0,0,0,${rand() * 0.15})`; g.fillRect(x + rand() * s, y + rand() * s, 1.5, 1.5); }
}

/** A mirror plate drawn horizontally, to be rotated ±45° into place. Fixed mirrors are gilded. */
export function mirrorTexture(cs: number, r: number, kind: 'mirror' | 'fixed' | 'split') {
  const len = cs * 1.22, th = kind === 'split' ? 5 : 7;
  const { c, g } = canvas((len + 8) * r, (th + 14) * r);
  g.scale(r, r);
  const x = 4, y = 7;
  if (kind === 'split') {
    const grd = g.createLinearGradient(0, y, 0, y + th);
    grd.addColorStop(0, 'rgba(255,255,255,0.85)'); grd.addColorStop(0.5, 'rgba(210,225,240,0.45)'); grd.addColorStop(1, 'rgba(255,255,255,0.8)');
    g.fillStyle = grd; g.fillRect(x, y, len, th);
    g.strokeStyle = 'rgba(40,40,60,0.6)'; g.lineWidth = 1; g.strokeRect(x, y, len, th);
    g.strokeStyle = 'rgba(80,90,120,0.45)'; g.lineWidth = 0.8;
    for (let i = 4; i < len; i += 5) { g.beginPath(); g.moveTo(x + i, y); g.lineTo(x + i - 3, y + th); g.stroke(); }
  } else {
    const frame = kind === 'fixed' ? ['#f6d77a', '#9a6a14'] : ['#e6e2da', '#6f6a66'];
    const fr = g.createLinearGradient(0, y - 2, 0, y + th + 2);
    fr.addColorStop(0, frame[0]); fr.addColorStop(1, frame[1]);
    g.fillStyle = fr; g.beginPath(); g.roundRect(x - 2, y - 2, len + 4, th + 4, 3); g.fill();
    const glass = g.createLinearGradient(x, 0, x + len, 0);
    glass.addColorStop(0, '#c9d4de'); glass.addColorStop(0.35, '#ffffff'); glass.addColorStop(0.5, '#aebccb'); glass.addColorStop(1, '#e8eef4');
    g.fillStyle = glass; g.fillRect(x + 1, y + 1, len - 2, th - 2);
    g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 0.8; g.strokeRect(x - 2, y - 2, len + 4, th + 4);
    if (kind === 'fixed') { g.fillStyle = '#5a3b08'; for (const px of [x + 3, x + len - 3]) { g.beginPath(); g.arc(px, y + th / 2, 1.6, 0, Math.PI * 2); g.fill(); } }
  }
  return c;
}

/** A round medallion: the colour it wants shows as the rim; the centre holds a fleur-de-lis. */
export function medallionTexture(want: Pigment, cs: number, r: number, lit: boolean) {
  const size = cs * (lit ? 1.9 : 1);
  const { c, g } = canvas(size * r, size * r);
  g.scale(r, r);
  const cx = size / 2, cy = size / 2, rad = cs * 0.38;
  const col = LIGHT[want];
  if (lit) {
    const halo = g.createRadialGradient(cx, cy, rad * 0.4, cx, cy, size / 2);
    halo.addColorStop(0, hexA(col === '#fff6dc' ? '#fff3c4' : col, 0.8)); halo.addColorStop(1, hexA(col, 0));
    g.fillStyle = halo; g.fillRect(0, 0, size, size);
  }
  // rim in the wanted colour
  g.fillStyle = want === 0 ? '#e9dfc4' : col;
  g.beginPath(); g.arc(cx, cy, rad, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#1e1a17'; g.lineWidth = 2.4; g.stroke();
  const inner = g.createRadialGradient(cx - rad * 0.2, cy - rad * 0.25, 1, cx, cy, rad * 0.75);
  if (lit) { inner.addColorStop(0, '#ffffff'); inner.addColorStop(0.5, '#fff1c4'); inner.addColorStop(1, want === 0 ? '#f2d58a' : col); }
  else { inner.addColorStop(0, '#5a5048'); inner.addColorStop(1, '#2a2420'); }
  g.fillStyle = inner;
  g.beginPath(); g.arc(cx, cy, rad * 0.74, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#1e1a17'; g.lineWidth = 1.6; g.stroke();
  // fleur-de-lis
  g.save(); g.translate(cx, cy); g.scale(rad / 18, rad / 18);
  g.fillStyle = lit ? 'rgba(120,70,10,0.8)' : hexA(want === 0 ? '#e9dfc4' : col, 0.55);
  g.beginPath();
  g.moveTo(0, -11); g.bezierCurveTo(4, -6, 4, -1, 0, 3); g.bezierCurveTo(-4, -1, -4, -6, 0, -11);
  g.moveTo(-2, 1); g.bezierCurveTo(-8, -6, -12, 0, -8, 4); g.bezierCurveTo(-6, 6, -3, 4, -2, 3);
  g.moveTo(2, 1); g.bezierCurveTo(8, -6, 12, 0, 8, 4); g.bezierCurveTo(6, 6, 3, 4, 2, 3);
  g.rect(-5, 4, 10, 2.2);
  g.moveTo(-1.5, 6); g.lineTo(1.5, 6); g.lineTo(2.5, 11); g.lineTo(-2.5, 11); g.closePath();
  g.fill();
  g.restore();
  return c;
}

/** The sun outside the glass. */
export function sunTexture(rad: number, r: number, color: string) {
  const size = rad * 4;
  const { c, g } = canvas(size * r, size * r);
  g.scale(r, r);
  const cx = size / 2, cy = size / 2;
  const halo = g.createRadialGradient(cx, cy, rad * 0.3, cx, cy, size / 2);
  halo.addColorStop(0, hexA(color, 0.9)); halo.addColorStop(0.35, hexA(color, 0.35)); halo.addColorStop(1, hexA(color, 0));
  g.fillStyle = halo; g.fillRect(0, 0, size, size);
  g.strokeStyle = hexA('#fff4d0', 0.75); g.lineCap = 'round';
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.lineWidth = i % 2 ? 1.4 : 2.4; g.beginPath(); g.moveTo(cx + Math.cos(a) * rad * 1.15, cy + Math.sin(a) * rad * 1.15); g.lineTo(cx + Math.cos(a) * rad * (i % 2 ? 1.5 : 1.75), cy + Math.sin(a) * rad * (i % 2 ? 1.5 : 1.75)); g.stroke(); }
  const core = g.createRadialGradient(cx - rad * 0.2, cy - rad * 0.2, 1, cx, cy, rad);
  core.addColorStop(0, '#ffffff'); core.addColorStop(0.6, '#fff0b8'); core.addColorStop(1, '#ffc65a');
  g.fillStyle = core; g.beginPath(); g.arc(cx, cy, rad, 0, Math.PI * 2); g.fill();
  return c;
}

export function dotTexture(color: string, rad: number, r: number, core = 0.3) {
  const { c, g } = canvas(rad * 2 * r, rad * 2 * r);
  g.scale(r, r);
  const grd = g.createRadialGradient(rad, rad, 0, rad, rad, rad);
  grd.addColorStop(0, color); grd.addColorStop(core, hexA(color, 0.5)); grd.addColorStop(1, hexA(color, 0));
  g.fillStyle = grd; g.fillRect(0, 0, rad * 2, rad * 2);
  return c;
}
