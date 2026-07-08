import { fetchResilient, HttpError, USER_AGENT } from "../util/net";
import { unescapeEntities } from "./rss";
import { buildMagnet } from "./magnet";
import { parseSize } from "../util/format";
import type { SearchOptions, Source, SourceId, TorrentResult } from "./types";

export interface RutorTopSection {
  title: string;
  results: TorrentResult[];
}

const HOST = "https://rutor.info";

const RU_MONTHS: Record<string, number> = {
  "Янв": 0, "Фев": 1, "Мар": 2, "Апр": 3, "Май": 4, "Июн": 5,
  "Июл": 6, "Авг": 7, "Сен": 8, "Окт": 9, "Ноя": 10, "Дек": 11,
};

function parseRutorDate(s: string): number | undefined {
  const m = s.match(/(\d{1,2})\s+([А-Яа-я]{3})\s+(\d{2})/);
  if (!m) return undefined;
  const monthName = m[2]!.charAt(0).toUpperCase() + m[2]!.slice(1).toLowerCase();
  const month = RU_MONTHS[monthName];
  if (month === undefined) return undefined;
  const day = Number(m[1]);
  const year = 2000 + Number(m[3]);
  const secs = Math.floor(Date.UTC(year, month, day) / 1000);
  return Number.isNaN(secs) ? undefined : secs;
}

// Rutor can show sizes in several formats depending on the page:
//   English:  1.45 GiB, 856 MiB, 500 KiB
//   Russian:  1,45 ГБ, 856 МБ
//   Plain:    12345678 (raw bytes)
function parseRutorSize(rowHtml: string): number {
  const cleaned = rowHtml.replace(/&nbsp;/gi, " ");

  const raw = cleaned.match(/<td[^>]*>\s*(\d{5,})\s*<\/td>/i);
  if (raw) return Number(raw[1]);

  const hr = cleaned.match(/<td[^>]*>\s*([\d.,]+\s*(?:[KMGT]i?B|[КМГТ]Б|[кмгт]б))\s*<\/td>/i);
  if (hr) return parseSize(hr[1]!);

  const fallback = cleaned.match(/<td[^>]*align="right"[^>]*>([\d.,]+\s*(?:[KMGT]i?B|B))\s*<\/td>/i);
  if (fallback) return parseSize(fallback[1]!);

  return 0;
}

function parseRow(rowHtml: string, source: SourceId): TorrentResult | null {
  const cleaned = rowHtml.replace(/&nbsp;/gi, " ");

  const magnet = cleaned.match(/href="(magnet:[^"]+)"/i)?.[1];
  if (!magnet) return null;

  const infoHash = magnet.match(/xt=urn:btih:([a-f0-9]{40})/i)?.[1]?.toLowerCase();
  if (!infoHash) return null;

  const nameMatch = cleaned.match(/href="(\/torrent\/\d+\/[^"]+)"[^>]*>([^<]+)<\/a>/i);
  if (!nameMatch) return null;
  const name = unescapeEntities(nameMatch[2]!.trim());

  const seeders = Number(cleaned.match(/<span class="green">.*?(\d+)\s*<\/span>/i)?.[1] ?? 0);
  const leechers = Number(cleaned.match(/<span class="red">.*?(\d+)\s*<\/span>/i)?.[1] ?? 0);

  const sizeBytes = parseRutorSize(cleaned);

  const dateMatch = cleaned.match(/<td[^>]*>\s*(\d{1,2}\s+\S{3}\s+\d{2})\s*<\/td>/);
  const added = dateMatch ? parseRutorDate(dateMatch[1]!) : undefined;

  return {
    infoHash,
    name,
    sizeBytes,
    seeders,
    leechers,
    source,
    magnet: buildMagnet(infoHash, name),
    added,
  };
}

function parseRowsFromTable(tableHtml: string, source: SourceId): TorrentResult[] {
  const out: TorrentResult[] = [];
  const rows = tableHtml.split(/<tr\s+class="(?:gai|tum)">/i).slice(1);
  for (const row of rows) {
    const end = row.indexOf("</tr>");
    const rowHtml = end >= 0 ? row.slice(0, end) : row;
    const r = parseRow(rowHtml, source);
    if (r) out.push(r);
  }
  return out;
}

function parseIndex(html: string, source: SourceId): TorrentResult[] {
  const start = html.indexOf('<div id="index">');
  if (start < 0) return [];
  const section = html.slice(start);
  return parseRowsFromTable(section, source);
}

async function search(
  query: string,
  source: SourceId,
  opts: SearchOptions = {},
): Promise<TorrentResult[]> {
  const q = query.trim();
  const url = q
    ? `${HOST}/search/0/0/000/0/${encodeURIComponent(q)}`
    : HOST;

  const res = await fetchResilient(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: opts.signal,
    retries: 2,
  });
  if (!res.ok) throw new HttpError(res.status, `Rutor returned ${res.status}`);

  const html = await res.text();
  return parseIndex(html, source);
}

export async function fetchRutorTop(opts: SearchOptions = {}): Promise<RutorTopSection[]> {
  const url = `${HOST}/top`;
  const res = await fetchResilient(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: opts.signal,
    retries: 2,
  });
  if (!res.ok) throw new HttpError(res.status, `Rutor top returned ${res.status}`);

  const html = await res.text();
  return parseTopSections(html);
}

function parseTopSections(html: string): RutorTopSection[] {
  const start = html.indexOf('<div id="index">');
  if (start < 0) return [];
  const indexContent = html.slice(start + '<div id="index">'.length);

  const sections: RutorTopSection[] = [];
  const parts = indexContent.split(/<h2>/);
  for (const part of parts) {
    const h2End = part.indexOf("</h2>");
    if (h2End < 0) continue;

    const titleHtml = part.slice(0, h2End);
    const title = unescapeEntities(titleHtml.replace(/<[^>]+>/g, "").trim());
    if (!title) continue;

    const afterTitle = part.slice(h2End + "</h2>".length);
    const results = parseRowsFromTable(afterTitle, "rutor-movies");
    if (results.length > 0) {
      sections.push({ title, results });
    }
  }

  return sections;
}

export const rutorMovies: Source = {
  id: "rutor-movies",
  label: "Rutor",
  group: "Movies",
  homepage: HOST,
  search: (query, opts = {}) => search(query, "rutor-movies", opts),
};

export const rutorTv: Source = {
  id: "rutor-tv",
  label: "Rutor",
  group: "TV",
  homepage: HOST,
  search: (query, opts = {}) => search(query, "rutor-tv", opts),
};

export const rutorGames: Source = {
  id: "rutor-games",
  label: "Rutor",
  group: "Games",
  homepage: HOST,
  search: (query, opts = {}) => search(query, "rutor-games", opts),
};

export const rutorAnime: Source = {
  id: "rutor-anime",
  label: "Rutor",
  group: "Anime",
  homepage: HOST,
  search: (query, opts = {}) => search(query, "rutor-anime", opts),
};
