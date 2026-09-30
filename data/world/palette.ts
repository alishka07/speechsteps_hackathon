/**
 * Дизайн-токены мира «Остров Эха» — ЕДИНЫЙ источник цвета.
 *
 * Палитра наследует систему приложения (`theme/index.ts`): бирюза / коралл /
 * лаванда + золото наград на грифельном тексте. Цвета окружения (трава, вода,
 * песок, камень) специально смещены в сторону этого трио, чтобы 3D-сцена и
 * интерфейс читались как одна работа, а не как игра поверх чужого UI.
 *
 * Отсюда генерируются сразу два потребителя:
 *   • CSS-переменные для HUD  → `cssVars()`
 *   • объект `PAL` в рантайме → `palScript()` (числа для Three.js-материалов)
 * Поэтому ни один hex в мире не дублируется руками.
 */

/** Токены бренда — те же значения, что в `theme/index.ts`. */
export const BRAND = {
  teal: '#28BD9F',
  tealDeep: '#1B8F79',
  coral: '#F2805A',
  coralDeep: '#C2562F',
  lavender: '#A385E0',
  lavenderDeep: '#6E51A8',
  gold: '#F5B400',
  goldSoft: '#FCF1CF',
  slate: '#29303D',
  slateSoft: '#565D6E',
  cream: '#FCFBF7',
  border: '#E7E2DA',
  white: '#FFFFFF',
} as const;

/**
 * Цвета сцены. Ключи сгруппированы по смыслу, а не по объектам: один и тот же
 * `wood` служит и мостам, и люльке, и шесту ветряка — меньше решений, цельнее
 * картинка.
 */
export const SCENE = {
  // небо и даль
  skyTop: '#253C70',
  skyMid: '#718FB5',
  skyLow: '#E5C7D8',
  fog: '#B5CED6',
  mountain: '#667D9E',
  sunDisc: '#FFF3C4',
  sunGlow: '#FFE9A0',

  // земля и вода
  grass: '#79AA92',
  grassDeep: '#48786C',
  sand: '#DDC3A3',
  cliff: '#78858F',
  water: '#2B7695',
  waterDeep: '#214B74',
  foam: '#B4E9EF',

  // материалы
  wood: '#B9906D',
  woodDark: '#705049',
  stone: '#A4B6BC',
  stoneDark: '#58657D',
  leaf: '#387F77',
  leafLight: '#80B4A0',
  bark: '#A47B61',

  // свет
  sunLight: '#FFD9AF',
  skyLight: '#C4DCFF',
  groundBounce: '#667C85',
  rimLight: '#AEBCFF',
  torch: '#F2A03A',
} as const;

/** Персонаж: варианты цвета и кожи. */
export const CHARACTER = {
  skin: '#FFD9A8',
  belly: '#FFF3E2',
  blush: '#FF9AA2',
  eye: '#29303D',
  mouth: '#C2562F',
  // Рыжий — первый цвет, чтобы выбранный по умолчанию лисёнок сразу читался как лисёнок.
  colors: ['#E28C3E', BRAND.teal, BRAND.coral, BRAND.lavender, BRAND.gold, '#5B8DEF', '#EF5DA8'],
} as const;

/** hex-строка → число для Three.js (`0x28BD9F`). */
export function hexNum(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

/** CSS-переменные HUD — вставляются в `:root`. */
export function cssVars(): string {
  const vars: string[] = [];
  const push = (name: string, value: string) => vars.push('    --' + name + ':' + value + ';');
  for (const [k, v] of Object.entries(BRAND)) push(k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()), v);
  push('sky-low', SCENE.skyLow);
  push('ink', BRAND.slate);
  push('ink-soft', BRAND.slateSoft);
  push('glass', 'rgba(255,255,255,.93)');
  push('glass-dim', 'rgba(41,48,61,.45)');
  push('shadow', '0 6px 20px rgba(41,48,61,.22)');
  push('shadow-lg', '0 18px 48px rgba(41,48,61,.38)');
  return vars.join('\n');
}

/**
 * Объект `PAL` для игрового кода: те же токены, но числами. Игровые модули
 * пишут `PAL.grass` вместо `0x7FC79B` — перекрасить мир можно из одного файла.
 */
export function palScript(): string {
  const all: Record<string, number> = {};
  for (const [k, v] of Object.entries({ ...BRAND, ...SCENE })) all[k] = hexNum(v);
  all.skin = hexNum(CHARACTER.skin);
  all.belly = hexNum(CHARACTER.belly);
  all.blush = hexNum(CHARACTER.blush);
  all.eyeInk = hexNum(CHARACTER.eye);
  all.mouth = hexNum(CHARACTER.mouth);
  return (
    '    var PAL = ' +
    JSON.stringify(all) +
    ';\n' +
    '    var SKIN_COLORS = ' +
    JSON.stringify(CHARACTER.colors.map(hexNum)) +
    ';\n'
  );
}
