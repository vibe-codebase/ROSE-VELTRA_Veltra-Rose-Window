import { describe, expect, it } from 'vitest';
import { LEVELS, CHAPTERS, boardOf } from '../game/levels';
import { trace, solve, rotate, rotatable, reflect, seals, cloneBoard, parseBoard, boardText, RED, BLUE, YELLOW } from '../game/sim';
import { parseSave, freshSave, recordResult, isUnlocked, totalStars } from '../state/save';

describe('levels', () => {
  it('has 24 uniquely named windows, 8 per hour', () => {
    expect(LEVELS).toHaveLength(24);
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(24);
    expect(new Set(LEVELS.map((l) => l.name)).size).toBe(24);
    CHAPTERS.forEach((_, c) => expect(LEVELS.filter((l) => l.chapter === c)).toHaveLength(8));
  });
  it.each(LEVELS.map((l) => [l.id, l] as const))('%s starts dark, is solvable, and its par is the exact minimum', (_id, l) => {
    const b = boardOf(l);
    expect(trace(b).solved).toBe(false);
    const s = solve(b);
    expect(s).not.toBeNull();
    expect(s!.par).toBe(l.par);
    expect(s!.solutions).toBeLessThanOrEqual(4);
    // applying the solver's answer lights every medallion
    const w = cloneBoard(b);
    s!.best.forEach((i) => rotate(w, i % w.w, Math.floor(i / w.w)));
    expect(trace(w).solved).toBe(true);
  });
  it('round-trips through the text format', () => {
    for (const l of LEVELS) expect(boardText(boardOf(l))).toEqual(l.rows);
  });
  it('introduces colour at noon and splitters at vespers', () => {
    const has = (c: number, ch: string) => LEVELS.filter((l) => l.chapter === c).some((l) => l.rows.join('').includes(ch));
    expect(LEVELS.filter((l) => l.chapter === 0).every((l) => !/[ryb%&]/.test(l.rows.join('')))).toBe(true);
    expect(has(1, 'r') || has(1, 'y') || has(1, 'b')).toBe(true);
    expect(has(2, '%') || has(2, '&')).toBe(true);
  });
});

describe('light', () => {
  it('reflects like real mirrors', () => {
    expect(reflect(0, true)).toBe(3); expect(reflect(3, true)).toBe(0); expect(reflect(2, true)).toBe(1); expect(reflect(1, true)).toBe(2);
    expect(reflect(0, false)).toBe(1); expect(reflect(1, false)).toBe(0); expect(reflect(2, false)).toBe(3); expect(reflect(3, false)).toBe(2);
  });
  it('mixes colours and blocks umber', () => {
    const b = parseBoard(['ryO'], [{ x: 0, y: 0, dir: 0 }]);
    expect(trace(b).solved).toBe(true);
    const dark = parseBoard(['rybW'], [{ x: 0, y: 0, dir: 0 }]);
    expect(trace(dark).solved).toBe(false);
    expect(RED | YELLOW | BLUE).toBe(7);
  });
  it('splits light with half-silvered glass and survives loops', () => {
    const b = parseBoard(['.W', '%W'], [{ x: 0, y: 1, dir: 3 }]);
    // light goes up through the splitter... entering from below the bottom-left cell heading north
    const t = trace(b);
    expect(t.segments.length).toBeGreaterThan(0);
    const loop = parseBoard(['/\\', '\\/'], [{ x: 0, y: 0, dir: 0 }]);
    expect(() => trace(loop)).not.toThrow();
  });
  it('only plain mirrors and splitters turn', () => {
    const b = parseBoard(['/{%#rW'], [{ x: 0, y: 0, dir: 0 }]);
    expect(b.cells.map(rotatable)).toEqual([true, false, true, false, false, false]);
    expect(rotate(b, 1, 0)).toBe(false);
    expect(rotate(b, 0, 0)).toBe(true);
  });
  it('awards candles against par', () => { expect(seals(3, 3)).toBe(3); expect(seals(3, 5)).toBe(2); expect(seals(3, 6)).toBe(1); });
});

describe('save', () => {
  it('survives garbage and only improves', () => {
    for (const raw of [null, '', '{', 'null', '[]', '{"v":9}']) expect(parseSave(raw)).toEqual(expect.objectContaining({ v: 1 }));
    let s = freshSave();
    s = recordResult(s, 'dawn-1', 2, 3);
    s = recordResult(s, 'dawn-1', 1, 2);
    expect(s.stars['dawn-1']).toBe(2); expect(s.best['dawn-1']).toBe(2);
    expect(isUnlocked(s, 1)).toBe(true); expect(totalStars(s)).toBe(2);
    expect(parseSave(JSON.stringify(s))).toEqual(s);
  });
});
