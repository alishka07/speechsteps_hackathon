/**
 * Точка входа 3D-мира «Остров Эха».
 *
 * Сам мир живёт в `data/world/` — по модулю на слой (сцена, звук, декор,
 * персонажи, зоны, интерфейс). Здесь остался только реэкспорт, чтобы экраны
 * `app/play-world.tsx` и `app/play-world.web.tsx` продолжали импортировать
 * привычный `worldHtml()`.
 *
 * Где что искать:
 *   data/world/palette.ts     — все цвета мира (и CSS, и материалы);
 *   data/world/shell.ts       — разметка и стили интерфейса;
 *   data/world/index.ts       — порядок сборки модулей;
 *   data/world/src/games.ts   — каталог мини-игр и общий движок зон;
 *   data/world/src/hud.ts     — счётчики, сохранение и режим «ошибка».
 */
export { worldHtml } from './world/embed';
export { worldPage, worldSource, MODULE_NAMES } from './world';
