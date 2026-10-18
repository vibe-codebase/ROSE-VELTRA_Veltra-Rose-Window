import { parseBoard, type Board, type Sun } from './sim';

/**
 * Rose Window levels. Boards were laid out by tools/gen.ts (paths first, then scrambled) and curated;
 * `par` is the exact minimum number of taps, which the tests re-check with the solver.
 * Legend: . glass  # stone  / \\ mirrors  { } gilded fixed mirrors  % & half-silvered  r y b coloured glass
 *         W R Y B O V G medallions (sunlight, red, gold, blue, orange, violet, green)
 */
export type Level = { id: string; chapter: 0 | 1 | 2; name: string; rows: string[]; suns: Sun[]; par: number; hint?: string };

export const CHAPTERS = [
  { name: 'Dawn', blurb: 'Clear morning light and silver mirrors.', hour: 'vi' },
  { name: 'Noon', blurb: 'Coloured glass stains the light. Colours mix.', hour: 'xii' },
  { name: 'Vespers', blurb: 'Half-silvered panes split one beam in two.', hour: 'vi' },
] as const;

export const LEVELS: Level[] = [
  { id: 'dawn-1', chapter: 0, name: "First Light", par: 1,
    rows: ["..#.", "...W", "....", "...\\", "...."],
    suns: [{x: 0, y: 3, dir: 0}], hint: "Tap a mirror to turn it. Guide the sunlight to the medallion." },
  { id: 'dawn-2', chapter: 0, name: "Matins Bell", par: 2,
    rows: ["....", ".\\..", "...#", "./.W", "\\..."],
    suns: [{x: 3, y: 1, dir: 2}] },
  { id: 'dawn-3', chapter: 0, name: "Cloister", par: 3,
    rows: ["\\./#.", "W.#..", ".....", "/../.", ".....", ".../."],
    suns: [{x: 4, y: 5, dir: 2}] },
  { id: 'dawn-4', chapter: 0, name: "Lantern Tower", par: 3,
    rows: [".\\../", ".{../", "#....", "#/...", ".....", "W...\\"],
    suns: [{x: 4, y: 3, dir: 2}], hint: "Gilded mirrors are fixed in the lead. Only plain mirrors turn." },
  { id: 'dawn-5', chapter: 0, name: "Two Saints", par: 3,
    rows: ["...#/", ".././", "W./..", ".....", ".....", ".\\.#W"],
    suns: [{x: 2, y: 5, dir: 3}, {x: 2, y: 0, dir: 1}], hint: "Every medallion must glow at once." },
  { id: 'dawn-6', chapter: 0, name: "Bell Rope", par: 4,
    rows: ["W..\\.", ".\\#..", ".\\...", "/...\\", "{../.", "....#", "/...W"],
    suns: [{x: 3, y: 6, dir: 3}, {x: 4, y: 0, dir: 1}] },
  { id: 'dawn-7', chapter: 0, name: "The Choir", par: 3,
    rows: ["./...\\", "\\.{./.", ".../..", "}../.#", "......", ".../.W", ".#.#.."],
    suns: [{x: 2, y: 0, dir: 1}] },
  { id: 'dawn-8', chapter: 0, name: "Rose of Dawn", par: 4,
    rows: ["\\.....", "{..\\\\.", "../\\.\\", "/.W...", "......", "#W.{..", "#.\\...", "..#..."],
    suns: [{x: 3, y: 0, dir: 1}, {x: 5, y: 0, dir: 1}] },
  { id: 'noon-1', chapter: 1, name: "Ruby Pane", par: 2,
    rows: ["\\.R.", ".#..", "/..r", "../.", "...."],
    suns: [{x: 3, y: 2, dir: 2}], hint: "Light takes the colour of the glass it passes through. The medallion shows the colour it needs." },
  { id: 'noon-2', chapter: 1, name: "Lapis", par: 2,
    rows: ["....B", ".b...", "...#.", "./..\\", ".\\...", ".../."],
    suns: [{x: 1, y: 0, dir: 1}] },
  { id: 'noon-3', chapter: 1, name: "Saffron Arch", par: 3,
    rows: ["....\\", "yr./.", "/O...", ".....", ".....", "#/.\\#"],
    suns: [{x: 0, y: 1, dir: 0}], hint: "Colours mix: red and gold make orange, gold and blue make green, red and blue make violet." },
  { id: 'noon-4', chapter: 1, name: "Twin Lancets", par: 3,
    rows: [".#...", "\\Y.y/", "/#.B.", "..../", "/..\\.", ".....", "b...."],
    suns: [{x: 4, y: 3, dir: 2}, {x: 0, y: 6, dir: 3}] },
  { id: 'noon-5', chapter: 1, name: "Verdigris", par: 3,
    rows: ["../G.", "/#...", "\\..\\.", "y..\\.", "/b.}.", "....#", "....."],
    suns: [{x: 3, y: 6, dir: 3}] },
  { id: 'noon-6', chapter: 1, name: "The Bishop's Seal", par: 3,
    rows: ["...y..", "..././", "..\\.V.", "....\\Y", "..}.\\#", "..#.r.", ".//.b."],
    suns: [{x: 4, y: 6, dir: 3}, {x: 3, y: 0, dir: 1}] },
  { id: 'noon-7', chapter: 1, name: "Pilgrim's Way", par: 3,
    rows: ["../ry{", "......", "O.\\/..", "\\..G..", "......", "b....#", "y#..\\.", "\\\\.#.."],
    suns: [{x: 5, y: 0, dir: 1}, {x: 0, y: 7, dir: 0}] },
  { id: 'noon-8', chapter: 1, name: "Clerestory", par: 4,
    rows: [".R#...", "..G..y", ".r./..", ".\\/.b{", "...#..", "V..\\.r", "../b\\.", "}..\\.#"],
    suns: [{x: 0, y: 3, dir: 0}, {x: 5, y: 0, dir: 1}, {x: 5, y: 5, dir: 2}] },
  { id: 'vesper-1', chapter: 2, name: "The Divided Ray", par: 2,
    rows: ["..W.&", "../.\\", ".\\...", ".#...", "..W..", "..#.."],
    suns: [{x: 4, y: 0, dir: 2}], hint: "Half-silvered glass lets light through and reflects it too, so one beam can reach two medallions." },
  { id: 'vesper-2', chapter: 2, name: "Two Candles", par: 3,
    rows: ["..#..", ".....", "/..#R", "B./..", "/...r", "../b%"],
    suns: [{x: 4, y: 5, dir: 3}] },
  { id: 'vesper-3', chapter: 2, name: "Gilded Nave", par: 3,
    rows: ["\\....", "..Y./", "{.O\\.", ".....", "/.r.%", "#....", "...#y"],
    suns: [{x: 4, y: 6, dir: 3}] },
  { id: 'vesper-4', chapter: 2, name: "Evensong", par: 3,
    rows: ["...\\..", "......", "\\y%...", "...//.", "}../..", "...b.#", "W.\\G.#"],
    suns: [{x: 2, y: 0, dir: 1}] },
  { id: 'vesper-5', chapter: 2, name: "Three Kings", par: 4,
    rows: ["B..\\..", "..Yy&&", "....br", "/...\\.", "#.....", "#....R", ".../.."],
    suns: [{x: 5, y: 0, dir: 1}] },
  { id: 'vesper-6', chapter: 2, name: "Compline", par: 4,
    rows: ["./%.#W", "....#.", ".y../.", ".}./..", "/.%..\\", "\\.bY..", "#./rV.", "......"],
    suns: [{x: 2, y: 0, dir: 1}] },
  { id: 'vesper-7', chapter: 2, name: "Nocturne", par: 4,
    rows: ["..#/..", "#.\\.b.", ".....G", "......", "..%y.\\", "yr./..", ".\\B.#.", "\\..O.."],
    suns: [{x: 0, y: 5, dir: 0}, {x: 5, y: 1, dir: 2}] },
  { id: 'vesper-8', chapter: 2, name: "The Great Rose", par: 5,
    rows: ["YGb&y.", "..#...", "/..\\#/", ".\\.V..", "....\\.", "....R.", "....r.", "./br&."],
    suns: [{x: 4, y: 7, dir: 3}, {x: 5, y: 0, dir: 2}] },
];

export const levelIndex = (id: string) => LEVELS.findIndex((l) => l.id === id);
export const boardOf = (l: Level): Board => parseBoard(l.rows, l.suns);
