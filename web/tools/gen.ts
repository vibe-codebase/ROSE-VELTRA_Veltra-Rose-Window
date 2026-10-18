/**
 * Puzzle generator for Rose Window (offline tool, not shipped).
 * It lays light paths first (the solution), then scrambles the mirrors and keeps boards whose exact
 * minimum number of taps falls in the wanted range. Output is pasted into src/game/levels.ts.
 * Usage: npx tsx tools/gen.ts
 */
import { boardText, DX, DY, inside, reflect, solve, trace, rotatable, type Board, type Cell, type Dir, type Pigment, type Sun } from '../src/game/sim';

function rng(seed: number) {
  let s = Math.imul(seed | 0, 2654435761) >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

type Spec = { w: number; h: number; targets: Pigment[]; splitters?: number; suns?: number; decoys: number; stones: number; fixed?: number; par: [number, number]; turns: [number, number] };

function attempt(spec: Spec, rand: () => number): { board: Board; par: number; solutions: number; turns: number } | null {
  const { w, h } = spec;
  const cells: Cell[] = Array.from({ length: w * h }, () => ({ k: 'glass' }) as Cell);
  const used = new Uint8Array(w * h); // 1 = a beam passes through (must stay glass), 2 = occupied by a piece
  const at = (x: number, y: number) => y * w + x;
  const ri = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
  const suns: Sun[] = [];
  const edgeSun = (): Sun => {
    const side = ri(0, 3);
    if (side === 0) return { x: 0, y: ri(0, h - 1), dir: 0 };
    if (side === 1) return { x: ri(0, w - 1), y: 0, dir: 1 };
    if (side === 2) return { x: w - 1, y: ri(0, h - 1), dir: 2 };
    return { x: ri(0, w - 1), y: h - 1, dir: 3 };
  };
  for (let i = 0; i < (spec.suns ?? 1); i++) suns.push(edgeSun());
  // keep suns mostly entering from the top or sides, like daylight
  let totalTurns = 0;
  const starts: { x: number; y: number; d: Dir; p: Pigment }[] = suns.map((s) => ({ x: s.x, y: s.y, d: s.dir, p: 0 }));
  const branchPoints: { x: number; y: number; d: Dir; p: Pigment }[] = [];

  const walk = (x: number, y: number, d: Dir, p: Pigment, want: Pigment): boolean => {
    const turns = ri(spec.turns[0], spec.turns[1]);
    const need = () => want & ~p;
    for (let t = 0; t <= turns; t++) {
      const run = ri(t === 0 ? 0 : 1, 3);
      for (let k = 0; k < run; k++) {
        if (!inside({ w, h } as Board, x, y)) return false;
        const i = at(x, y);
        if (used[i] === 2) return false;
        if (need() && used[i] === 0 && rand() < 0.75) {
          const opts = [1, 2, 4].filter((q) => need() & q);
          const q = opts[ri(0, opts.length - 1)];
          cells[i] = { k: 'filter', p: q }; used[i] = 2; p |= q;
        } else used[i] = 1;
        x += DX[d]; y += DY[d];
      }
      if (!inside({ w, h } as Board, x, y)) return false;
      const i = at(x, y);
      if (used[i] !== 0) return false;
      if (t === turns) {
        if (need()) {
          // finish the colour on the last cell before the medallion if possible
          return false;
        }
        cells[i] = { k: 'target', want }; used[i] = 2;
        return true;
      }
      const slash = rand() < 0.5;
      const isSplit = spec.splitters && branchPoints.length < (spec.splitters ?? 0) && rand() < 0.5;
      cells[i] = isSplit ? { k: 'split', slash } : { k: 'mirror', slash, fixed: false }; used[i] = 2;
      if (isSplit) branchPoints.push({ x, y, d: reflect(d, slash), p });
      // through-going direction for a splitter is straight; we follow the reflection for this path
      const nd = isSplit ? d : reflect(d, slash);
      if (isSplit) { branchPoints[branchPoints.length - 1].d = reflect(d, slash); }
      d = nd; x += DX[d]; y += DY[d];
      totalTurns++;
    }
    return false;
  };

  for (let ti = 0; ti < spec.targets.length; ti++) {
    const want = spec.targets[ti];
    let src: { x: number; y: number; d: Dir; p: Pigment };
    if (ti < starts.length) src = starts[ti];
    else if (branchPoints.length) { const b = branchPoints.shift()!; src = { x: b.x + DX[b.d], y: b.y + DY[b.d], d: b.d, p: b.p }; }
    else return null;
    if (!walk(src.x, src.y, src.d, src.p, want)) return null;
  }
  if (branchPoints.length) return null; // every splitter must feed a medallion
  const pieces: number[] = [];
  cells.forEach((c, i) => { if (rotatable(c)) pieces.push(i); });
  // gilded fixed mirrors: convert a few path mirrors into fixed ones
  for (let f = 0; f < (spec.fixed ?? 0) && pieces.length > 2; f++) {
    const k = ri(0, pieces.length - 1); const c = cells[pieces[k]];
    if (c.k === 'mirror') { c.fixed = true; pieces.splice(k, 1); }
  }
  const free = () => { const out: number[] = []; used.forEach((u, i) => { if (u === 0) out.push(i); }); return out; };
  for (let k = 0; k < spec.decoys; k++) { const f = free(); if (!f.length) break; const i = f[ri(0, f.length - 1)]; cells[i] = { k: 'mirror', slash: rand() < 0.5, fixed: false }; used[i] = 2; }
  for (let k = 0; k < spec.stones; k++) { const f = free(); if (!f.length) break; const i = f[ri(0, f.length - 1)]; cells[i] = { k: 'stone' }; used[i] = 2; }

  const board: Board = { w, h, cells, suns };
  if (!trace(board).solved) return null;
  // scramble the turning pieces
  const rot = cells.map((c, i) => (rotatable(c) ? i : -1)).filter((i) => i >= 0);
  if (rot.length > 16) return null;
  for (const i of rot) if (rand() < 0.6) (cells[i] as { slash: boolean }).slash = !(cells[i] as { slash: boolean }).slash;
  if (trace(board).solved) return null;
  const s = solve(board);
  if (!s) return null;
  if (s.par < spec.par[0] || s.par > spec.par[1] || s.solutions > 4) return null;
  return { board, par: s.par, solutions: s.solutions, turns: totalTurns };
}

export function generate(spec: Spec, seed: number, tries = 4000) {
  const rand = rng(seed);
  let best: ReturnType<typeof attempt> = null;
  let attempts = 0; void attempts;
  for (let i = 0; i < tries; i++) {
    const a = attempt(spec, rand);
    attempts++;
    if (!a) continue;
    // prefer more turning and fewer alternative solutions
    const q = a.turns * 2 - a.solutions + a.par;
    const bq = best ? best.turns * 2 - best.solutions + best.par : -1e9;
    if (q > bq) best = a;
    if (i > 600 && best) break;
  }
  return best;
}

const Rc = 1, Yc = 2, Bc = 4;
const PLAN: { id: string; spec: Spec }[] = [
  // Dawn: clear light and mirrors
  { id: 'dawn-1', spec: { w: 4, h: 5, targets: [0], decoys: 0, stones: 1, par: [1, 1], turns: [1, 1] } },
  { id: 'dawn-2', spec: { w: 4, h: 5, targets: [0], decoys: 1, stones: 1, par: [2, 2], turns: [2, 2] } },
  { id: 'dawn-3', spec: { w: 5, h: 6, targets: [0], decoys: 2, stones: 2, par: [2, 3], turns: [2, 3] } },
  { id: 'dawn-4', spec: { w: 5, h: 6, targets: [0], decoys: 2, stones: 2, fixed: 1, par: [3, 3], turns: [3, 4] } },
  { id: 'dawn-5', spec: { w: 5, h: 6, targets: [0, 0], suns: 2, decoys: 2, stones: 2, par: [3, 4], turns: [1, 2] } },
  { id: 'dawn-6', spec: { w: 5, h: 7, targets: [0, 0], suns: 2, decoys: 3, stones: 2, fixed: 1, par: [3, 5], turns: [2, 3] } },
  { id: 'dawn-7', spec: { w: 6, h: 7, targets: [0], decoys: 4, stones: 3, fixed: 2, par: [3, 5], turns: [3, 5] } },
  { id: 'dawn-8', spec: { w: 6, h: 8, targets: [0, 0], suns: 2, decoys: 4, stones: 3, fixed: 2, par: [4, 6], turns: [2, 4] } },
  // Noon: coloured glass
  { id: 'noon-1', spec: { w: 4, h: 5, targets: [Rc], decoys: 1, stones: 1, par: [1, 2], turns: [1, 2] } },
  { id: 'noon-2', spec: { w: 5, h: 6, targets: [Bc], decoys: 2, stones: 1, par: [2, 3], turns: [2, 2] } },
  { id: 'noon-3', spec: { w: 5, h: 6, targets: [Rc | Yc], decoys: 2, stones: 2, par: [2, 3], turns: [2, 3] } },
  { id: 'noon-4', spec: { w: 5, h: 7, targets: [Yc, Bc], suns: 2, decoys: 2, stones: 2, par: [3, 4], turns: [1, 2] } },
  { id: 'noon-5', spec: { w: 5, h: 7, targets: [Yc | Bc], decoys: 3, stones: 2, fixed: 1, par: [3, 5], turns: [2, 4] } },
  { id: 'noon-6', spec: { w: 6, h: 7, targets: [Rc | Bc, Yc], suns: 2, decoys: 3, stones: 2, fixed: 1, par: [3, 6], turns: [2, 3] } },
  { id: 'noon-7', spec: { w: 6, h: 8, targets: [Rc | Yc, Bc | Yc], suns: 2, decoys: 3, stones: 3, fixed: 1, par: [3, 6], turns: [2, 3] } },
  { id: 'noon-8', spec: { w: 6, h: 8, targets: [Rc, Yc | Bc, Rc | Bc], suns: 3, decoys: 3, stones: 3, fixed: 2, par: [4, 7], turns: [1, 3] } },
  // Vespers: half-silvered glass splits the light
  { id: 'vesper-1', spec: { w: 5, h: 6, targets: [0, 0], splitters: 1, decoys: 1, stones: 2, par: [2, 3], turns: [1, 2] } },
  { id: 'vesper-2', spec: { w: 5, h: 6, targets: [Rc, Bc], splitters: 1, decoys: 2, stones: 2, par: [3, 3], turns: [1, 2] } },
  { id: 'vesper-3', spec: { w: 5, h: 7, targets: [Yc, Rc | Yc], splitters: 1, decoys: 2, stones: 2, fixed: 1, par: [3, 4], turns: [2, 2] } },
  { id: 'vesper-4', spec: { w: 6, h: 7, targets: [0, Bc | Yc], splitters: 1, decoys: 3, stones: 2, fixed: 1, par: [3, 6], turns: [2, 3] } },
  { id: 'vesper-5', spec: { w: 6, h: 7, targets: [Rc, Yc, Bc], splitters: 2, decoys: 2, stones: 2, par: [4, 5], turns: [1, 2] } },
  { id: 'vesper-6', spec: { w: 6, h: 8, targets: [Rc | Bc, Yc, 0], splitters: 2, decoys: 3, stones: 3, fixed: 1, par: [4, 7], turns: [1, 3] } },
  { id: 'vesper-7', spec: { w: 6, h: 8, targets: [Rc | Yc, Bc, Yc | Bc], suns: 2, splitters: 1, decoys: 3, stones: 3, fixed: 2, par: [4, 7], turns: [1, 3] } },
  { id: 'vesper-8', spec: { w: 6, h: 8, targets: [Rc, Yc | Bc, Rc | Bc, Yc], suns: 2, splitters: 2, decoys: 2, stones: 2, fixed: 2, par: [5, 8], turns: [1, 3] } },
];

if (process.argv[1]?.endsWith('gen.ts')) {
  const only = process.argv[2];
  for (const { id, spec } of PLAN) {
    if (only && !id.startsWith(only)) continue;
    let res = null, seed = 1;
    for (; seed < 400 && !res; seed++) res = generate(spec, seed * 7919 + id.length * 31);
    if (!res) { console.log(`// ${id}: FAILED`); continue; }
    console.log(JSON.stringify({ id, rows: boardText(res.board), suns: res.board.suns, par: res.par, solutions: res.solutions, turns: res.turns }));
  }
}
