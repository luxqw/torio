import { isInfoHash } from "../sources/magnet";

export type CliCommand =
  | { kind: "version" }
  | { kind: "help" }
  | { kind: "run"; initialMagnet?: string; initialTorrent?: string }
  | { kind: "invalid"; arg: string };

export function parseCliArgs(argv: string[]): CliCommand {
  const args = argv.filter((a) => a.trim() !== "");
  if (args.length === 0) return { kind: "run" };
  const a = args[0]!;
  if (a === "--version" || a === "-v") return { kind: "version" };
  if (a === "--help" || a === "-h") return { kind: "help" };
  if (/^magnet:\?/i.test(a)) return { kind: "run", initialMagnet: a };
  if (isInfoHash(a)) return { kind: "run", initialMagnet: a };
  if (/\.torrent$/i.test(a)) return { kind: "run", initialTorrent: a };
  return { kind: "invalid", arg: a };
}

export const HELP_TEXT = `torio — поиск торрентов прямо в терминале

использование
  torio                      открыть TUI поиска
  torio "magnet:?xt=..."     начать загрузку при запуске
  torio путь/до/файл.torrent открыть .torrent файл при запуске
  torio --version            показать версию

после открытия: набирайте для поиска по всем источникам, enter для запуска,
стрелки для перемещения, d для загрузки, ? для клавиш
подсказка: заключайте магнет-ссылки в кавычки (они содержат символы &)
`;
