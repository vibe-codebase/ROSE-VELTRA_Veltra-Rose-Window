// Store icon, adaptive-icon layers and splash, painted with the game's own art.
import * as A from '../src/game/art';
import { parseBoard, trace } from '../src/game/sim';

const P = A.PALETTES[1];
const R = 4;

/** A small lit lancet: sunlight turned by a mirror through ruby glass into a medallion. */
function lancet(g: CanvasRenderingContext2D, cx: number, top: number, cs: number) {
  const b = parseBoard(['r\\.', '...', '.\\R'], [{ x: 0, y: 0, dir: 0 }]);
  const gw = b.w * cs, gh = b.h * cs, archH = A.archHeight(gw);
  const L: A.Layout = { cs, ox: cx - gw / 2, oy: top + archH, gw, gh, archH };
  const win = A.windowTexture(P, b, L, cx * 2, R, 7);
  g.drawImage(win.canvas, 0, win.top, (win.canvas.width / R), (win.canvas.height / R));
  const t = trace(b);
  const px = (x: number) => L.ox + (x + 0.5) * cs, py = (y: number) => L.oy + (y + 0.5) * cs;
  g.globalCompositeOperation = 'lighter';
  for (const s of t.segments) {
    const col = A.LIGHT[s.p];
    for (const [w, a] of [[cs * 0.5, 0.12], [cs * 0.22, 0.3], [cs * 0.06, 0.95]] as const) {
      g.strokeStyle = A.hexA(col, a); g.lineWidth = w; g.lineCap = 'round';
      g.beginPath(); g.moveTo(px(s.x0), py(s.y0)); g.lineTo(px(s.x1), py(s.y1)); g.stroke();
    }
  }
  g.globalCompositeOperation = 'source-over';
  // the mirror and the lit medallion
  const m = A.mirrorTexture(cs, R, 'mirror');
  b.cells.forEach((c, i) => {
    const x = i % b.w, y = Math.floor(i / b.w);
    if (c.k === 'mirror') { g.save(); g.translate(px(x), py(y)); g.rotate(c.slash ? -Math.PI / 4 : Math.PI / 4); g.drawImage(m, -m.width / R / 2, -m.height / R / 2, m.width / R, m.height / R); g.restore(); }
    if (c.k === 'target') { const med = A.medallionTexture(c.want, cs, R, true); g.drawImage(med, px(x) - med.width / R / 2, py(y) - med.height / R / 2, med.width / R, med.height / R); }
  });
  const sun = A.sunTexture(cs * 0.3, R, P.light);
  g.globalCompositeOperation = 'lighter';
  g.drawImage(sun, px(0) - cs * 0.95 - sun.width / R / 2, py(0) - sun.height / R / 2, sun.width / R, sun.height / R);
  g.globalCompositeOperation = 'source-over';
  return { gh, archH };
}

function wall(g: CanvasRenderingContext2D, W: number, H: number) {
  const bg = g.createRadialGradient(W / 2, H * 0.45, 20, W / 2, H / 2, Math.max(W, H) * 0.75);
  bg.addColorStop(0, '#3d3a35'); bg.addColorStop(1, '#141210');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2;
  for (let y = 0, row = 0; y < H; y += 52, row++) for (let x = -(row % 2) * 60; x < W; x += 120) g.strokeRect(x, y, 120, 52);
}

export function icon() {
  const { c, g } = A.canvas(1024, 1024);
  wall(g, 1024, 1024);
  g.save(); g.scale(4, 4); lancet(g, 136, 22, 46); g.restore();
  return c;
}
export function adaptive() {
  const { c, g } = A.canvas(1024, 1024);
  g.save(); g.scale(4, 4); lancet(g, 134, 52, 32); g.restore();
  return c;
}
export function adaptiveBg() {
  const { c, g } = A.canvas(1024, 1024);
  wall(g, 1024, 1024);
  return c;
}
export function splash() {
  const W = 1284, H = 2778;
  const { c, g } = A.canvas(W, H);
  wall(g, W, H);
  g.save(); g.scale(4, 4); lancet(g, W / 8 + 8, H / 4 * 0.38, 64); g.restore();
  g.textAlign = 'center';
  g.fillStyle = '#f6d77a';
  g.shadowColor = 'rgba(246,215,122,0.45)'; g.shadowBlur = 40;
  g.font = '700 150px Cinzel, Georgia, serif';
  g.fillText('ROSE WINDOW', W / 2, H * 0.26);
  g.shadowBlur = 0;
  g.font = '700 60px "Alegreya Sans", sans-serif'; try { g.letterSpacing = '36px'; } catch { /* */ } g.fillText('VELTRA', W / 2 + 18, H * 0.26 - 175); try { g.letterSpacing = '0px'; } catch { /* */ }
  g.fillStyle = 'rgba(244,234,210,0.75)';
  g.font = '700 50px Cinzel, Georgia, serif';
  g.fillText('A PUZZLE OF LIGHT', W / 2, H * 0.26 + 100);
  return c;
}
/** The Play Store feature graphic: the lancet window lit on the right, the name on the left. */
export function feature() {
  const W = 1024, H = 500, { c, g } = A.canvas(W, H);
  wall(g, W, H);
  g.save(); g.scale(1.9, 1.9); lancet(g, 368, 12, 34); g.restore();
  const shade = g.createLinearGradient(0, 0, 600, 0); shade.addColorStop(0, 'rgba(14,12,10,0.94)'); shade.addColorStop(0.7, 'rgba(14,12,10,0.7)'); shade.addColorStop(1, 'rgba(14,12,10,0)');
  g.fillStyle = shade; g.fillRect(0, 0, 600, H);
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.font = '700 22px "Alegreya Sans", sans-serif'; g.fillStyle = '#d4a640'; try { g.letterSpacing = '13px'; } catch { /* */ } g.fillText('VELTRA', 58, 116); try { g.letterSpacing = '0px'; } catch { /* */ }
  g.fillStyle = '#f6d77a'; g.shadowColor = 'rgba(246,215,122,0.45)'; g.shadowBlur = 22;
  g.font = '700 72px Cinzel, Georgia, serif'; g.fillText('ROSE', 54, 192); g.fillText('WINDOW', 54, 268); g.shadowBlur = 0;
  g.fillStyle = '#d4a640'; g.fillRect(58, 296, 52, 3);
  g.font = '500 27px "Alegreya Sans", sans-serif'; g.fillStyle = 'rgba(244,234,210,0.95)'; g.fillText('Turn the mirrors. Lead the light.', 58, 344);
  g.font = '700 18px "Alegreya Sans", sans-serif'; g.fillStyle = 'rgba(244,234,210,0.8)'; g.fillText('24 stained-glass windows · Dawn, Noon, Vespers', 58, 380);
  return c;
}
(window as unknown as { brand: unknown }).brand = { icon, adaptive, adaptiveBg, splash, feature };
