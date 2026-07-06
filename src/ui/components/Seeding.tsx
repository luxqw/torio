import { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { useStore, useQueueHistory, useSeeds, type SeedFocus } from "../store";
import { Panel } from "./Panel";
import { wrapStep, windowStart } from "../move";
import { COLOR, GUTTER, ICON, sourceStyle } from "../theme";
import { cleanText, formatBytes, formatBytesPerSec, truncate } from "../../util/format";
import type { SeedItem } from "../../download/types";

const MARK = 2;
const SIZE_W = 10;
const STATUS_W = 14;
const SRC_W = 4;
const PAUSED = "#5a6378";

function glyph(seed: SeedItem | undefined): { icon: string; color: string } {
  if (!seed) return { icon: ICON.done, color: COLOR.good };
  if (seed.status === "seeding") return { icon: ICON.up, color: COLOR.good };
  if (seed.status === "paused") return { icon: ICON.pause, color: PAUSED };
  return { icon: ICON.warn, color: COLOR.warn };
}

function statusCell(seed: SeedItem | undefined): { text: string; color?: string; dim: boolean } {
  if (!seed) return { text: "готово", dim: true };
  if (seed.status === "seeding") {
    return { text: `${ICON.up} ${formatBytesPerSec(seed.uploadSpeed) || "0 B/s"} ${ICON.peer} ${seed.peers}`, color: COLOR.good, dim: false };
  }
  if (seed.status === "paused") return { text: "пауза", dim: true };
  return { text: "файл удалён", color: COLOR.warn, dim: false };
}

export function Seeding() {
  const { queue, region, contentWidth, listRows, setNotice, setSeedFocus } = useStore();
  const history = useQueueHistory(queue);
  const seeds = useSeeds(queue);
  const focused = region === "content";

  const total = history.length;
  const [cursor, setCursor] = useState(0);
  const clamped = Math.min(cursor, Math.max(0, total - 1));

  const focusStatus: SeedFocus | null =
    focused && total > 0 ? (seeds.get(history[clamped]?.id ?? "")?.status ?? "idle") : null;
  useEffect(() => {
    setSeedFocus(focusStatus);
    return () => setSeedFocus(null);
  }, [focusStatus, setSeedFocus]);

  useInput(
    (input, key) => {
      if (key.upArrow || input === "k") setCursor(wrapStep(clamped, -1, total));
      else if (key.downArrow || input === "j") setCursor(wrapStep(clamped, 1, total));
      else if (input === "p") {
        const h = history[clamped];
        if (!h) return;
        queue.toggleSeeding(h);
        if (queue.getSeed(h.id)?.status === "missing") {
          setNotice(`${ICON.warn} Файл больше не на диске.`);
        }
      } else if (input === "c") {
        const h = history[clamped];
        if (h) queue.removeHistory(h.id);
      }
    },
    { isActive: focused && total > 0 },
  );

  const panelH = Math.max(5, listRows - 1);
  const seedingCount = queue.seedingCount;

  if (total === 0) {
    return (
      <Panel title="раздачи" width={contentWidth} focused={focused} height={panelH}>
        <Text dimColor>Пока ничего. Раздачи начинаются автоматически после завершения загрузки.</Text>
      </Panel>
    );
  }

  // Summary line: live totals across active seeds, or an invite to start.
  let totalUp = 0;
  let totalPeers = 0;
  let totalShared = 0;
  for (const s of seeds.values()) {
    totalShared += s.uploaded;
    if (s.status === "seeding") {
      totalUp += s.uploadSpeed;
      totalPeers += s.peers;
    }
  }

  const rows = Math.max(1, panelH - 2);
  const start = windowStart(clamped, total, rows);
  const visible = history.slice(start, start + rows);

  return (
    <Panel
      title="раздачи"
      width={contentWidth}
      focused={focused}
      count={seedingCount > 0 ? `(${seedingCount})` : undefined}
      height={panelH}
    >
      <Box>
        {seedingCount > 0 ? (
          <Text color={COLOR.good}>
            {ICON.up} {formatBytesPerSec(totalUp) || "0 B/s"}
            <Text dimColor>{`  ${ICON.dot}  ${totalPeers} пиров  ${ICON.dot}  ${formatBytes(totalShared)} роздано`}</Text>
          </Text>
        ) : (
          <Text dimColor>Раздачи начинаются автоматически. Нажмите p для паузы или возобновления.</Text>
        )}
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Box>
          <Box width={MARK} flexShrink={0} />
          <Box width={GUTTER} flexShrink={0} />
          <Box flexGrow={1} minWidth={0} marginLeft={1}>
            <Text bold dimColor>Название</Text>
          </Box>
          <Box width={SIZE_W} flexShrink={0} marginLeft={1} justifyContent="flex-end">
            <Text bold dimColor>Размер</Text>
          </Box>
          <Box width={STATUS_W} flexShrink={0} marginLeft={1} justifyContent="flex-end">
            <Text bold dimColor>Статус</Text>
          </Box>
          <Box width={SRC_W} flexShrink={0} marginLeft={1} justifyContent="flex-end">
            <Text bold dimColor>Ист.</Text>
          </Box>
        </Box>

        {visible.map((h, i) => {
          const here = start + i === clamped && focused;
          const seed = seeds.get(h.id);
          const g = glyph(seed);
          const st = statusCell(seed);
          const ss = sourceStyle(h.source);
          return (
            <Box key={h.id}>
              <Box width={MARK} flexShrink={0}>
                <Text color={COLOR.accent} bold>{here ? ICON.pointer : ""}</Text>
              </Box>
              <Box width={GUTTER} flexShrink={0}>
                <Text color={g.color} dimColor={!seed && !here}>{g.icon}</Text>
              </Box>
              <Box flexGrow={1} minWidth={0} marginLeft={1}>
                <Text wrap="truncate-end" bold={here} color={here ? COLOR.accent : undefined} dimColor={!here}>
                  {cleanText(h.name)}
                </Text>
              </Box>
              <Box width={SIZE_W} flexShrink={0} marginLeft={1} justifyContent="flex-end">
                <Text dimColor>{h.sizeBytes > 0 ? formatBytes(h.sizeBytes) : "-"}</Text>
              </Box>
              <Box width={STATUS_W} flexShrink={0} marginLeft={1} justifyContent="flex-end">
                <Text color={st.color} dimColor={st.dim}>{truncate(st.text, STATUS_W)}</Text>
              </Box>
              <Box width={SRC_W} flexShrink={0} marginLeft={1} justifyContent="flex-end">
                <Text color={h.source ? ss.color : undefined} dimColor={!h.source || !here}>
                  {h.source ? ss.tag : "mag"}
                </Text>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Panel>
  );
}
