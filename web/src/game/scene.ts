import Phaser from 'phaser';
import * as A from './art';
import { boardOf, LEVELS, type Level } from './levels';
import { inside, rotate, rotatable, seals, trace, type Board, type Trace } from './sim';
import { solve } from './sim';
import { sound } from '../audio/sound';

export type Finish = { level: Level; taps: number; seals: number };
type Hooks = {
  onFinish?: (f: Finish) => void;
  onTaps?: (taps: number, canUndo: boolean) => void;
  onLit?: (lit: number, total: number) => void;
  onFirstTap?: () => void;
  onHaptic?: (style: 'light' | 'medium' | 'success' | 'warning') => void;
};

/** Bridge between React and the Phaser scene. */
export const nave = {
  hooks: {} as Hooks,
  scene: null as NaveScene | null,
  reducedMotion: false,
  insets: { top: 70, bottom: 96 },
  menuInsets: { top: 205, bottom: 215 },   // css px, measured from the title screen
  setMenuInsets(top: number, bottom: number) {
    if (Math.abs(top - this.menuInsets.top) < 4 && Math.abs(bottom - this.menuInsets.bottom) < 4) return;
    this.menuInsets = { top, bottom }; this.scene?.relayoutSoon();
  },
  show(mode: 'menu' | 'play', level: Level) { this.scene?.show(mode, level); },
  setPaused(p: boolean) { this.scene?.setPaused(p); },
  undo() { this.scene?.undo(); },
  setInsets(top: number, bottom: number) { this.insets = { top, bottom }; this.scene?.relayoutSoon(); },
  debug() { return this.scene?.debugState(); },
  /** QA only: solve with the exact solver ('win') or tap a cell. */
  qa(kind: 'win') { if (kind === 'win') this.scene?.qaSolve(); },
  qaTap(x: number, y: number) { this.scene?.tapCell(x, y); },
};
(window as unknown as { __nave: typeof nave }).__nave = nave;

const W = 360;

export class NaveScene extends Phaser.Scene {
  level: Level = LEVELS[0];
  private mode: 'menu' | 'play' = 'menu';
  private board!: Board;
  private tr!: Trace;
  private history: number[] = [];
  private taps = 0;
  private finished = false;
  private paused = false;
  private everTapped = false;
  private r = 2;
  private H = 700;
  private L!: A.Layout;
  private floorY = 600;
  private texSeq = 0;
  private runId = 0;
  private pieces = new Map<number, Phaser.GameObjects.Image>();
  private medallions = new Map<number, { dim: Phaser.GameObjects.Image; lit: Phaser.GameObjects.Image }>();
  private beams!: Phaser.GameObjects.Graphics;
  private motes!: Phaser.GameObjects.Graphics;
  private pools!: Phaser.GameObjects.Graphics;
  private flood!: Phaser.GameObjects.Rectangle;
  private moteT = 0;
  private relayoutTimer = 0;
  private demoTimer = 0;

  constructor() { super('nave'); }

  create() {
    nave.scene = this;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.mode !== 'play' || this.paused || this.finished) return;
      const cx = Math.floor((p.worldX - this.L.ox) / this.L.cs), cy = Math.floor((p.worldY - this.L.oy) / this.L.cs);
      this.tapCell(cx, cy);
    });
    this.scale.on('resize', () => this.rebuild());
    this.show('menu', LEVELS[4]);
  }

  debugState() { return { mode: this.mode, taps: this.taps, finished: this.finished, solved: this.tr?.solved, lit: this.tr && this.tr.lit.filter(Boolean).length }; }

  show(mode: 'menu' | 'play', level: Level) {
    this.mode = mode;
    this.level = level;
    this.board = boardOf(level);
    if (mode === 'menu') {
      // the title window shows a solved board, light pouring through
      const s = solve(this.board);
      s?.best.forEach((i) => rotate(this.board, i % this.board.w, Math.floor(i / this.board.w)));
    }
    this.history = []; this.taps = 0; this.finished = false; this.paused = false; this.everTapped = false;
    this.runId++;
    this.rebuild();
    this.emitTaps();
  }
  setPaused(p: boolean) { this.paused = p; }
  relayoutSoon() { window.clearTimeout(this.relayoutTimer); this.relayoutTimer = window.setTimeout(() => this.rebuild(), 30); }
  private emitTaps() { nave.hooks.onTaps?.(this.taps, this.history.length > 0 && !this.finished); }

  private tex(prefix: string, c: HTMLCanvasElement) { const k = `${prefix}-${++this.texSeq}`; this.textures.addCanvas(k, c); return k; }
  private img(x: number, y: number, c: HTMLCanvasElement, prefix: string) { return this.add.image(x, y, this.tex(prefix, c)).setScale(1 / this.r); }

  private layout(): A.Layout {
    const b = this.board;
    // css px → world units
    const k = W / Math.max(1, this.game.canvas.clientWidth || W);
    const top = (this.mode === 'play' ? nave.insets.top * k : nave.menuInsets.top * k) + 14;
    const bottom = (this.mode === 'play' ? nave.insets.bottom * k : nave.menuInsets.bottom * k) + 40;
    const availH = this.H - top - bottom;
    // the arch head takes about 0.59 of the window's width
    let cs = Math.min(56, (W - 64) / b.w);
    while (cs > 26 && b.h * cs + A.archHeight(b.w * cs) > availH) cs -= 1;
    const gw = b.w * cs, gh = b.h * cs, archH = A.archHeight(gw);
    const ox = (W - gw) / 2;
    const oy = top + archH + Math.max(0, (availH - gh - archH) / 2);
    return { cs, ox, oy, gw, gh, archH };
  }

  private rebuild() {
    const stale = this.textures.getTextureKeys().filter((k) => /-\d+$/.test(k));
    this.tweens.killAll();
    this.children.removeAll(true);
    if (stale.length) this.events.once('postrender', () => stale.forEach((k) => this.textures.exists(k) && this.textures.remove(k)));
    this.pieces.clear(); this.medallions.clear();

    const pw = this.scale.width, ph = this.scale.height;
    const zoom = pw / W;
    this.r = Math.min(2, Math.max(1, zoom));
    this.H = Math.max(600, ph / zoom);
    this.cameras.main.setZoom(zoom).centerOn(W / 2, this.H / 2);
    const p = A.PALETTES[this.level.chapter], r = this.r, b = this.board;
    this.L = this.layout();
    const L = this.L;
    this.floorY = L.oy + L.gh + 26;
    this.cameras.main.setBackgroundColor(p.wall[2]);
    const seed = this.level.id.length * 131 + this.level.chapter * 17;

    this.img(W / 2, this.H / 2, A.naveTexture(p, W, this.H, L, r, seed, this.floorY), 'nave');
    this.pools = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    const win = A.windowTexture(p, b, L, W, r, seed + 1);
    this.add.image(0, win.top, this.tex('win', win.canvas)).setOrigin(0, 0).setScale(1 / r);

    // suns outside the glass
    for (const s of b.suns) {
      const sx = L.ox + (s.x + 0.5) * L.cs - [1, 0, -1, 0][s.dir] * (L.cs * 0.95), sy = L.oy + (s.y + 0.5) * L.cs - [0, 1, 0, -1][s.dir] * (L.cs * 0.95);
      const sun = this.img(sx, sy, A.sunTexture(L.cs * 0.26, r, p.light), 'sun').setBlendMode(Phaser.BlendModes.ADD);
      if (!nave.reducedMotion) this.tweens.add({ targets: sun, angle: 360, duration: 40000, repeat: -1 });
    }

    this.beams = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    this.motes = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);

    const keys = { mirror: this.tex('mirror', A.mirrorTexture(L.cs, r, 'mirror')), fixed: this.tex('fixed', A.mirrorTexture(L.cs, r, 'fixed')), split: this.tex('split', A.mirrorTexture(L.cs, r, 'split')) };
    b.cells.forEach((c, i) => {
      const x = i % b.w, y = Math.floor(i / b.w);
      const cx = L.ox + (x + 0.5) * L.cs, cy = L.oy + (y + 0.5) * L.cs;
      if (c.k === 'mirror' || c.k === 'split') {
        const key = c.k === 'split' ? keys.split : c.fixed ? keys.fixed : keys.mirror;
        const im = this.add.image(cx, cy, key).setScale(1 / r).setAngle(c.slash ? -45 : 45);
        if (rotatable(c)) this.add.circle(cx, cy, 2.6, 0x8a6a2a).setStrokeStyle(1, 0x2a1d0c);
        this.pieces.set(i, im);
      } else if (c.k === 'target') {
        const dim = this.img(cx, cy, A.medallionTexture(c.want, L.cs, r, false), 'med');
        const lit = this.img(cx, cy, A.medallionTexture(c.want, L.cs, r, true), 'medl').setAlpha(0);
        this.medallions.set(i, { dim, lit });
      }
    });

    this.flood = this.add.rectangle(W / 2, this.H / 2, W, this.H, 0xfff1d0, 0).setBlendMode(Phaser.BlendModes.ADD);
    this.retrace(true);
  }

  // ── play ──────────────────────────────────────────────────────────────
  tapCell(x: number, y: number) {
    if (this.mode !== 'play' || this.finished || !inside(this.board, x, y)) return;
    const i = y * this.board.w + x;
    const c = this.board.cells[i];
    if (!rotatable(c)) {
      if (c.k === 'mirror' && c.fixed) { sound.locked(); this.nudge(i); }
      return;
    }
    rotate(this.board, x, y);
    this.history.push(i);
    this.taps++;
    if (!this.everTapped) { this.everTapped = true; nave.hooks.onFirstTap?.(); }
    this.turnPiece(i);
    sound.turn(x / this.board.w);
    nave.hooks.onHaptic?.('light');
    this.retrace();
    this.emitTaps();
  }

  undo() {
    if (this.finished || !this.history.length) return;
    const i = this.history.pop()!;
    rotate(this.board, i % this.board.w, Math.floor(i / this.board.w));
    this.taps = Math.max(0, this.taps - 1);
    this.turnPiece(i);
    sound.turn(0.2);
    this.retrace();
    this.emitTaps();
  }

  qaSolve() {
    if (this.mode !== 'play' || this.finished) return;
    const s = solve(this.board);
    for (const i of s?.best ?? []) this.tapCell(i % this.board.w, Math.floor(i / this.board.w));
  }

  private turnPiece(i: number) {
    const im = this.pieces.get(i);
    const c = this.board.cells[i] as { slash: boolean };
    if (!im) return;
    const to = c.slash ? -45 : 45;
    if (nave.reducedMotion) { im.setAngle(to); return; }
    this.tweens.add({ targets: im, angle: to, duration: 170, ease: 'Back.out' });
  }
  private nudge(i: number) {
    const im = this.pieces.get(i);
    if (!im || nave.reducedMotion) return;
    const a = im.angle;
    this.tweens.add({ targets: im, angle: a + 4, duration: 50, yoyo: true, repeat: 1, onComplete: () => im.setAngle(a) });
  }

  private retrace(initial = false) {
    const before = this.tr;
    this.tr = trace(this.board);
    const L = this.L, b = this.board;
    // medallions
    let lit = 0, total = 0;
    this.medallions.forEach((m, i) => {
      total++;
      const on = !!this.tr.lit[i];
      if (on) lit++;
      const was = before ? !!before.lit[i] : false;
      if (initial || nave.reducedMotion) m.lit.setAlpha(on ? 1 : 0);
      else if (on !== was) {
        this.tweens.add({ targets: m.lit, alpha: on ? 1 : 0, duration: on ? 260 : 160 });
        if (on) { sound.chime(i % 7, (b.cells[i] as { want: number }).want); nave.hooks.onHaptic?.('medium'); this.tweens.add({ targets: m.lit, scale: { from: 1.25 / this.r, to: 1 / this.r }, duration: 420, ease: 'Back.out' }); }
      }
    });
    nave.hooks.onLit?.(lit, total);
    this.drawBeams();
    // light falling onto the floor from every lit medallion
    this.pools.clear();
    this.medallions.forEach((_, i) => {
      if (!this.tr.lit[i]) return;
      const x = i % b.w;
      const col = Phaser.Display.Color.HexStringToColor(A.LIGHT[(b.cells[i] as { want: number }).want]).color;
      const px = L.ox + (x + 0.5) * L.cs;
      this.pools.fillStyle(col, 0.1); this.pools.fillEllipse(px, this.floorY + 34, L.cs * 1.6, 26);
      this.pools.fillStyle(col, 0.08); this.pools.fillEllipse(px, this.floorY + 34, L.cs * 2.6, 44);
    });
    if (this.tr.solved && this.mode === 'play' && !this.finished && !initial) this.finish();
  }

  private drawBeams() {
    const g = this.beams, L = this.L;
    g.clear();
    const cx = (x: number) => L.ox + (x + 0.5) * L.cs, cy = (y: number) => L.oy + (y + 0.5) * L.cs;
    for (const s of this.tr.segments) {
      const col = Phaser.Display.Color.HexStringToColor(A.LIGHT[s.p]).color;
      const x0 = cx(s.x0), y0 = cy(s.y0), x1 = cx(s.x1), y1 = cy(s.y1);
      const fade = s.depth ? 0.8 : 1;
      g.lineStyle(L.cs * 0.42, col, 0.08 * fade); g.lineBetween(x0, y0, x1, y1);
      g.lineStyle(L.cs * 0.2, col, 0.22 * fade); g.lineBetween(x0, y0, x1, y1);
      g.lineStyle(2.4, col, 0.95 * fade); g.lineBetween(x0, y0, x1, y1);
      g.lineStyle(1, 0xffffff, 0.6 * fade); g.lineBetween(x0, y0, x1, y1);
    }
  }

  private finish() {
    this.finished = true;
    const seal = seals(this.level.par, this.taps);
    sound.illuminate(this.level.chapter);
    nave.hooks.onHaptic?.('success');
    if (!nave.reducedMotion) this.tweens.add({ targets: this.flood, alpha: { from: 0, to: 0.22 }, duration: 700, yoyo: true, hold: 500, ease: 'Sine.inOut' });
    this.medallions.forEach((m) => this.tweens.add({ targets: m.lit, scale: { from: 1 / this.r, to: 1.18 / this.r }, duration: 600, yoyo: true, ease: 'Sine.inOut' }));
    const run = this.runId, taps = this.taps;
    window.setTimeout(() => { if (run === this.runId) nave.hooks.onFinish?.({ level: this.level, taps, seals: seal }); }, 1600);
    this.emitTaps();
  }

  update(_t: number, deltaMs: number) {
    if (!this.tr) return;
    const dt = Math.min(0.1, deltaMs / 1000);
    this.moteT += dt;
    if (this.mode === 'menu') {
      this.demoTimer += dt;
      this.flood.setAlpha(0.04 + Math.sin(this.demoTimer * 0.6) * 0.03);
    }
    // motes of dust drifting along every beam, showing which way the light flows
    const g = this.motes, L = this.L;
    g.clear();
    if (nave.reducedMotion || this.paused) return;
    for (const s of this.tr.segments) {
      const len = Math.hypot(s.x1 - s.x0, s.y1 - s.y0);
      if (len < 0.05) continue;
      const n = Math.max(1, Math.round(len * 1.4));
      const col = Phaser.Display.Color.HexStringToColor(A.LIGHT[s.p]).color;
      for (let k = 0; k < n; k++) {
        const t = ((this.moteT * 1.6) / len + k / n) % 1;
        const x = L.ox + (s.x0 + (s.x1 - s.x0) * t + 0.5) * L.cs, y = L.oy + (s.y0 + (s.y1 - s.y0) * t + 0.5) * L.cs;
        g.fillStyle(col, 0.85); g.fillCircle(x, y, 1.6);
        g.fillStyle(0xffffff, 0.7); g.fillCircle(x, y, 0.7);
      }
    }
  }
}

export function startGame(parent: HTMLElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#141118',
    scale: { mode: Phaser.Scale.NONE, width: parent.clientWidth * dpr, height: parent.clientHeight * dpr, zoom: 1 / dpr },
    render: { antialias: true, pixelArt: false, powerPreference: 'high-performance' },
    audio: { noAudio: true },
    fps: { target: 60, smoothStep: false },
    input: { activePointers: 2 },
    scene: [NaveScene],
    banner: false,
  });
  const onResize = () => {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    game.scale.setZoom(1 / d);
    game.scale.resize(parent.clientWidth * d, parent.clientHeight * d);
  };
  window.addEventListener('resize', onResize);
  return () => { window.removeEventListener('resize', onResize); game.destroy(true); };
}

