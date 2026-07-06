import type { SourceId } from "../sources/types";

export const COLOR = {
  accent: "#ff8f40",
  text: "#bfbdb6",
  alt: "#5a6378",
  good: "#aad94c",
  warn: "#e6b450",
  bad: "#d95757",
  bright: "#d2a6ff",
} as const;

export const ICON = {
  done: "✅",
  error: "❌",
  pending: "⏳",
  pointer: "ᯓ➤",
  dot: "·",
  warn: "⚠️",
  bar: "▌",
  down: "⏬",
  up: "⏫",
  peer: "👤",
  pause: "⏸️",
  all: "🗂️",
  games: "🎮",
  movies: "🎬",
  tv: "📺",
  anime: "🌟",
  library: "📚",
  copy: "📋",
  sort: "📊",
  search: "🔍",
  retry: "🔄",
  clear: "🗑️",
  delete: "🗑️",
  back: "↩️",
  open: "⤶",
  pauseplay: "⏯️",
  stop: "⏹️",
} as const;

export const RULE = "#5a6673";

export const GUTTER = 2;

export const SOURCE_STYLE: Record<SourceId, { tag: string; color: string }> = {
  fitgirl: { tag: "FG", color: COLOR.accent },
  yts: { tag: "YTS", color: COLOR.good },
  eztv: { tag: "EZTV", color: COLOR.warn },
  nyaa: { tag: "NYAA", color: COLOR.bright },
  subsplease: { tag: "SUB", color: "#5a6378" },
  "tpb-movies": { tag: "TPB", color: "#95e6cb" },
  "tpb-tv": { tag: "TPB", color: "#95e6cb" },
  "x1337-movies": { tag: "1337", color: "#f29668" },
  "x1337-tv": { tag: "1337", color: "#f29668" },
  "nnm-movies": { tag: "NNM", color: "#f26d78" },
  "nnm-tv": { tag: "NNM", color: "#f26d78" },
  "nnm-games": { tag: "NNM", color: "#f26d78" },
  torentino: { tag: "TRN", color: "#f26d78" },
  "rutor-movies": { tag: "RTR", color: "#95e6cb" },
  "rutor-tv": { tag: "RTR", color: "#95e6cb" },
  "rutor-games": { tag: "RTR", color: "#95e6cb" },
  "rutor-anime": { tag: "RTR", color: "#95e6cb" },
};

// Tolerant lookup: a source id may be absent (a pasted magnet / bare infohash) or
// no longer exist (a removed source persisted in old history/seeds). Fall back to a
// neutral tag rather than indexing SOURCE_STYLE and crashing on `undefined`.
export function sourceStyle(id?: SourceId): { tag: string; color: string } {
  const s = id ? (SOURCE_STYLE as Record<string, { tag: string; color: string }>)[id] : undefined;
  return s ?? { tag: "•", color: COLOR.alt };
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function lerpHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  const c = (x: number, y: number) =>
    Math.round(x + (y - x) * t)
      .toString(16)
      .padStart(2, "0");
  return `#${c(ar, br)}${c(ag, bg)}${c(ab, bb)}`;
}

export const ACCENT_RAMP: readonly [string, string] = [COLOR.accent, COLOR.bright];
