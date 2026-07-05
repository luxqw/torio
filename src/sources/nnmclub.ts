import { fetchResilient, HttpError, USER_AGENT } from "../util/net";
import { parseSize } from "../util/format";
import { unescapeEntities } from "./rss";
import type { SearchOptions, Source, SourceId, TorrentResult } from "./types";

const BASE = "https://nnmclub.to";
const ENC = "windows-1251";
const MAX_DETAILS = 8;

async function fetchDecoded(
  url: string,
  opts: SearchOptions,
  retries = 2,
): Promise<string> {
  const res = await fetchResilient(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: opts.signal,
    retries,
  });
  if (!res.ok) throw new HttpError(res.status, `NNM returned ${res.status}`);
  const buf = await res.arrayBuffer();
  return new TextDecoder(ENC).decode(new Uint8Array(buf));
}

interface Row {
  name: string;
  topicId: string;
  sizeBytes: number;
  seeders: number;
  leechers: number;
  added: number;
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\xa0/g, " ")
    .trim();
}

function parseRows(html: string): Row[] {
  const out: Row[] = [];
  const rowRe = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRe.exec(html)) !== null) {
    const tr = rowMatch[0];
    const cells = tr.match(/<td[^>]*>[\s\S]*?<\/td>/gi);
    if (!cells || cells.length < 9) continue;

    // Topic (column 2): topic ID and title
    const topicCell = cells[1]!;
    const topicLink = topicCell.match(
      /href="[^"]*viewtopic\.php\?t=(\d+)"[^>]*>(.*?)<\/a>/i,
    );
    if (!topicLink) continue;
    const topicId = topicLink[1]!;
    const name = unescapeEntities(stripHtml(topicLink[2]!));
    if (!name) continue;

    // Size (column 5): raw bytes followed by human-readable
    const sizeText = stripHtml(cells[4]!);
    const rawBytes = Number(sizeText.match(/^(\d+)/)?.[1] ?? 0);
    const sizeBytes =
      rawBytes > 0
        ? rawBytes
        : (() => {
            const sm = sizeText.match(/([\d.]+\s*[KMGT]I?B)/i);
            return sm ? parseSize(sm[1]!) : 0;
          })();

    // Seeders (column 6)
    const seeders = Number(
      stripHtml(cells[5]!).match(/(\d+)/)?.[1] ?? 0,
    );

    // Leechers (column 7)
    const leechers = Number(
      stripHtml(cells[6]!).match(/(\d+)/)?.[1] ?? 0,
    );

    // Added (column 9): unix timestamp
    const added = Number(
      stripHtml(cells[8]!).match(/^(\d{10})/)?.[1] ?? 0,
    );

    out.push({ name, topicId, sizeBytes, seeders, leechers, added });
  }
  return out;
}

async function detailInfo(
  topicId: string,
  opts: SearchOptions,
): Promise<string | null> {
  try {
    const url = `${BASE}/forum/viewtopic.php?t=${topicId}`;
    const html = await fetchDecoded(url, opts, 1);
    const m = html.match(/href="(magnet:\?xt=urn:btih:[^"<>]+)"/i);
    return m ? unescapeEntities(m[1]!) : null;
  } catch {
    return null;
  }
}

async function search(
  query: string,
  sourceId: SourceId,
  opts: SearchOptions = {},
): Promise<TorrentResult[]> {
  const q = query.trim();
  let url = `${BASE}/forum/tracker.php?f=-1`;
  if (q) url += `&nm=${encodeURIComponent(q)}`;

  const html = await fetchDecoded(url, opts);
  const rows = parseRows(html);

  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  const matched = tokens.length
    ? rows.filter((r) =>
        tokens.every((t) => r.name.toLowerCase().includes(t)),
      )
    : rows;

  matched.sort((a, b) => b.seeders - a.seeders);
  const top = matched.slice(0, MAX_DETAILS);

  const settled = await Promise.all(
    top.map(async (row): Promise<TorrentResult | null> => {
      const magnet = await detailInfo(row.topicId, opts);
      const infoHash = magnet
        ?.match(/urn:btih:([a-zA-Z0-9]+)/i)?.[1]
        ?.toLowerCase();
      if (!magnet || !infoHash) return null;

      return {
        infoHash,
        name: row.name,
        sizeBytes: row.sizeBytes,
        seeders: row.seeders,
        leechers: row.leechers,
        source: sourceId,
        magnet,
        added: row.added || undefined,
      };
    }),
  );

  return settled.filter((r): r is TorrentResult => r !== null);
}

export const nnmMovies: Source = {
  id: "nnm-movies",
  label: "NNM Club",
  group: "Movies",
  homepage: BASE,
  search: (query, opts = {}) => search(query, "nnm-movies", opts),
};

export const nnmTv: Source = {
  id: "nnm-tv",
  label: "NNM Club",
  group: "TV",
  homepage: BASE,
  search: (query, opts = {}) => search(query, "nnm-tv", opts),
};

export const nnmGames: Source = {
  id: "nnm-games",
  label: "NNM Club",
  group: "Games",
  homepage: BASE,
  search: (query, opts = {}) => search(query, "nnm-games", opts),
};
