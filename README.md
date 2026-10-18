# Veltra Rose Window

By **ROSE VELTRA** · package `com.roseveltra.veltrarosewindow` · Expo owner `884-888`.

A one-tap light puzzle for Android. Sunlight pours into a gothic lancet window. Tap a mirror to turn it, and lead the light through coloured stained glass until every medallion glows its own colour.

- 24 windows across three hours: Dawn (mirrors), Noon (coloured glass that mixes: red, gold, blue, orange, green, violet), Vespers (half-silvered panes that split one beam in two)
- Candles (stars) for solving within par, where par is the exact minimum number of turns, computed by an exhaustive solver; Undo is free
- The level select is a rose window: finished petals glow in jewel colours
- Stained glass, lead cames and carved stone painted procedurally; formant-synthesised choir, organ drone and handbells; fully offline

## Structure

| Path | What it is |
| --- | --- |
| `web/src/game/sim.ts` | Light tracing, colour mixing, exact solver, level text format |
| `web/src/game/levels.ts` | All 24 windows in a readable text grid |
| `web/tools/gen.ts` | The offline generator that laid out the boards (paths first, then scrambled) |
| `web/src/ui/Rose.tsx` | The rose-window level select |
| `src/native/` | Expo WebView shell |

## Commands

```bash
npm install && npm run web:install
npm run web:test          # 33 tests, including exact par for every window
npm run build:game
npm run validate:assets
npm run android
```

Editing a window: change its rows in `levels.ts` and run the tests. They report the true par if you need to update it.

## Release builds

The Android release is configured for Google Play: target and compile SDK 36, R8 minification and resource shrinking, a non-debuggable release build, no Internet permission, and the game served offline from the app's own assets. Builds run on EAS; `eas.json` has two profiles:

```bash
npm install -g eas-cli && eas login
eas init                     # once: links this folder to your Expo project
npm run eas:apk              # preview profile: a signed APK for testing on devices
npm run eas:aab              # production profile: an AAB for Google Play (versionCode auto-increments)
```
