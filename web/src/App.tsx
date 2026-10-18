import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CHAPTERS, LEVELS, levelIndex, type Level } from './game/levels';
import { nave, startGame, type Finish } from './game/scene';
import { sound } from './audio/sound';
import { haptic, onNative, toNative } from './bridge';
import { freshSave, isUnlocked, loadSave, recordResult, totalStars, writeSave, type Save } from './state/save';
import { Rose } from './ui/Rose';
import * as I from './ui/icons';

type Screen = 'home' | 'levels' | 'play' | 'settings';
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

export default function App() {
  const host = useRef<HTMLDivElement>(null);
  const [save, setSave] = useState<Save>(() => loadSave());
  const [screen, setScreen] = useState<Screen>('home');
  const [chapter, setChapter] = useState(0);
  const [level, setLevel] = useState<Level>(LEVELS[0]);
  const [paused, setPaused] = useState(false);
  const [finish, setFinish] = useState<Finish | null>(null);
  const [coach, setCoach] = useState(false);
  const [taps, setTaps] = useState({ n: 0, undo: false });
  const [lit, setLit] = useState({ n: 0, of: 1 });
  const [settingsFrom, setSettingsFrom] = useState<Screen>('home');
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (!host.current) return;
    nave.reducedMotion = save.settings.reducedMotion;
    return startGame(host.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { writeSave(save); }, [save]);
  useEffect(() => {
    sound.setVolumes(save.settings.music, save.settings.sfx);
    nave.reducedMotion = save.settings.reducedMotion;
    document.documentElement.dataset.motion = save.settings.reducedMotion ? 'reduced' : 'full';
  }, [save.settings]);

  const buzz = useCallback((s: 'light' | 'medium' | 'success' | 'warning') => haptic(s, saveRef.current.settings.haptics), []);
  useEffect(() => {
    const unlock = () => { sound.unlock(); sound.startMusic(chapter); };
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, [chapter]);

  const startLevel = useCallback((l: Level) => {
    sound.unlock(); sound.startMusic(l.chapter); sound.duck(false);
    setLevel(l); setChapter(l.chapter); setFinish(null); setPaused(false);
    setCoach(Boolean(l.hint) && !saveRef.current.seenHints.includes(l.id));
    setScreen('play');
    nave.insets = { top: 70, bottom: 96 };
    nave.show('play', l);
  }, []);

  useEffect(() => {
    nave.hooks = {
      onFinish: (f) => { setFinish(f); setSave((s) => recordResult(s, f.level.id, f.seals, f.taps)); sound.duck(true); },
      onTaps: (n, undo) => setTaps({ n, undo }),
      onLit: (n, of) => setLit({ n, of }),
      onFirstTap: () => { setCoach(false); setSave((s) => (s.seenHints.includes(level.id) ? s : { ...s, seenHints: [...s.seenHints, level.id] })); },
      onHaptic: buzz,
    };
  }, [buzz, level.id]);

  const showMenu = useCallback((c: number) => nave.show('menu', LEVELS.filter((l) => l.chapter === c)[c === 0 ? 4 : 3] ?? LEVELS[0]), []);
  const goHome = useCallback(() => { setScreen('home'); setFinish(null); setPaused(false); sound.duck(false); showMenu(chapter); }, [chapter, showMenu]);
  const goLevels = useCallback(() => { setScreen('levels'); setFinish(null); setPaused(false); sound.duck(false); showMenu(chapter); }, [chapter, showMenu]);
  const pause = useCallback((p: boolean) => { setPaused(p); nave.setPaused(p); sound.duck(p); }, []);

  useEffect(() => onNative((e) => {
    if (e.type === 'native.lifecycle') {
      if (e.state === 'background') { sound.suspend(); if (screen === 'play' && !finish) pause(true); }
      else sound.resume();
      return;
    }
    if (screen === 'play') { if (finish) goLevels(); else if (!paused) pause(true); else goLevels(); }
    else if (screen === 'levels') goHome();
    else if (screen === 'settings') setScreen(settingsFrom);
    else toNative({ type: 'exit' });
  }), [screen, paused, finish, pause, goHome, goLevels, settingsFrom]);

  useEffect(() => {
    const vis = () => { if (document.hidden) { sound.suspend(); if (screen === 'play' && !finish) pause(true); } else sound.resume(); };
    document.addEventListener('visibilitychange', vis);
    const key = (e: KeyboardEvent) => {
      if (screen !== 'play' || finish) return;
      if (e.key === 'Escape') pause(!paused);
      if ((e.key === 'z' && (e.ctrlKey || e.metaKey)) || e.key === 'Backspace') nave.undo();
    };
    window.addEventListener('keydown', key);
    return () => { document.removeEventListener('visibilitychange', vis); window.removeEventListener('keydown', key); };
  }, [screen, paused, finish, pause]);

  const nextLevel = useMemo(() => { const i = levelIndex(level.id); return i >= 0 && i < LEVELS.length - 1 ? LEVELS[i + 1] : null; }, [level]);
  const firstOpen = useMemo(() => { const i = LEVELS.findIndex((l, idx) => isUnlocked(save, idx) && !save.stars[l.id]); return LEVELS[i >= 0 ? i : 0]; }, [save]);

  return (
    <div className={`app ch-${chapter}`}>
      <div className="stage" ref={host} />
      {screen === 'home' && (
        <Home candles={totalStars(save)} resume={save.stars[LEVELS[0].id] ? firstOpen : null} onPlay={() => startLevel(firstOpen)}
          onLevels={() => { setChapter(firstOpen.chapter); setScreen('levels'); showMenu(firstOpen.chapter); }}
          onSettings={() => { setSettingsFrom('home'); setScreen('settings'); }} />
      )}
      {screen === 'levels' && (
        <Levels save={save} chapter={chapter} onChapter={(c) => { setChapter(c); sound.startMusic(c); showMenu(c); }} onPick={startLevel} onBack={goHome} />
      )}
      {screen === 'play' && (
        <Hud level={level} taps={taps.n} canUndo={taps.undo} lit={lit} coach={coach} dim={paused || !!finish}
          onPause={() => pause(true)} onUndo={() => nave.undo()} onRestart={() => { sound.tap(); startLevel(level); }} />
      )}
      {screen === 'play' && paused && !finish && (
        <PauseCard level={level} onResume={() => pause(false)} onRestart={() => startLevel(level)} onLevels={goLevels}
          onSettings={() => { setSettingsFrom('play'); setScreen('settings'); }} />
      )}
      {screen === 'play' && finish && (
        <ResultCard finish={finish} best={save.best[finish.level.id]} next={nextLevel} onNext={startLevel} onRetry={() => startLevel(level)} onLevels={goLevels} />
      )}
      {screen === 'settings' && (
        <Settings save={save} onChange={(st) => setSave((s) => ({ ...s, settings: st }))} onReset={() => setSave((s) => ({ ...freshSave(), settings: s.settings }))}
          onBack={() => { setScreen(settingsFrom); if (settingsFrom === 'play') pause(true); }} />
      )}
    </div>
  );
}

function Home({ candles, resume, onPlay, onLevels, onSettings }: { candles: number; resume: Level | null; onPlay: () => void; onLevels: () => void; onSettings: () => void }) {
  const head = useRef<HTMLElement>(null);
  const actions = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // the window on the title screen sits in the space between the title and the buttons
    const measure = () => {
      if (!head.current || !actions.current) return;
      nave.setMenuInsets(head.current.getBoundingClientRect().bottom, window.innerHeight - actions.current.getBoundingClientRect().top);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (head.current) ro.observe(head.current);
    window.addEventListener('resize', measure);
    const t = window.setTimeout(measure, 900);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); clearTimeout(t); };
  }, []);
  return (
    <div className="screen home">
      <header className="title" ref={head}>
        <span className="rubric">A puzzle of light</span>
        <h1><small>Veltra</small><span className="initial">R</span>ose Window</h1>
        <p>Turn the mirrors. Lead the sun through coloured glass until every medallion burns.</p>
      </header>
      <div className="home-actions" ref={actions}>
        <button className="gilt" onClick={() => { sound.tap(); onPlay(); }} data-testid="play">
          <I.Sun size={20} /> {resume ? <>Continue <small>{resume.name}</small></> : 'Let in the light'}
        </button>
        <div className="row">
          <button className="lapis" onClick={() => { sound.tap(); onLevels(); }}><I.Window /> Windows</button>
          <button className="lapis round" aria-label="Settings" onClick={() => { sound.tap(); onSettings(); }}><I.Gear /></button>
        </div>
        <div className="tally"><I.Candle size={16} lit /> {candles} / {LEVELS.length * 3} candles lit</div>
      </div>
    </div>
  );
}

function Levels({ save, chapter, onChapter, onPick, onBack }: { save: Save; chapter: number; onChapter: (c: number) => void; onPick: (l: Level) => void; onBack: () => void }) {
  const levels = LEVELS.filter((l) => l.chapter === chapter);
  const got = levels.reduce((a, l) => a + (save.stars[l.id] ?? 0), 0);
  const chapterOpen = (c: number) => isUnlocked(save, LEVELS.findIndex((l) => l.chapter === c));
  const nextUp = levels.find((l) => isUnlocked(save, levelIndex(l.id)) && !save.stars[l.id]);
  return (
    <div className="screen levels">
      <div className="topbar">
        <button className="icon-btn" aria-label="Back" onClick={() => { sound.tap(); onBack(); }}><I.Back /></button>
        <div className="hours" role="tablist">
          {CHAPTERS.map((c, i) => (
            <button key={c.name} role="tab" aria-selected={i === chapter} disabled={!chapterOpen(i)} className={`hour ${i === chapter ? 'on' : ''}`}
              aria-label={`${c.name}${chapterOpen(i) ? '' : ' (locked)'}`} onClick={() => { sound.tap(); onChapter(i); }}>{c.name}</button>
          ))}
        </div>
        <span className="chip"><I.Candle size={14} lit />{got}/24</span>
      </div>
      <div className="rose-wrap">
        <Rose levels={levels} chapterName={CHAPTERS[chapter].name} stars={(l) => save.stars[l.id] ?? 0}
          open={(l) => isUnlocked(save, levelIndex(l.id))} onPick={(l) => { sound.tap(); onPick(l); }} />
      </div>
      <p className="blurb">{CHAPTERS[chapter].blurb}</p>
      {nextUp && <p className="next-up">Next: <b>{ROMAN[levels.indexOf(nextUp)]}. {nextUp.name}</b></p>}
    </div>
  );
}

const WANT_COLOR: Record<number, string> = { 0: '#fff6dc', 1: '#ff4a3d', 2: '#ffc93a', 4: '#4f8bff', 3: '#ff8a26', 5: '#b45cff', 6: '#3fd47a' };
function Hud({ level, taps, canUndo, lit, coach, dim, onPause, onUndo, onRestart }: {
  level: Level; taps: number; canUndo: boolean; lit: { n: number; of: number }; coach: boolean; dim: boolean;
  onPause: () => void; onUndo: () => void; onRestart: () => void;
}) {
  const n = LEVELS.filter((l) => l.chapter === level.chapter).indexOf(level);
  const wants = useMemo(() => {
    const out: number[] = [];
    const map: Record<string, number> = { W: 0, R: 1, Y: 2, B: 4, O: 3, V: 5, G: 6 };
    level.rows.forEach((row) => [...row].forEach((ch) => { if (ch in map) out.push(map[ch]); }));
    return out;
  }, [level]);
  return (
    <div className={`hud ${dim ? 'dim' : ''}`}>
      <div className="hud-top">
        <button className="icon-btn" aria-label="Pause" onClick={() => { sound.tap(); onPause(); }} data-testid="pause"><I.Pause /></button>
        <div className="hud-title"><span>{CHAPTERS[level.chapter].name} · {ROMAN[n]}</span><strong>{level.name}</strong></div>
        <div className={`turns ${taps > level.par ? 'over' : ''}`} aria-label={`${taps} turns, par ${level.par}`}><b>{taps}</b><span>turns<br />par {level.par}</span></div>
      </div>
      <div className="hud-bottom">
        <button className="lapis" onClick={() => { sound.tap(); onUndo(); }} disabled={!canUndo} data-testid="undo"><I.Undo /> Undo</button>
        <div className="lit" aria-label={`${lit.n} of ${lit.of} medallions lit`}>
          {wants.map((w, i) => <i key={i} className={i < lit.n ? 'on' : ''} style={{ ['--c' as never]: WANT_COLOR[w] }} />)}
        </div>
        <button className="lapis" onClick={onRestart} data-testid="restart"><I.Restart /> Again</button>
      </div>
      {coach && level.hint && <div className="coach" role="note"><I.Sun size={20} /><p>{level.hint}</p></div>}
    </div>
  );
}

function PauseCard({ level, onResume, onRestart, onLevels, onSettings }: { level: Level; onResume: () => void; onRestart: () => void; onLevels: () => void; onSettings: () => void }) {
  return (
    <div className="veil">
      <div className="card" role="dialog" aria-label="Paused">
        <span className="rubric">{level.name}</span>
        <h2>Silence</h2>
        <button className="gilt" onClick={() => { sound.tap(); onResume(); }} data-testid="resume">Return to the window</button>
        <div className="row">
          <button className="lapis" onClick={() => { sound.tap(); onRestart(); }}><I.Restart /> Again</button>
          <button className="lapis" onClick={() => { sound.tap(); onLevels(); }}><I.Window /> Windows</button>
          <button className="lapis round" aria-label="Settings" onClick={() => { sound.tap(); onSettings(); }}><I.Gear /></button>
        </div>
      </div>
    </div>
  );
}

const TITLES = ['The light comes in', 'A glowing window', 'Illuminated'];
function ResultCard({ finish, best, next, onNext, onRetry, onLevels }: { finish: Finish; best?: number; next: Level | null; onNext: (l: Level) => void; onRetry: () => void; onLevels: () => void }) {
  const [litN, setLitN] = useState(0);
  useEffect(() => {
    const t = [0, 1, 2].filter((i) => i < finish.seals).map((i) => window.setTimeout(() => { setLitN(i + 1); sound.candle(i); }, 400 + i * 360));
    return () => t.forEach(clearTimeout);
  }, [finish.seals]);
  const lv = finish.level;
  return (
    <div className="veil soft">
      <div className="card result" role="dialog" aria-label="Window lit">
        <span className="rubric">{lv.name}</span>
        <h2>{TITLES[finish.seals - 1]}</h2>
        <div className="big-candles">{[0, 1, 2].map((i) => <span key={i} className={i < litN ? 'lit' : ''}><I.Candle size={46} lit={i < litN} /></span>)}</div>
        <p className="tally-line">{finish.taps} {finish.taps === 1 ? 'turn' : 'turns'} · par {lv.par}{best !== undefined && best < finish.taps ? ` · best ${best}` : ''}</p>
        <p className="advice">{finish.seals === 3 ? 'Not a single wasted turn.' : `Light all three candles in ${lv.par} turns.`}</p>
        {next ? (
          <button className="gilt" onClick={() => { sound.tap(); onNext(next); }} data-testid="next">Next: {next.name} <I.Next size={18} /></button>
        ) : (
          <button className="gilt" onClick={() => { sound.tap(); onLevels(); }} data-testid="finish">Every window glows</button>
        )}
        <div className="row">
          <button className="lapis" onClick={() => { sound.tap(); onRetry(); }} data-testid="retry"><I.Restart /> Again</button>
          <button className="lapis" onClick={() => { sound.tap(); onLevels(); }}><I.Window /> Windows</button>
        </div>
      </div>
    </div>
  );
}

function Settings({ save, onChange, onReset, onBack }: { save: Save; onChange: (s: Save['settings']) => void; onReset: () => void; onBack: () => void }) {
  const st = save.settings;
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="screen settings">
      <div className="topbar">
        <button className="icon-btn" aria-label="Back" onClick={() => { sound.tap(); onBack(); }}><I.Back /></button>
        <h2 className="settings-title">Sacristy</h2>
        <span />
      </div>
      <div className="card flat">
        <label className="slider">Music <input type="range" min={0} max={1} step={0.05} value={st.music} onChange={(e) => onChange({ ...st, music: +e.target.value })} /><output>{Math.round(st.music * 100)}</output></label>
        <label className="slider">Sounds <input type="range" min={0} max={1} step={0.05} value={st.sfx} onChange={(e) => onChange({ ...st, sfx: +e.target.value })} /><output>{Math.round(st.sfx * 100)}</output></label>
        <label className="toggle">Vibration <input type="checkbox" checked={st.haptics} onChange={(e) => onChange({ ...st, haptics: e.target.checked })} /><i /></label>
        <label className="toggle">Reduce motion <input type="checkbox" checked={st.reducedMotion} onChange={(e) => onChange({ ...st, reducedMotion: e.target.checked })} /><i /></label>
        <div className="reset">
          {confirm ? (
            <>
              <span>Snuff every candle?</span>
              <button className="lapis danger" onClick={() => { onReset(); setConfirm(false); }}>Reset</button>
              <button className="lapis" onClick={() => setConfirm(false)}>Keep</button>
            </>
          ) : <button className="lapis" onClick={() => setConfirm(true)}>Reset progress</button>}
        </div>
      </div>
      <p className="small-print">Plays fully offline. No ads, accounts or tracking.</p>
    </div>
  );
}
