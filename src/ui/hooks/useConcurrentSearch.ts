import { useEffect, useState } from "react";
import { SOURCES } from "../../sources/registry";
import { cachedSearch } from "../../sources/cache";
import { HttpError } from "../../util/net";
import type { SourceId, TorrentResult } from "../../sources/types";

// Source priority for "fresh releases" (browse) mode: Russian providers first.
// Sources not in the map get the lowest priority (Infinity).
const BROWSE_SOURCE_PRIORITY: Partial<Record<SourceId, number>> = {
  "nnm-movies": 0,
  "nnm-tv": 0,
  "nnm-games": 0,
  "rutor-movies": 1,
  "rutor-tv": 1,
  "rutor-games": 1,
  "rutor-anime": 1,
  torentino: 2,
};

export interface SourceState {
  loading: boolean;
  error: string | null;
  code: string | null;
  count: number;
}

function errorCode(e: unknown, timedOut: boolean): string {
  if (timedOut) return "тайм-аут";
  if (e instanceof HttpError && e.status > 0) return `HTTP ${e.status}`;
  return "нет ответа";
}

export interface ConcurrentSearchState {
  results: TorrentResult[];
  perSource: Record<SourceId, SourceState>;
  loading: boolean;
  done: number;
  total: number;
}

const PER_SOURCE_TIMEOUT_MS = 25000;

function blankPerSource(loading: boolean): Record<SourceId, SourceState> {
  const out = {} as Record<SourceId, SourceState>;
  for (const s of SOURCES) out[s.id] = { loading, error: null, code: null, count: 0 };
  return out;
}

function dedupe(list: TorrentResult[]): TorrentResult[] {
  const byHash = new Map<string, TorrentResult>();
  for (const r of list) {
    const existing = byHash.get(r.infoHash);
    if (!existing || r.seeders > existing.seeders) byHash.set(r.infoHash, r);
  }
  return [...byHash.values()];
}

// torio's default ordering: healthiest first. The results view can re-sort
// on demand (the `s` key), and its "none"/default state preserves this order.
//
// In browse mode (empty query, "fresh releases") Russian providers take priority
// and within each provider group results are sorted by newest first.
function defaultOrder(list: TorrentResult[], browsing: boolean): TorrentResult[] {
  if (browsing) {
    return list.sort((a, b) => {
      const pa = BROWSE_SOURCE_PRIORITY[a.source] ?? Infinity;
      const pb = BROWSE_SOURCE_PRIORITY[b.source] ?? Infinity;
      if (pa !== pb) return pa - pb;
      return (b.added ?? 0) - (a.added ?? 0);
    });
  }
  return list.sort((a, b) => {
    if (b.seeders !== a.seeders) return b.seeders - a.seeders;
    return (b.added ?? 0) - (a.added ?? 0);
  });
}

function idleState(): ConcurrentSearchState {
  return {
    results: [],
    perSource: blankPerSource(false),
    loading: false,
    done: 0,
    total: SOURCES.length,
  };
}

export function useConcurrentSearch(query: string): ConcurrentSearchState {
  const browsing = query.trim() === "";
  const [state, setState] = useState<ConcurrentSearchState>(idleState);

  useEffect(() => {
    const ctrl = new AbortController();
    let alive = true;
    const collected: TorrentResult[] = [];
    const per = blankPerSource(true);
    let done = 0;

    setState({
      results: [],
      perSource: { ...per },
      loading: true,
      done: 0,
      total: SOURCES.length,
    });

    for (const source of SOURCES) {
      const sc = new AbortController();
      const onAbort = (): void => sc.abort();
      ctrl.signal.addEventListener("abort", onAbort);
      const timer = setTimeout(() => sc.abort(), PER_SOURCE_TIMEOUT_MS);

      cachedSearch(source, query, { signal: sc.signal })
        .then((res) => {
          if (!alive) return;
          collected.push(...res);
          per[source.id] = { loading: false, error: null, code: null, count: res.length };
        })
        .catch((e: unknown) => {
          if (!alive || ctrl.signal.aborted) return;
          const timedOut = sc.signal.aborted;
          per[source.id] = {
            loading: false,
            error: timedOut ? "тайм-аут" : e instanceof Error ? e.message : String(e),
            code: errorCode(e, timedOut),
            count: 0,
          };
        })
        .finally(() => {
          clearTimeout(timer);
          ctrl.signal.removeEventListener("abort", onAbort);
          if (!alive) return;
          done += 1;
          setState({
            results: defaultOrder(dedupe(collected.slice()), browsing),
            perSource: { ...per },
            loading: done < SOURCES.length,
            done,
            total: SOURCES.length,
          });
        });
    }

    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [query, browsing]);

  return state;
}
