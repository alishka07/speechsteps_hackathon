import { describe, expect, it } from 'vitest';

import { MODULE_NAMES, worldPage, worldSource } from '@/data/world';

/**
 * Мир — это HTML-страница, собранная из модулей-строк, поэтому обычный
 * `tsc` её не проверяет. Тесты закрывают именно эту дыру: разбирают
 * получившийся скрипт настоящим парсером JS и следят за контрактом страницы
 * (мост наружу, узлы интерфейса, порядок сборки).
 */

/** Тело игрового скрипта: всё между последним `<script>` и `</script>`. */
function gameScript(page: string): string {
  const open = page.lastIndexOf('<script>');
  const close = page.indexOf('<\/script>', open);
  expect(open).toBeGreaterThan(-1);
  expect(close).toBeGreaterThan(open);
  return page.slice(open + '<script>'.length, close);
}

describe('сборка мира', () => {
  const page = worldPage();

  it('игровой скрипт разбирается парсером JS', () => {
    // new Function компилирует тело, но не выполняет его: синтаксическая
    // ошибка в любом модуле упадёт здесь, а не в WebView у ребёнка.
    expect(() => new Function(gameScript(page))).not.toThrow();
  });

  it('страница закрывает все свои теги', () => {
    expect(page.startsWith('<!doctype html>')).toBe(true);
    expect(page.trimEnd().endsWith('</html>')).toBe(true);
    expect((page.match(/<script>/g) ?? []).length).toBe((page.match(/<\/script>/g) ?? []).length);
  });

  it('в игровой код не протекли обратные кавычки', () => {
    // Модули — это TS-шаблоны, поэтому обратная кавычка внутри закрывает
    // строку и обрезает модуль. Пара таких кавычек соберётся без ошибки
    // компилятора, но вырежет кусок игры — этот тест ловит и такой случай.
    expect(worldSource()).not.toContain('`');
  });

  it('оставляет место для встраивания движка', () => {
    expect(page).toContain('<!--THREE_LIB-->');
  });

  it('собирает модули в объявленном порядке', () => {
    const src = worldSource();
    let prev = -1;
    for (const name of MODULE_NAMES) {
      const at = src.indexOf('==================== ' + name + ' ');
      expect(at, name).toBeGreaterThan(prev);
      prev = at;
    }
  });

  it('содержит узлы интерфейса, которые ищет игровой код', () => {
    for (const id of [
      'c', 'camv', 'objTitle', 'objHint', 'scStars', 'scStages', 'scTotal', 'track',
      'miclbl', 'rmsfill', 'taskwrap', 'taskfill', 'coach', 'coachIcon', 'coachTitle',
      'coachText', 'joy', 'knob', 'banner', 'npc', 'npcText', 'npcAva', 'win', 'winSub',
      'winStars', 'winStages', 'winZones', 'again', 'go', 'goKeyboard', 'camToggle', 'camPreview', 'camPointer', 'micToggle', 'micStatus',
      'intro', 'introText', 'introNext', 'introSkip',
      'pause', 'pauseTitle', 'pauseText', 'resumeGame', 'resumeCamera',
    ]) {
      expect(page, id).toContain('id="' + id + '"');
    }
  });

  it('сохраняет мост window.SpeechSteps в обе стороны', () => {
    const src = worldSource();
    for (const api of ['getConfig', 'getMissions', 'loadState', 'saveState', 'onEvent', 'speak']) {
      expect(src, api).toContain('SpeechSteps.' + api);
    }
  });

  it('пишет прогресс в формате, который читают отчёты', () => {
    const src = worldSource();
    // ключи из data/worldProgress.ts — менять их нельзя без миграции
    for (const key of [
      'gateOpen', 'bridgeBuilt', 'flewUp', 'treasureOpen', 'rhythmDone', 'fountainDone',
      'roarDone', 'lullabyDone', 'trafficDone', 'mirrorDone', 'dungeonDone',
    ]) {
      expect(src, key).toContain("'" + key + "'");
    }
    expect(src).toContain('stagesTotal');
    expect(src).toContain('starsTotal');
  });
});

describe('зоны мира', () => {
  const src = worldSource();

  it('описывает все мини-игры логопеда', () => {
    // ключи из data/worldConfig.ts — по ним логопед включает зоны
    for (const key of ['rhythm', 'fountain', 'dragon', 'lullaby', 'trafficlight', 'mirror', 'dungeon']) {
      expect(src, key).toContain("key: '" + key + "'");
    }
  });

  it('описывает базовый путь: ворота → мост → полёт → сундук', () => {
    for (const key of ['gate', 'vine', 'fly', 'treasure']) {
      expect(src, key).toContain("key: '" + key + "'");
    }
  });

  it('у каждой звёздной награды свой префикс ключа', () => {
    const prefixes = [...src.matchAll(/starKey: '([a-z]+)'/g)].map((m) => m[1]);
    expect(prefixes.length).toBeGreaterThan(0);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });
});

describe('режим «ошибка»', () => {
  const src = worldSource();

  it('каждому коду ошибки соответствует конкретная подсказка', () => {
    // коды, которые умеет возвращать разбор звука и мимики
    const codes = [
      'silent', 'tooQuiet', 'tooLoud', 'voicedHiss', 'sLikeSh', 'shLikeS', 'weakHiss',
      'weakHush', 'noTrill', 'voicelessR', 'breathy', 'wrongVowel', 'notSonorant',
      'weakSound', 'dropped', 'offbeat', 'tooSlow', 'noFace', 'noFace2', 'weakFace', 'wrongFace',
    ];
    for (const code of codes) {
      expect(src, code).toMatch(new RegExp('\\b' + code + ':\\s*\\['));
    }
  });

  it('подсказки говорят, что изменить, а не только что не так', () => {
    const table = src.slice(src.indexOf('var COACH = {'), src.indexOf("var coachEl"));
    const texts = [...table.matchAll(/,\s*'([^']{20,})'\]/g)].map((m) => m[1]);
    expect(texts.length).toBeGreaterThanOrEqual(20);
    for (const text of texts) {
      // ни одна подсказка не сводится к «не распознано»
      expect(text.toLowerCase(), text).not.toContain('не распознан');
      expect(text.length, text).toBeGreaterThan(24);
    }
  });
});
