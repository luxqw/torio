import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Box, Text, useInput } from "ink";
import { useStore } from "../store";
import { Panel } from "../components/Panel";
import { Rule } from "../components/Rule";
import { fetchRutorTop, type RutorTopSection } from "../../sources/rutor";
import { COLOR, GUTTER, ICON, RULE, sourceStyle } from "../theme";
import { cleanText, formatBytes } from "../../util/format";
import type { TorrentResult } from "../../sources/types";

type Mode = "list" | "detail";

// ── columns (ширины, включая отступы) ────────────────
const DATE_W = 7;
const GAP = 3;
const SIZE_W = 10;
const HEALTH_W = 13;
const SRC_W = 5;

const HEADER_BG = "#3a3f4f";
const HEADER_FG = "#e8e8e8";
const TAG_COLOR = "#6a6a6a";

// ── helpers ──────────────────────────────────────────

function formatTopDate(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}.${month}`;
}

function seedColor(n: number): string {
  if (n >= 100) return COLOR.good;
  if (n >= 10) return COLOR.warn;
  return COLOR.bad;
}

/** Разделяет имя торрента на осмысленное название и технические теги. */
function splitName(name: string): { main: string; tags: string } {
  // | (pipe) — самый надёжный разделитель
  const pipe = name.search(/\s*\|\s*/);
  if (pipe > 0) return { main: name.slice(0, pipe).trim(), tags: name.slice(pipe).trim() };

  // [v <version> — версия в квадратных скобках
  const vb = name.match(/^(.+?)\s+(\[v\s)/i);
  if (vb) return { main: vb[1]!.trim(), tags: name.slice(vb[1]!.length).trim() };

  // Tech-теги в квадратных скобках (WEB-DL, BDRip, H.264, …)
  const br = name.match(/^(.+?)\s+(?=\[(?:WEB-DL|BDRip|HDRip|H\.|Rip|RePack|Repack|Portable|Ported|DLС|DLCs|FitGirl|InsaneRamZes))/i);
  if (br) return { main: br[1]!.trim(), tags: name.slice(br[1]!.length).trim() };

  // Год в скобках — после него техническая часть
  const yr = name.match(/^(.+\(\d{4}\))\s+(.+)/);
  if (yr) return { main: yr[1]!.trim(), tags: yr[2]!.trim() };

  // CHT: разделитель "/" но только когда это явно дубль названия / перевод
  // например «Джокер / Joker (2024) …» — оставляем как есть

  return { main: name, tags: "" };
}

// ── Detail ──────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Box>
      <Box width={9} flexShrink={0}><Text dimColor>{label}</Text></Box>
      <Box flexGrow={1} minWidth={0}>{value}</Box>
    </Box>
  );
}

function Detail({ r, width }: { r: TorrentResult; width: number }) {
  const ss = sourceStyle(r.source);
  const date = r.added ? formatTopDate(r.added) : "";
  const health = (r.seeders ?? 0) + (r.leechers ?? 0) > 0 ? (
    <Text>
      <Text color={seedColor(r.seeders ?? 0)} bold={r.seeders > 0}>{r.seeders}</Text>
      <Text dimColor>{` сидеров ${ICON.dot} ${r.leechers} качающих`}</Text>
    </Text>
  ) : <Text dimColor>неизв.</Text>;

  return (
    <Box flexDirection="column">
      <Box>
        <Box flexGrow={1} minWidth={0}>
          <Text bold color={COLOR.text} wrap="truncate-end">{cleanText(r.name)}</Text>
        </Box>
        <Box flexShrink={0} marginLeft={2}>
          <Text color={ss.color} bold>{ss.tag}</Text>
        </Box>
      </Box>
      <Rule width={width} />
      <Box marginTop={1} flexDirection="column">
        <DetailRow label="Размер" value={r.sizeBytes > 0 ? <Text color={COLOR.text}>{formatBytes(r.sizeBytes)}</Text> : <Text dimColor>неизв.</Text>} />
        <DetailRow label="Здоровье" value={health} />
        {r.numFiles ? <DetailRow label="Файлы" value={<Text dimColor>{String(r.numFiles)}</Text>} /> : null}
        {date ? <DetailRow label="Добавлено" value={<Text dimColor>{date}</Text>} /> : null}
        <DetailRow label="Хеш" value={<Text color={COLOR.alt} dimColor wrap="truncate-end">{r.infoHash}</Text>} />
        <DetailRow label="Магнет" value={<Text color={COLOR.alt} dimColor wrap="truncate-end">{r.magnet}</Text>} />
      </Box>
      <Box marginTop={1}>
        <Text>{ICON.down} </Text>
        <Text color={COLOR.accent} bold>d</Text><Text color={COLOR.text}> Скачать</Text>
        <Text dimColor>{`     ${ICON.dot}     `}</Text>
        <Text>{ICON.copy} </Text>
        <Text color={COLOR.accent} bold>y</Text><Text color={COLOR.text}> Коп. магнет</Text>
        <Text dimColor>{`     ${ICON.dot}     `}</Text>
        <Text>{ICON.back} </Text>
        <Text color={COLOR.alt}>esc</Text><Text dimColor> назад</Text>
      </Box>
    </Box>
  );
}



// ── Component ───────────────────────────────────────

export function Top() {
  const { startDownload, copyMagnet, setView, setCaptureMode, contentWidth, listRows } = useStore();

  const [sections, setSections] = useState<RutorTopSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode>("list");
  const [detail, setDetail] = useState<TorrentResult | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchRutorTop({ signal: AbortSignal.timeout(15000) })
      .then((data) => { setSections(data); setLoading(false); })
      .catch((err: unknown) => { setError(err instanceof Error ? err.message : String(err)); setLoading(false); });
  }, []);

  // ── scroll state ──
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  const flatItems = useMemo(() => sections.flatMap((s) => s.results), [sections]);
  const totalItems = flatItems.length;

  const panelOuter = Math.max(5, listRows - 2);
  const pageSize = Math.max(3, panelOuter - 4);

  useEffect(() => { setSelectedIndex(0); setScrollOffset(0); }, [totalItems]);

  const clamped = Math.min(selectedIndex, Math.max(0, totalItems - 1));
  const pageJump = Math.max(1, pageSize - 1);

  const navDown = (): void => {
    if (totalItems === 0) return;
    if (clamped >= totalItems - 1) { setSelectedIndex(0); setScrollOffset(0); return; }
    const next = clamped + 1;
    setSelectedIndex(next);
    if (next >= scrollOffset + pageSize) setScrollOffset(next - pageSize + 1);
  };
  const navUp = (): void => {
    if (totalItems === 0) return;
    if (clamped <= 0) { setSelectedIndex(totalItems - 1); setScrollOffset(Math.max(0, totalItems - pageSize)); return; }
    const next = clamped - 1;
    setSelectedIndex(next);
    if (next < scrollOffset) setScrollOffset(next);
  };
  const navPageDown = (): void => {
    if (totalItems === 0) return;
    const next = Math.min(totalItems - 1, clamped + pageJump);
    setSelectedIndex(next);
    if (next >= scrollOffset + pageSize) setScrollOffset(next - pageSize + 1);
  };
  const navPageUp = (): void => {
    if (totalItems === 0) return;
    const next = Math.max(0, clamped - pageJump);
    setSelectedIndex(next);
    if (next < scrollOffset) setScrollOffset(next);
  };

  const visStart = scrollOffset;
  const visEnd = Math.min(totalItems, visStart + pageSize);

  const visibleSections = useMemo(() => {
    const vs: Array<{ title: string; results: TorrentResult[]; globalStart: number }> = [];
    let offset = 0;
    for (const s of sections) {
      const sStart = offset;
      const sEnd = offset + s.results.length;
      if (sEnd > visStart && sStart < visEnd) {
        const lo = Math.max(0, visStart - sStart);
        const hi = Math.min(s.results.length, visEnd - sStart);
        vs.push({ title: s.title, results: s.results.slice(lo, hi), globalStart: sStart + lo });
      }
      offset = sEnd;
    }
    return vs;
  }, [sections, visStart, visEnd]);

  // ── scrollbar chars ─────────────────────────────
  const totalRenderedLines = visibleSections.reduce((a, vs) => a + 2 + vs.results.length, 0);
  const scrollChars: string[] = useMemo(() => {
    if (totalItems <= pageSize || totalRenderedLines === 0) return Array(totalRenderedLines).fill("░");
    const thumbH = Math.max(1, Math.round((pageSize / Math.max(1, totalItems)) * totalRenderedLines));
    const range = Math.max(1, totalItems - pageSize);
    const thumbTop = Math.round((scrollOffset / range) * (totalRenderedLines - thumbH));
    return Array.from({ length: totalRenderedLines }, (_, i) =>
      i >= thumbTop && i < thumbTop + thumbH ? "█" : "░",
    );
  }, [totalItems, pageSize, scrollOffset, totalRenderedLines]);

  // ── actions ─────────────────────────────────────
  const openDownload = (r: TorrentResult): void =>
    startDownload({ id: r.infoHash, name: r.name, magnet: r.magnet, source: r.source, sizeBytes: r.sizeBytes });
  const copyResultMagnet = (r: TorrentResult): void =>
    copyMagnet({ name: r.name, magnet: r.magnet });

  useEffect(() => { setCaptureMode("esc"); return () => setCaptureMode("none"); }, [setCaptureMode]);

  useInput((input, key) => {
    if (key.escape) {
      if (mode === "detail") { setMode("list"); setDetail(null); return; }
      setView("splash"); return;
    }
    if (mode === "detail") {
      if (input === "d" && detail) openDownload(detail);
      else if (input === "y" && detail) copyResultMagnet(detail);
      return;
    }
    if (key.upArrow || input === "k") { navUp(); return; }
    if (totalItems === 0) return;
    if (key.downArrow || input === "j") navDown();
    else if (key.pageUp) navPageUp();
    else if (key.pageDown) navPageDown();
    else if (key.return) { const r = flatItems[clamped]; if (r) { setDetail(r); setMode("detail"); } }
    else if (input === "d") { const r = flatItems[clamped]; if (r) openDownload(r); }
    else if (input === "y") { const r = flatItems[clamped]; if (r) copyResultMagnet(r); }
  }, { isActive: true });

  const showStats = useMemo(() => flatItems.some((r) => r.sizeBytes > 0 || r.seeders > 0), [flatItems]);
  const count = totalItems > 0 ? `(${totalItems})` : undefined;

  // ── render: list ─────────────────────────────────
  const innerWidth = contentWidth - 4; // panel border(2) + paddingX(2)
  const nameColW = Math.max(4, innerWidth - GUTTER - DATE_W - GAP - SIZE_W - HEALTH_W - SRC_W - 1);

  function buildHeaderLine(show: boolean): string {
    const gutter = " ".repeat(GUTTER);
    const gap = " ".repeat(GAP);
    const dateH = "Дата".padStart(DATE_W);
    const nameH = "Название".padEnd(nameColW);
    const sizeH = "Размер".padStart(SIZE_W);
    const healthH = "Сид/Пир".padStart(HEALTH_W);
    const srcH = "Ист.".padStart(SRC_W);
    if (show) return (gutter + dateH + gap + nameH + sizeH + healthH + srcH).padEnd(innerWidth);
    const nameHWide = Math.max(4, innerWidth - GUTTER - DATE_W - GAP - SRC_W - 1);
    return (gutter + dateH + gap + "Название".padEnd(nameHWide) + srcH).padEnd(innerWidth);
  }

  function renderList(): ReactNode {
    if (loading) return <Box><Text dimColor>Загрузка топа с rutor.is…</Text></Box>;
    if (error) return <Box><Text color={COLOR.warn}>Ошибка: {error}</Text></Box>;
    if (totalItems === 0) return <Box><Text dimColor>Сейчас ничего нового.</Text></Box>;

    let lineIdx = 0;
    const rows: ReactNode[] = [];

    for (const vs of visibleSections) {
      // ── category title row ──
      const titleStr = vs.title.toUpperCase();
      const fillLen = Math.max(1, innerWidth - titleStr.length - 3);
      const sepLine = `${titleStr} ─${"─".repeat(fillLen)}`;
      rows.push(
        <Box key={`t-${vs.title}`}>
          <Box flexGrow={1} minWidth={0}>
            <Text bold color={COLOR.accent} wrap="truncate-end">{sepLine}</Text>
          </Box>
          <Box width={1} flexShrink={0}>
            <Text dimColor>{scrollChars[lineIdx]}</Text>
          </Box>
        </Box>,
      );
      lineIdx++;

      // ── header row (continuous full-width background) ──
      rows.push(
        <Box key={`h-${vs.title}`}>
          <Text backgroundColor={HEADER_BG} color={HEADER_FG} bold wrap="truncate-end">
            {buildHeaderLine(showStats)}
          </Text>
        </Box>,
      );
      lineIdx++;

      // ── data rows ──
      for (let ri = 0; ri < vs.results.length; ri++) {
        const r = vs.results[ri]!;
        const flatIdx = vs.globalStart + ri;
        const here = flatIdx === clamped;
        const ss = sourceStyle(r.source);

        const { main, tags } = splitName(r.name);
        const dateText = r.added ? formatTopDate(r.added) : "–".padEnd(DATE_W);
        const seeds = r.seeders ?? 0;
        const leechers = r.leechers ?? 0;

        rows.push(
          <Box key={r.infoHash}>
            <Box width={GUTTER} flexShrink={0}>
              <Text color={COLOR.accent}>{here ? ICON.pointer : ""}</Text>
            </Box>
            <Box width={DATE_W} flexShrink={0} justifyContent="flex-end">
              <Text dimColor={!here} color={here ? COLOR.accent : undefined}>{dateText}</Text>
            </Box>
            <Box width={GAP} flexShrink={0} />
            <Box flexGrow={1} minWidth={0}>
              <Text
                wrap="truncate-end"
                color={here ? COLOR.accent : COLOR.text}
                dimColor={!here && !main}
                bold={here}
              >
                {cleanText(main)}
              </Text>
              {tags ? (
                <Text wrap="truncate-end" color={TAG_COLOR} dimColor>
                  {" "}{cleanText(tags)}
                </Text>
              ) : null}
            </Box>
            {showStats ? (
              <>
                <Box width={SIZE_W} flexShrink={0} justifyContent="flex-end">
                  <Text dimColor={!here} color={here ? COLOR.accent : undefined}>
                    {r.sizeBytes > 0 ? formatBytes(r.sizeBytes) : "–"}
                  </Text>
                </Box>
                <Box width={HEALTH_W} flexShrink={0} justifyContent="flex-end">
                  {seeds + leechers > 0 ? (
                    <Text>
                      <Text color={here ? COLOR.accent : seedColor(seeds)}>{`▲${seeds}`}</Text>
                      <Text dimColor>{` ▼${leechers}`}</Text>
                    </Text>
                  ) : <Text dimColor>–</Text>}
                </Box>
              </>
            ) : null}
            <Box width={SRC_W} flexShrink={0} justifyContent="flex-end">
              <Text color={here ? COLOR.accent : ss.color} dimColor={!here}>{ss.tag}</Text>
            </Box>
            <Box width={1} flexShrink={0}>
              <Text dimColor>{scrollChars[lineIdx] ?? "░"}</Text>
            </Box>
          </Box>,
        );
        lineIdx++;
      }
    }

    return <Box flexDirection="column">{rows}</Box>;
  }

  // ── render ──────────────────────────────────────
  return (
    <Box flexDirection="column">
      <Panel
        title={mode === "detail" ? "детали" : "🏆 топ"}
        width={contentWidth}
        focused
        count={mode === "detail" ? undefined : count}
        height={panelOuter}
      >
        {mode === "detail" && detail ? (
          <Detail r={detail} width={Math.max(10, contentWidth - 4)} />
        ) : (
          renderList()
        )}
      </Panel>
    </Box>
  );
}
