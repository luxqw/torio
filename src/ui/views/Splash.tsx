import { Box, Text, useInput, useStdin } from "ink";
import { Logo } from "../components/Logo";
import { SearchBar } from "../components/SearchBar";
import { LOGO_WIDTH } from "../logo";
import { useStore } from "../store";
import { sourcesByGroup } from "../../sources/registry";
import { COLOR, ICON } from "../theme";

const CATEGORIES = sourcesByGroup()
  .map((g) => g.group.toLowerCase())
  .join(`  ${ICON.dot}  `);

export function Splash() {
  const { submitQuery, quitAll, cols, rows } = useStore();
  const { isRawModeSupported } = useStdin();

  useInput(
    (input, key) => {
      if (key.escape || (key.ctrl && input === "c")) quitAll();
    },
    { isActive: isRawModeSupported },
  );

  const showLogo = cols >= LOGO_WIDTH + 2;
  const barWidth = Math.max(24, Math.min(cols - 6, 62));

  return (
    <Box
      height={Math.max(1, rows - 1)}
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
    >
      {showLogo ? (
        <Logo />
      ) : (
        <Text bold color={COLOR.accent}>
          torio
        </Text>
      )}
      <Box marginTop={2}>
        <Text color={COLOR.text}>Торрент-клиент прямо в терминале.</Text>
      </Box>
      <Box>
        <Text dimColor>{CATEGORIES}</Text>
      </Box>

      <Box marginTop={1} width={barWidth}>
        <SearchBar
          width={barWidth}
          value=""
          editing
          placeholder="Поиск или вставьте магнет-ссылку…"
          onSubmit={submitQuery}
        />
      </Box>
      <Box marginTop={1}>
        <Text>
          <Text color={COLOR.alt}>↵</Text>
          <Text dimColor> поиск</Text>
          <Text dimColor>{`  ${ICON.dot}  `}</Text>
          <Text dimColor>пусто </Text>
          <Text color={COLOR.alt}>↵</Text>
          <Text dimColor> обзор</Text>
          <Text dimColor>{`  ${ICON.dot}  `}</Text>
          <Text color={COLOR.alt}>^c</Text>
          <Text dimColor> выход</Text>
        </Text>
      </Box>
    </Box>
  );
}
