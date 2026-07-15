# torio — agent guide

## First commands

```sh
npm run dev          # live TUI via tsx, no build step
npm run typecheck    # tsc --noEmit before committing
npm test             # vitest (sets TORIO_STATE_DIR to tmp dir)
npm run build        # tsup -> dist/index.js, then postbuild -> dist/cli.cjs
```

Verify with `typecheck && test` before opening a PR.

## Entrypoints

| Purpose | Path |
|---|---|
| App entry (React/Ink) | `src/index.tsx` |
| CLI bin (Node version gate + dynamic import) | `scripts/cli-entry.cjs` → copied to `dist/cli.cjs` by postbuild |
| TSUP bundle config | `tsup.config.ts` — ESM, node22, minified, single chunk |
| Central state interface | `src/ui/store.ts` — `Store` context, consumed via `useStore()` |

## Architecture

- **Ink** (React for CLI) renders the TUI; `DownloadQueue` (EventEmitter in `src/download/queue.ts`) owns all download/seeding state outside React.
- Sources are scrapers in `src/sources/` implementing `Source` (id, label, group, search). Registered in `src/sources/registry.ts`.
- `DownloadQueue` wraps `TorrentEngine` (`src/download/engine.ts`) which wraps WebTorrent.
- Persisted state goes to XDG dirs via `env-paths`; override with `TORIO_STATE_DIR` (tests use this).
- Clipboard: `src/util/clipboard.ts` branches on `win32`/`darwin`/linux (wl-copy → xclip → xsel).
- The UI has "sidebar" / "content" / "help" regions; cursor movement uses `wrapStep` (`src/ui/move.ts`).

## Key conventions

- **Conventional Commits**: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`
- **Cross-platform**: anything touching the OS must handle win32, darwin, and linux
- **Fail soft**: degrade gracefully, never crash the TUI
- **Pastel-violet theme**: exactly one gradient (the wordmark), everything else solid color
- **UI keys**: defined in `src/ui/keymap.ts` — adding a key means updating both `HELP_GROUPS` and `footerHints`
- **Adding a Store field**: also add a matching noop entry in `scripts/render-previews-impl.tsx` or `npm run previews` breaks
- **`resultsPanelOuter`**: the results panel height is intentionally 1 row short of its container to avoid an Ink render desync bug (issue #21)

## Source provider quirks

Every source implements `search(query, opts)`. Empty query = "browse" (fresh releases). Providers that lack browse mode break the main screen Enter-without-query flow.

| Source | Browse works? | Size source | Notes |
|---|---|---|---|
| FitGirl | Yes (RSS) | Not available (0) | WordPress RSS `fetchWordpressRss` |
| YTS | Yes (API) | `size_bytes` JSON | |
| EZTV | Browse-only | `size_bytes` API | Search returns `[]` (inverted guard at `eztv.ts:22`) |
| TPB | Yes (top100) | `size` JSON string | Uses `apibay.org` |
| 1337x | Yes (popular) | HTML `coll-4 size` | Requires detail page for magnet |
| Nyaa | Yes (RSS) | `<nyaa:size>` XML tag | |
| SubsPlease | Yes (API) | `xl` param in magnet URI | Always 0 seeders/leechers |
| NNM Club | Yes | HTML column 5 | Must fetch detail page per item for magnet. Uses `windows-1251` encoding |
| Rutor | **Fixed** | HTML `<td>` | Browse now fetches main page |
| Torentino | **Fixed** | Detail page HTML | Browse now fetches main page. Must download `.torrent` per item for infoHash |

## parseSize locale support

`parseSize` in `src/util/format.ts` handles:
- English/IEC: GiB, MiB, KiB, GB, MB, KB, B
- Russian: ГБ, МБ, КБ (binary interpretation)
- Comma decimal separators: `"1,5 ГБ"` → parseable



- Tests use `vitest`; config at `vitest.config.ts` sets `TORIO_STATE_DIR` to `os.tmpdir()`.
- Mock Node built-ins for platform-dependent code (`node:child_process` in clipboard tests).
- `ink-testing-library` is available as a devDep but not widely used yet.
- Sources tests may have network-dependent fixtures (rss.test.ts, x1337.test.ts, magnet.test.ts).

## Nix

`flake.nix` builds via `buildNpmPackage` with `--ignore-scripts` and a prebuilt `node-datachannel` binary. Clipboard requires `wl-clipboard` + `xclip` in PATH.