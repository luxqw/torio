import { Box, Text, useInput } from "ink";
import { TextField } from "./TextField";
import { Panel } from "./Panel";
import { formatTrackers, parseTrackers } from "../../config/trackers";
import { COLOR, ICON } from "../theme";

interface TrackersPromptProps {
  width: number;
  value: string[];
  onSubmit: (trackers: string[]) => void;
  onCancel: () => void;
}

export function TrackersPrompt({ width, value, onSubmit, onCancel }: TrackersPromptProps) {
  useInput((_input, key) => {
    if (key.escape) onCancel();
  });

  return (
    <Box flexDirection="column" width={width}>
      <Panel title="доп. трекеры" width={width} focused height={2}>
        <Box>
          <Text color={COLOR.accent}>{`${ICON.pointer} `}</Text>
          <Box flexGrow={1} minWidth={0}>
            <TextField
              defaultValue={formatTrackers(value)}
              placeholder="udp://tracker.example:1337/announce, https://..."
              onSubmit={(raw) => onSubmit(parseTrackers(raw))}
            />
          </Box>
        </Box>
      </Panel>
      <Box marginTop={1} flexDirection="column">
        <Box>
          <Text color={COLOR.alt}>↵</Text>
          <Text dimColor> сохранить</Text>
          <Text dimColor>{`     ${ICON.dot}     `}</Text>
          <Text color={COLOR.alt}>esc</Text>
          <Text dimColor> отмена</Text>
        </Box>
        <Text dimColor>
          Разделяйте запятыми или пробелами. Пусто = пустой список. Для новых загрузок.
        </Text>
      </Box>
    </Box>
  );
}
