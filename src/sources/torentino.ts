import { fetchResilient, HttpError, USER_AGENT } from "../util/net";
import parseTorrent from "parse-torrent";
import { buildMagnet } from "./magnet";
import { parseSize } from "../util/format";
import type { SearchOptions, Source, TorrentResult } from "./types";

const BASE = "https://torentino.org";
const MAX_RESULTS = 10;

interface Entry {
  id: number;
  name: string;
  path: string;
  category: string;
  added: number;
}

function parseDate(s: string): number {
  const m = s.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!m) return 0;
  const secs = Math.floor(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])) / 1000);
  return Number.isNaN(secs) ? 0 : secs;
}

function parseEntries(html: string): Entry[] {
  const out: Entry[] = [];
  const blocks = html.split('<div class="shortstory">').slice(1);
  for (const block of blocks) {
    const linkMatch = block.match(/href="(\/load\/[^"]+\/(\d+-\d+-\d+-(\d+)))"/);
    if (!linkMatch) continue;
    const path = linkMatch[1]!;
    const entryId = Number(linkMatch[3]!);
    if (!entryId) continue;

    const titleMatch = block.match(/<h2>\s*<a[^>]*>([^<]+)<\/a>\s*<\/h2>/);
    if (!titleMatch) continue;
    const name = titleMatch[1]!.replace(/\s*скачать\s+торрент\s*$/i, "").trim();

    const catMatch = block.match(/<div class="short_cat">\s*<a[^>]*>([^<]+)<\/a>/);
    const category = catMatch ? catMatch[1]!.trim() : "";

    const dateMatch = block.match(/\|\s*Дата:\s*([\d.,:\s]+)<\/span>/);
    const added = dateMatch ? parseDate(dateMatch[1]!) : 0;

    out.push({ id: entryId, name, path, category, added });
  }
  return out;
}

async function fetchDetail(
  entry: Entry,
  opts: SearchOptions,
): Promise<{ sizeBytes: number } | null> {
  try {
    const res = await fetchResilient(`${BASE}${entry.path}`, {
      headers: { "User-Agent": USER_AGENT },
      signal: opts.signal,
      retries: 1,
    });
    if (!res.ok) return null;
    const html = await res.text();

    let sizeBytes = 0;
    const sizeMatch = html.match(/Место\s+на\s+диске[^<]*<\/b>\s*([^<]+)/i);
    if (sizeMatch) {
      sizeBytes = parseSize(sizeMatch[1]!.trim());
    }

    return { sizeBytes };
  } catch {
    return null;
  }
}

async function fetchTorrent(
  entryId: number,
  opts: SearchOptions,
): Promise<string | null> {
  try {
    const res = await fetchResilient(`${BASE}/load/0-0-0-${entryId}-20`, {
      headers: { "User-Agent": USER_AGENT },
      signal: opts.signal,
      retries: 1,
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const parsed = await parseTorrent(new Uint8Array(buf));
    return parsed?.infoHash?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

export const torentino: Source = {
  id: "torentino",
  label: "Torentino",
  group: "Games",
  homepage: BASE,
  search: async (query, opts = {}) => {
    const q = query.trim();
    if (!q) return [];

    const formData = new URLSearchParams({
      do: "search",
      subaction: "search",
      a: "2",
      query: q,
    });

    const res = await fetchResilient(`${BASE}/load`, {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
      signal: opts.signal,
    });

    if (!res.ok) throw new HttpError(res.status, `Torentino returned ${res.status}`);
    const html = await res.text();

    const entries = parseEntries(html).slice(0, MAX_RESULTS);

    const results = await Promise.all(
      entries.map(async (entry): Promise<TorrentResult | null> => {
        const [detail, infoHash] = await Promise.all([
          fetchDetail(entry, opts),
          fetchTorrent(entry.id, opts),
        ]);

        if (!infoHash) return null;

        const magnet = buildMagnet(infoHash, entry.name);

        return {
          infoHash,
          name: entry.name,
          sizeBytes: detail?.sizeBytes ?? 0,
          seeders: 0,
          leechers: 0,
          source: "torentino",
          magnet,
          added: entry.added || undefined,
        };
      }),
    );

    return results.filter((r): r is TorrentResult => r !== null);
  },
};
