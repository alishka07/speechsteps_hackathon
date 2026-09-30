import { DUNGEON_MESHES, DUNGEON_TEX } from '../dungeonMeshes';
import { THREE_SRC } from '../three-lib';
import { worldPage } from './index';

/**
 * Встраивание движка в страницу мира.
 *
 * Вынесено из `index.ts` намеренно: Three.js и геометрия dungeon-кита — это
 * больше мегабайта исходников в виде строк. Пока они импортируются только
 * здесь, разметку и игровой код можно собрать и проверить, не загружая их.
 */
export function worldHtml(): string {
  // `</script` внутри исходника движка экранируем, иначе парсер HTML закроет
  // тег раньше времени и страница оборвётся на середине библиотеки.
  const lib = THREE_SRC.replace(/<\/(script)/gi, '<\\/$1');
  const dungeon =
    '<script>window.__DUNGEON_TEX=' +
    JSON.stringify(DUNGEON_TEX) +
    ';window.__DUNGEON=' +
    JSON.stringify(DUNGEON_MESHES) +
    ';</script>';
  return worldPage().replace('<!--THREE_LIB-->', '<script>' + lib + '</script>' + dungeon);
}
