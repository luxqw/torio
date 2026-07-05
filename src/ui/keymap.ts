import type { DownloadFocus, Region, Section, SeedFocus } from "./store";
import { ICON } from "./theme";

export interface Hint {
  keys: string;
  label: string;
  icon?: string;
}

interface HelpGroup {
  title: string;
  hints: Hint[];
}

export const HELP_GROUPS: HelpGroup[] = [
  {
    title: "Навигация",
    hints: [
      { keys: "↑ ↓ ← →, h j k l", label: "Навигация по контенту и панелям" },
      { keys: "↵", label: "Открыть" },
      { keys: "tab", label: "Смена панели" },
      { keys: "esc", label: "Назад" },
      { keys: "o", label: "Папка загрузок" },
      { keys: "t", label: "Доп. трекеры" },
      { keys: "q", label: "Выход" },
    ],
  },
  {
    title: "Поиск",
    hints: [
      { keys: "/", label: "Редакт. поиск" },
      { keys: "↵", label: "Поиск" },
      { keys: "s", label: "Сортировка" },
      { keys: "y", label: "Коп. магнет" },
      { keys: "m", label: "Вст. магнет" },
    ],
  },
  {
    title: "Загрузки",
    hints: [
      { keys: "p", label: "Пауза/прод." },
      { keys: "c", label: "Отмена/удаление" },
      { keys: "f", label: "Повтор ошибки" },
      { keys: "d", label: "Скачать снова" },
      { keys: "x", label: "Очистить" },
    ],
  },
  {
    title: "Раздачи",
    hints: [
      { keys: "p", label: "Пауза/прод." },
      { keys: "c", label: "Удалить" },
    ],
  },
];

// Footer labels stay terse so the contextual hint row never wraps; the `?`
// overlay (HELP_GROUPS) carries the full, descriptive list.
const NAVIGATE: Hint = { keys: "↑↓←→", label: "Движ.", icon: ICON.pointer };

const ALWAYS: Hint = { keys: "?", label: "Клавиши", icon: ICON.all };

const SWITCH: Hint = { keys: "tab", label: "Смена", icon: ICON.library };

export function footerHints(
  region: Region,
  section: Section,
  downloadFocus?: DownloadFocus | null,
  seedFocus?: SeedFocus | null,
): Hint[] {
  if (region === "sidebar") {
    return [
      NAVIGATE,
      { keys: "↵", label: "Открыть", icon: ICON.open },
      SWITCH,
      ALWAYS,
      { keys: "q", label: "Выход", icon: ICON.delete },
    ];
  }
  if (section === "seeding") {
    const label =
      seedFocus === "seeding" ? "Пауза" : seedFocus === "missing" ? "Повтор" : "Прод.";
    return [
      { keys: "p", label, icon: ICON.pauseplay },
      { keys: "c", label: "Удалить", icon: ICON.delete },
      SWITCH,
      ALWAYS,
    ];
  }
  if (section === "downloads") {
    if (downloadFocus === "paused") {
      return [
        { keys: "p", label: "Прод.", icon: ICON.pauseplay },
        { keys: "c", label: "Отмена", icon: ICON.stop },
        SWITCH,
        ALWAYS,
      ];
    }
    if (downloadFocus === "failed") {
      return [
        { keys: "f", label: "Повтор", icon: ICON.retry },
        { keys: "c", label: "Удалить", icon: ICON.delete },
        SWITCH,
        ALWAYS,
      ];
    }
    if (downloadFocus === "recent") {
      return [
        NAVIGATE,
        { keys: "d", label: "Заново", icon: ICON.retry },
        { keys: "c", label: "Удалить", icon: ICON.delete },
        { keys: "x", label: "Очистить", icon: ICON.clear },
        SWITCH,
        ALWAYS,
      ];
    }
    return [
      { keys: "p", label: "Пауза", icon: ICON.pauseplay },
      { keys: "c", label: "Отмена", icon: ICON.stop },
      SWITCH,
      ALWAYS,
    ];
  }
  return [
    NAVIGATE,
    { keys: "d", label: "Скачать", icon: ICON.down },
    { keys: "y", label: "Коп.", icon: ICON.copy },
    { keys: "s", label: "Сорт.", icon: ICON.sort },
    { keys: "/", label: "Поиск", icon: ICON.search },
    SWITCH,
    ALWAYS,
  ];
}
