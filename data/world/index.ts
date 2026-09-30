import { shell, shellEnd } from './shell';
import { audio } from './src/audio';
import { boot } from './src/boot';
import { characters } from './src/characters';
import { core } from './src/core';
import { games } from './src/games';
import { hud } from './src/hud';
import { input } from './src/input';
import { kit, config } from './src/kit';
import { landmarks } from './src/landmarks';
import { props } from './src/props';
import { terrain } from './src/terrain';
import { vision } from './src/vision';
import { speechGarden } from './src/speechGarden';

/**
 * 3D-мир «Остров Эха» — сборка страницы из модулей.
 *
 * Мир живёт в WebView (нативно) и в iframe (веб), поэтому на выходе — один
 * самодостаточный HTML: движок Three.js r149 и геометрия dungeon-кита
 * встраиваются инлайн, сеть не нужна. Речь разбираем через Web Audio, мимику
 * в зоне «Зеркало» — через MediaPipe (единственное, что грузится из сети, и
 * только когда ребёнок подошёл к зеркалу).
 *
 * Мост наружу — `window.SpeechSteps`: getMissions / getConfig (что задал
 * логопед), loadState / saveState (прогресс), onEvent (телеметрия), speak
 * (нейроголос спутника на вебе).
 *
 * ПОРЯДОК МОДУЛЕЙ ЗНАЧИМ. Каждый — это кусок исходника внутри одной общей
 * области видимости, и часть из них выполняет код сразу при загрузке (строит
 * геометрию). Правило простое: модуль идёт после тех, чьи объекты он создаёт
 * или читает на этапе сборки сцены. Зависимости, которые нужны только во время
 * игры (внутри функций), порядок не ограничивают.
 */
const MODULES: { name: string; src: () => string }[] = [
  { name: 'core', src: core },             // помощники, рендер, свет, небо
  { name: 'kit', src: kit },               // загрузчик деталей подземелья
  { name: 'config', src: config },         // настройки логопеда и урок ребёнка
  { name: 'audio', src: audio },           // микрофон, разбор звука, синтез, речь
  { name: 'vision', src: vision },         // камера: поза ведёт героя, лицо — зеркало
  { name: 'input', src: input },           // ввод: камера + клавиши + джойстик ← нужен vision
  { name: 'props', src: props },           // каталог декора и расстановка
  { name: 'terrain', src: terrain },       // острова, мосты, море  ← нужен props
  { name: 'characters', src: characters }, // герой и спутник
  { name: 'landmarks', src: landmarks },   // объекты зон          ← нужен terrain
  { name: 'hud', src: hud },               // интерфейс, тренер, сохранение
  { name: 'games', src: games },           // каталог зон и движок ← нужен landmarks
  { name: 'speechGarden', src: speechGarden }, // три коротких задания камеры в демо
  { name: 'boot', src: boot },             // экраны, главный цикл ← нужен games
];

/** Исходник игры (без движка) — модули в порядке сборки, с заголовками. */
export function worldSource(): string {
  return MODULES.map((m) => '\n    // ==================== ' + m.name + ' ====================' + m.src()).join(
    '',
  );
}

/**
 * Полная страница мира БЕЗ встроенного движка. Движок и геометрия подземелья
 * весят больше мегабайта, поэтому вшивает их отдельный модуль `embed.ts` —
 * так тесты и любые проверки разметки не тянут за собой всю Three.js.
 */
export function worldPage(): string {
  return shell() + worldSource() + shellEnd();
}

/** Имена модулей в порядке сборки — для тестов и отладки. */
export const MODULE_NAMES = MODULES.map((m) => m.name);
