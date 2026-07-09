# Архитектура torio

## Обзор

**torio-cli** — TUI-клиент для поиска и скачивания торрентов, построенный на React/Ink и WebTorrent. Работает полностью в терминале, не требует браузера или GUI.

```
Пользователь → CLI аргументы → React/Ink TUI → DownloadQueue → TorrentEngine → WebTorrent
                                    ↑                        ↓
                               EventEmitter              Poll 500ms
```

---

## Структура

```
torio/
├── src/                          # ═══ TUI-приложение (TypeScript/React) ═══
│   ├── index.tsx                 # Точка входа: CLI, терминал, render(<App>)
│   ├── cli/args.ts               # Разбор аргументов (magnet, .torrent, --help)
│   ├── config/                   # Конфигурация (загрузка/сохранение)
│   │   ├── config.ts             # downloadDir, trackers
│   │   ├── paths.ts              # XDG-пучи, TORIO_STATE_DIR
│   │   └── trackers.ts           # Парсинг/форматирование трекеров
│   ├── download/                 # ═══ Ядро загрузок ═══
│   │   ├── queue.ts              # DownloadQueue (EventEmitter) — оркестратор
│   │   ├── engine.ts             # TorrentEngine — обёртка над WebTorrent
│   │   ├── history.ts            # Persistent HistoryItem (HISTORY_CAP=500)
│   │   ├── persist.ts            # Сохранение очереди, сидов, .torrent-мета
│   │   ├── reconcile.ts          # Восстановление очереди после перезапуска
│   │   └── types.ts              # QueueItem, SeedItem, DownloadStatus…
│   ├── sources/                  # ═══ Скраперы трекеров ═══
│   │   ├── types.ts              # Source, TorrentResult, SourceId
│   │   ├── registry.ts           # SOURCES[] (18 шт), getSource(), sourcesByGroup()
│   │   ├── cache.ts              # TTL-кэш 5 мин
│   │   ├── magnet.ts             # Построение/парсинг magnet-ссылок
│   │   ├── torrentFile.ts        # .torrent → magnet через parse-torrent
│   │   ├── rss.ts                # WordPress RSS парсер (FitGirl)
│   │   ├── fitgirl.ts            # FitGirl repacks (RSS)
│   │   ├── yts.ts                # YTS movies (JSON API)
│   │   ├── eztv.ts               # EZTV TV (JSON, browse-only)
│   │   ├── piratebay.ts          # TPB (apibay.org JSON)
│   │   ├── x1337.ts              # 1337x (HTML)
│   │   ├── nyaa.ts               # Nyaa.si (RSS XML)
│   │   ├── subsplease.ts         # SubsPlease (JSON API)
│   │   ├── nnmclub.ts            # NNM Club (HTML, windows-1251)
│   │   ├── rutor.ts              # Rutor (HTML)
│   │   └── torentino.ts          # Torentino (HTML, .torrent)
│   ├── ui/                       # ═══ Компоненты интерфейса ═══
│   │   ├── App.tsx               # Главный компонент (509 строк)
│   │   ├── store.ts              # Store (context + хуки)
│   │   ├── keymap.ts             # HELP_GROUPS, footerHints
│   │   ├── move.ts               # wrapStep, windowStart
│   │   ├── sort.ts               # SortField, SORT_CYCLE, sortResults
│   │   ├── theme.ts              # COLORS, ICONS, SOURCE_STYLE
│   │   ├── logo.ts               # ASCII-арт логотипа
│   │   ├── sheen.ts              # Анимация прогресс-бара
│   │   ├── components/           # Компоненты Ink
│   │   │   ├── Logo.tsx, Sidebar.tsx, SearchBar.tsx
│   │   │   ├── Results.tsx, Downloads.tsx, Seeding.tsx
│   │   │   ├── Panel.tsx, ProgressBar.tsx, Footer.tsx
│   │   │   ├── HelpOverlay.tsx, Spinner.tsx, TabTitle.tsx
│   │   │   ├── TextField.tsx, Rule.tsx
│   │   │   ├── FolderPrompt.tsx, TrackersPrompt.tsx
│   │   ├── views/
│   │   │   ├── Splash.tsx        # Стартовый экран
│   │   │   └── Top.tsx           # rutor.top
│   │   └── hooks/
│   │       ├── useConcurrentSearch.ts  # Параллельный поиск
│   │       └── useMouseWheel.ts        # Колёсико мыши
│   └── util/
│       ├── format.ts             # bytes, size, count, time, clean, truncate
│       ├── clipboard.ts          # Кроссплатформенный буфер обмена
│       ├── net.ts                # fetchResilient (retry, backoff, jitter)
│       └── atomic.ts             # Атомарная JSON-запись
├── landing/                      # ═══ Лендинг (статический HTML) ═══
│   ├── index.html                # Полная страница (1211 строк)
│   ├── favicon.png               # Иконка 48×48 из лого
│   ├── logo.webp                 # Логотип (webp, 130KB)
│   └── preview/                  # Скриншоты/медиа
│       ├── og-image.webp         # Open Graph (239KB)
│       ├── torio-hero.webp       # Hero-картинка
│       ├── 01_main-page.webp …   # 7 слайдов интерфейса
│       └── full/                 # Полноразмерные для лайтбокса
├── scripts/                      # ═══ Скрипты ═══
│   ├── cli-entry.cjs             # Точка входа CLI (gate Node ≥22)
│   ├── postbuild.cjs             # dist/cli.cjs + chmod
│   ├── render-previews.tsx       # Генерация SVG-превью
│   ├── verify-seeding.ts         # E2E-тест сидирования
│   ├── setup.sh / setup.bat      # Скрипты установки
├── .github/workflows/
│   ├── pages.yml                 # Деплой лендинга на GitHub Pages
│   └── publish.yml               # Публикация в npm/GitHub Packages
├── nix/package.nix               # Сборка Nix
├── package.json
├── tsup.config.ts                # Бандлер (ESM, node22, minify)
├── vitest.config.ts              # Тесты (TORIO_STATE_DIR = tmp)
└── tsconfig.json
```

---

## Поток данных

### Запуск

```
process.argv
    ↓
cli-entry.cjs (Node ≥22)
    ↓ dynamic import
src/index.tsx
    ├── parseCliArgs() → CliCommand
    ├── enter alternate screen, hide cursor
    ├── loadConfig()
    ├── new DownloadQueue → engine.load(electron.cached) → restore state
    └── render(<App />) через Ink
```

### Поиск

```
Пользователь вводит запрос → Enter
    ↓
App → submitQuery(query)
    ↓
useConcurrentSearch(query):
    ├── Для каждого Source из SOURCES[]:
    │   └── cachedSearch(source, query)
    │       ├── cache.get() → если есть и не истёк (5 мин TTL)
    │       └── source.search(query, { signal })  ← параллельно
    │           ├── fetchResilient(url)  ← retry + backoff
    │           └── парсинг ответа → TorrentResult[]
    ├── Дедикация по infoHash (оставляем с макс. сидерами)
    └── Сортировка (по умолчанию seeders ↓)
```

### Загрузка

```
Пользователь → 'd' на результате
    ↓
store.startDownload(result)
    ↓
queue.add(result.magnet, dir)
    ├── engine.add(id, magnet, dir, handlers, trackers)
    │   └── WebTorrent.client.add(source)
    ├── items.set(id, QueueItem)
    └── changed() → emit "update"
```

### Мониторинг

```
queue.pollInterval (setInterval, 500ms):
    ├── Для каждого item: engine.stats(id) → прогресс/скорость/пиры
    ├── Для каждого seed: engine.stats(id) → upload/peers
    ├── strayDownload check (защита от перекачки удалённых файлов)
    └── changed() → emit "update"
        ↓
React: useQueueItems(queue) → on "update":
    ├── debounce 200ms
    └── setState(items)
        ↓
        Перерендер Downloads, Seeding
```

### Завершение

```
Torrent done → onDone handler:
    ├── complete(it):
    │   ├── move to seeds Map
    │   ├── recordHistory(it) → saveHistorySync()
    │   └── changed()
    └── notify → showToast("Загрузка завершена")
```

---

## Store (управление состоянием)

Живёт в `src/ui/store.ts`. 27 полей, пробрасывается через React Context.

```
Store {
    config / setConfig          // Конфигурация
    queue                       // DownloadQueue (EventEmitter, вне React)
    view / setView              // "splash" | "browser" | "top"
    query / submitQuery         // Поисковый запрос
    section / setSection        // all | games | movies | tv | anime
    region / setRegion          // sidebar | content | help
    captureMode / setCaptureMode // none | text | esc
    downloadFocus / setDownloadFocus
    seedFocus / setSeedFocus
    startDownload(item)         // Запуск загрузки
    copyMagnet(item)            // Копирование magnet
    notice / setNotice          // Уведомление
    quitAll                     // Выход
    listRows, compact, contentWidth, cols, rows  // Размер терминала
}
```

**React → не-React мост**: `useQueueItems(queue)` подписывается на `"update"` события DownloadQueue с дебаунсом 200мс.

---

## DownloadQueue

`src/download/queue.ts` — EventEmitter, оркестрирует всё, что связано с загрузкой.

### Владение
- `items: Map<string, QueueItem>` — активные загрузки
- `seeds: Map<string, SeedItem>` — активные раздачи
- `history: HistoryItem[]` — история (cap 500)
- `engine: TorrentEngine` — обёртка WebTorrent

### Методы
| Метод | Действие |
|---|---|
| `add(input, dir)` | Добавить загрузку, убивает одноимённый сид |
| `pause(id)` / `resume(id)` | Пауза/возобновление (engine.remove → engine.add) |
| `cancel(id)` | Отмена + удаление из items |
| `retry(id)` / `retryFailed()` | Повтор неудачных |
| `complete(it)` | Завершение → сид + история |
| `stopSeeding(id)` | Остановить раздачу |
| `restoreSeeds(records)` | Восстановить сиды при старте |
| `suspend()` | При выходе: persistSync, stop poll, destroy engine |
| `persistSync()` | Синхронный сброс queue.json / history.json / seeds.json |

---

## TorrentEngine

`src/download/engine.ts` — обёртка над WebTorrent.

| Метод | Описание |
|---|---|
| `add(id, magnet, dir, handlers, trackers?)` | Добавить торрент |
| `stats(id)` | Прогресс, скорость, пиры, ETA |
| `remove(id)` | Удалить |
| `destroy()` | Уничтожить клиент |
| `listenPort()` | TCP-порт для входящих подключений |

---

## Источники (Sources)

### Source interface (`src/sources/types.ts`)

```typescript
interface Source {
  id: SourceId;
  label: string;
  group: SourceGroup;    // Games | Movies | TV | Anime
  homepage: string;
  search(query: string, opts?: SearchOptions): Promise<TorrentResult[]>;
}
```

### Реестр (`src/sources/registry.ts`)

`SOURCES` — 18 инстансов, разбитых на группы:

| Группа | Источники |
|---|---|
| Games | FitGirl, NNM Games, Rutor Games, Torentino |
| Movies | YTS, TPB Movies, 1337x Movies, NNM Movies, Rutor Movies |
| TV | EZTV, TPB TV, 1337x TV, NNM TV, Rutor TV |
| Anime | Nyaa, SubsPlease, Rutor Anime |

### Типы скраппинга

| Тип | Источники | Метод |
|---|---|---|
| JSON API | YTS, EZTV, TPB (apibay.org), SubsPlease | `fetch` → JSON |
| RSS XML | FitGirl, Nyaa | `fetchWordpressRss` / XML парсинг |
| HTML scrape | 1337x, NNM Club, Rutor, Torentino | `fetch` → cheerio/html парсинг |

### Поиск
- `useConcurrentSearch(query)` запускает запросы ко всем источникам параллельно
- `PER_SOURCE_TIMEOUT_MS = 25_000`
- Дедикация по `infoHash` (keep max seeders)
- Сортировка: browse → newest first; search → seeders desc
- Кэш: `CachedSearch` — 5 мин TTL по ключу `${sourceId}::${query}`

---

## UI / Ink-компоненты

```
<App>
  <StoreContext.Provider>
    <TabTitle />
    {view === "splash" ? <Splash /> : (
      <Logo /> <Rule />
      <?HelpOverlay /> <?FolderPrompt /> <?TrackersPrompt />
      <Sidebar /> <Results /> <Downloads /> <Seeding /> <Top />
      <Footer />
    )}
  </StoreContext.Provider>
</App>
```

### Компоненты

| Компонент | Файл | Назначение |
|---|---|---|
| `Splash` | `views/Splash.tsx` | Стартовый экран: лого, поиск, категории |
| `Sidebar` | `Sidebar.tsx` | Навигация: фильтры + библиотека |
| `Results` | `Results.tsx` | Список результатов / детали |
| `Downloads` | `Downloads.tsx` | Активные загрузки + история |
| `Seeding` | `Seeding.tsx` | Раздачи |
| `Top` | `views/Top.tsx` | rutor.top тренды |
| `Footer` | `Footer.tsx` | Контекстные подсказки |
| `HelpOverlay` | `HelpOverlay.tsx` | Модалка горячих клавиш |
| `TextField` | `TextField.tsx` | Кастомное текстовое поле |
| `ProgressBar` | `ProgressBar.tsx` | Анимированный прогресс-бар |

### Клавиши (src/ui/keymap.ts)

`HELP_GROUPS` — 4 группы: Navigation, Search, Downloads, Seeding.
`footerHints(region, section, ...)` — контекстные подсказки в футере.

Глобальные:
- `?` — help; `Ctrl+Q` / `Ctrl+C` — выход
- `Tab` — переключение sidebar/content
- `/` — поиск; `Ctrl+T` — топ
- `d` — скачать; `y` — копировать magnet; `p` — пауза
- `o` — папка загрузок; `t` — трекеры; `m` — вставить magnet

---

## Конфигурация

`src/config/config.ts`:
```typescript
interface Config {
  downloadDir: string;   // ~/Downloads/torio
  trackers: string[];    // Дополнительные announce-URL
}
```

**Пути** (`paths.ts`): `env-paths("torio")` → XDG-совместимые.
Переменная `TORIO_STATE_DIR` переопределяет все пути (используется в тестах).

---

## Персистентность

| Файл | Содержимое | Формат |
|---|---|---|
| `config.json` | downloadDir, trackers | JSON |
| `queue.json` | QueueItem[] | JSON |
| `history.json` | HistoryItem[] (cap 500) | JSON |
| `seeds.json` | SeedRecord[] (id + status) | JSON |
| `torrents/{id}.torrent` | .torrent-мета для ресидинга | binary |

Запись — атомарная: `writeJsonAtomic()` → .tmp + rename.

---

## Лендинг (landing/index.html)

Статический HTML (1211 строк) на Tailwind CSS (CDN) + GSAP.

### Секции

| Секция | Строки | Описание |
|---|---|---|
| Navbar | 304–371 | Лого, меню, GitHub/NPM, мобильное меню |
| Hero | 400–454 | Заголовок, описание, картинка torio-hero.webp, CTA |
| Interface | 456–510 | 7 скриншотов, слайдшоу, лайтбокс |
| Features | 512–589 | 3 карточки преимуществ |
| Sources | 591–644 | Таблица источников |
| Keys | 646–729 | Горячие клавиши |
| Install | 731–823 | Инструкция, терминальный гайд |
| Footer | 826–934 | Логотип, ссылки, дисклеймер |

### Изображения
- Все скриншоты — `.webp` с PNG/JPG fallback
- `handleImageError(img)`: `.webp` → `.png` → `.jpg` → скрыть
- Hero: `torio-hero.webp` (282KB)
- OG: `og-image.webp` (239KB)
- Лого: `logo.webp` (130KB)
- Favicon: `favicon.png` (48×48, 5KB)

### Анимации (GSAP)
- `scroll-anim`: fade-in + slide-up при скролле
- `feature-card`: stagger-появление
- Слайдшоу: переключение tab каждые 4 сек, GSAP crossfade
- Лайтбокс: scale + opacity

### Деплой
GitHub Actions (`pages.yml`): копирует `logo.png`/`logo.webp`/`setup.sh`/`setup.bat` в `landing/` → upload artifact → Pages.

---

## Сборка

### dev (tsx)
```sh
npm run dev    # tsx src/index.tsx — live, без сборки
```

### build (tsup)
```sh
npm run build  # tsup → dist/index.js (ESM, node22, minified, single chunk)
               # postbuild → dist/cli.cjs (executable)
```

### typecheck
```sh
npm run typecheck  # tsc --noEmit, zero errors
```

### test
```sh
npm test  # vitest run, 13 файлов, 93 теста
```

---

## Конвенции

- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`)
- **Кроссплатформенность**: любой код, работающий с ОС, обрабатывает win32, darwin, linux
- **Fail soft**: при ошибке — показать уведомление, не падать
- **Тема**: pastel-violet, ровно один градиент (логотип), остальное — сплошные цвета
- **Добавление клавиши**: обновить `HELP_GROUPS` + `footerHints`
- **Добавление поля Store**: добавить noop в `render-previews-impl.tsx`
- **resultsPanelOuter**: на 1 строку меньше контейнера (issue #21)
