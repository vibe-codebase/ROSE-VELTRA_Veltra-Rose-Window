/**
 * Rose Window light model. Sunlight enters the window and travels cell to cell. Mirrors turn it,
 * half-silvered panes split it, coloured glass stains it, stone stops it. A medallion is lit when
 * light of exactly its colour reaches it. Pure and deterministic, shared by the game, tests and solver.
 */
export type Dir = 0 | 1 | 2 | 3; // E, S, W, N
export const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];

/** Colour is a set of pigments: red 1, yellow 2, blue 4. Clear sunlight is 0. All three is umber, which is dark. */
export type Pigment = number;
export const RED = 1, YELLOW = 2, BLUE = 4, UMBER = 7;
export const COLOR_NAMES: Record<number, string> = { 0: 'sunlight', 1: 'red', 2: 'gold', 4: 'blue', 3: 'orange', 5: 'violet', 6: 'green' };

export type Cell =
  | { k: 'glass' }
  | { k: 'stone' }
  | { k: 'mirror'; slash: boolean; fixed: boolean }      // slash = '/'
  | { k: 'split'; slash: boolean }                        // half-silvered, always rotatable
  | { k: 'filter'; p: Pigment }
  | { k: 'target'; want: Pigment };

export type Sun = { x: number; y: number; dir: Dir };      // x/y is the first cell the light enters
export type Board = { w: number; h: number; cells: Cell[]; suns: Sun[] };
export type Segment = { x0: number; y0: number; x1: number; y1: number; p: Pigment; depth: number };
export type Trace = { segments: Segment[]; hits: Map<number, Set<Pigment>>; lit: boolean[]; solved: boolean };

const idx = (b: Board, x: number, y: number) => y * b.w + x;
export const inside = (b: Board, x: number, y: number) => x >= 0 && y >= 0 && x < b.w && y < b.h;

export function reflect(d: Dir, slash: boolean): Dir {
  // '/' : E→N, N→E, W→S, S→W      '\' : E→S, S→E, W→N, N→W
  if (slash) return ([3, 2, 1, 0] as Dir[])[d];
  return ([1, 0, 3, 2] as Dir[])[d];
}

export function rotatable(c: Cell) { return (c.k === 'mirror' && !c.fixed) || c.k === 'split'; }

/** Follow every beam from every sun. Segments run between cell centres (in cell units). */
export function trace(b: Board): Trace {
  const segments: Segment[] = [];
  const hits = new Map<number, Set<Pigment>>();
  const seen = new Set<string>();
  type Ray = { x: number; y: number; d: Dir; p: Pigment; sx: number; sy: number; depth: number };
  const queue: Ray[] = b.suns.map((s) => ({ x: s.x, y: s.y, d: s.dir, p: 0, sx: s.x - DX[s.dir] * 0.9, sy: s.y - DY[s.dir] * 0.9, depth: 0 }));
  let guard = 0;
  while (queue.length && guard++ < 4000) {
    const r = queue.shift()!;
    let { x, y, d, p } = r;
    let sx = r.sx, sy = r.sy;
    for (;;) {
      if (!inside(b, x, y)) { segments.push({ x0: sx, y0: sy, x1: x - DX[d] * 0.45, y1: y - DY[d] * 0.45, p, depth: r.depth }); break; }
      const key = `${x},${y},${d},${p}`;
      if (seen.has(key)) { segments.push({ x0: sx, y0: sy, x1: x, y1: y, p, depth: r.depth }); break; }
      seen.add(key);
      const c = b.cells[idx(b, x, y)];
      if (c.k === 'stone') { segments.push({ x0: sx, y0: sy, x1: x - DX[d] * 0.5, y1: y - DY[d] * 0.5, p, depth: r.depth }); break; }
      if (c.k === 'target') {
        segments.push({ x0: sx, y0: sy, x1: x, y1: y, p, depth: r.depth });
        const i = idx(b, x, y);
        if (!hits.has(i)) hits.set(i, new Set());
        hits.get(i)!.add(p);
        break;
      }
      if (c.k === 'filter') {
        const np = p | c.p;
        if (np !== p) { segments.push({ x0: sx, y0: sy, x1: x, y1: y, p, depth: r.depth }); sx = x; sy = y; p = np; }
        if (p === UMBER) { segments.push({ x0: x, y0: y, x1: x + DX[d] * 0.3, y1: y + DY[d] * 0.3, p, depth: r.depth }); break; }
      } else if (c.k === 'mirror') {
        segments.push({ x0: sx, y0: sy, x1: x, y1: y, p, depth: r.depth }); sx = x; sy = y;
        d = reflect(d, c.slash);
      } else if (c.k === 'split') {
        segments.push({ x0: sx, y0: sy, x1: x, y1: y, p, depth: r.depth }); sx = x; sy = y;
        const nd = reflect(d, c.slash);
        queue.push({ x: x + DX[nd], y: y + DY[nd], d: nd, p, sx: x, sy: y, depth: r.depth + 1 });
      }
      x += DX[d]; y += DY[d];
    }
  }
  const lit: boolean[] = [];
  let solved = true, any = false;
  b.cells.forEach((c, i) => {
    if (c.k !== 'target') return;
    any = true;
    const h = hits.get(i);
    const ok = !!h && h.has(c.want);
    lit[i] = ok;
    if (!ok) solved = false;
  });
  return { segments, hits, lit, solved: any && solved };
}

export function rotate(b: Board, x: number, y: number): boolean {
  if (!inside(b, x, y)) return false;
  const c = b.cells[idx(b, x, y)];
  if (!rotatable(c)) return false;
  (c as { slash: boolean }).slash = !(c as { slash: boolean }).slash;
  return true;
}

export function cloneBoard(b: Board): Board {
  return { w: b.w, h: b.h, suns: b.suns.map((s) => ({ ...s })), cells: b.cells.map((c) => ({ ...c })) };
}

/** Exact minimum number of taps to solve (and how many different shortest answers exist), by checking every arrangement. */
export function solve(b: Board): { par: number; solutions: number; best: number[] } | null {
  const rot = b.cells.map((c, i) => (rotatable(c) ? i : -1)).filter((i) => i >= 0);
  if (rot.length > 18) throw new Error('too many rotatable pieces to solve exactly');
  const start = rot.map((i) => (b.cells[i] as { slash: boolean }).slash);
  const work = cloneBoard(b);
  let best: number[] | null = null, par = Infinity, solutions = 0;
  for (let mask = 0; mask < 1 << rot.length; mask++) {
    rot.forEach((ci, k) => { (work.cells[ci] as { slash: boolean }).slash = ((mask >> k) & 1) === 1 ? !start[k] : start[k]; });
    if (!trace(work).solved) continue;
    let flips = 0; for (let k = 0; k < rot.length; k++) if ((mask >> k) & 1) flips++;
    if (flips < par) { par = flips; solutions = 0; best = rot.filter((_, k) => (mask >> k) & 1); }
    if (flips === par) solutions++;
  }
  return best ? { par, solutions, best } : null;
}

/** Seals: within par earns three; two more taps still earns two. */
export function seals(par: number, taps: number) { return taps <= par ? 3 : taps <= par + 2 ? 2 : 1; }

// ── level text format ──────────────────────────────────────────────────
// .  plain glass          #  stone           r y b  coloured glass
// /  \  mirrors (turn)    { }  fixed mirrors / and \  (gilded, cannot turn)
// %  &  half-silvered splitters / and \
// W R Y B O V G  medallions wanting sunlight, red, gold, blue, orange, violet, green
const WANT: Record<string, Pigment> = { W: 0, R: 1, Y: 2, B: 4, O: 3, V: 5, G: 6 };
export function parseBoard(rows: string[], suns: Sun[]): Board {
  const h = rows.length, w = rows[0].length;
  const cells: Cell[] = [];
  for (const row of rows) {
    if (row.length !== w) throw new Error(`ragged row: ${row}`);
    for (const ch of row) {
      if (ch === '.') cells.push({ k: 'glass' });
      else if (ch === '#') cells.push({ k: 'stone' });
      else if (ch === '/' || ch === '\\') cells.push({ k: 'mirror', slash: ch === '/', fixed: false });
      else if (ch === '{' || ch === '}') cells.push({ k: 'mirror', slash: ch === '{', fixed: true });
      else if (ch === '%' || ch === '&') cells.push({ k: 'split', slash: ch === '%' });
      else if (ch === 'r') cells.push({ k: 'filter', p: RED });
      else if (ch === 'y') cells.push({ k: 'filter', p: YELLOW });
      else if (ch === 'b') cells.push({ k: 'filter', p: BLUE });
      else if (ch in WANT) cells.push({ k: 'target', want: WANT[ch] });
      else throw new Error(`unknown tile ${ch}`);
    }
  }
  return { w, h, cells, suns };
}
export function boardText(b: Board): string[] {
  const rows: string[] = [];
  const inv: Record<number, string> = { 0: 'W', 1: 'R', 2: 'Y', 4: 'B', 3: 'O', 5: 'V', 6: 'G' };
  for (let y = 0; y < b.h; y++) {
    let s = '';
    for (let x = 0; x < b.w; x++) {
      const c = b.cells[y * b.w + x];
      s += c.k === 'glass' ? '.' : c.k === 'stone' ? '#' : c.k === 'mirror' ? (c.fixed ? (c.slash ? '{' : '}') : c.slash ? '/' : '\\')
        : c.k === 'split' ? (c.slash ? '%' : '&') : c.k === 'filter' ? ({ 1: 'r', 2: 'y', 4: 'b' } as Record<number, string>)[c.p] : inv[c.want];
    }
    rows.push(s);
  }
  return rows;
}
