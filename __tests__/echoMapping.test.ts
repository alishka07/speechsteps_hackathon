import { describe, expect, it } from 'vitest';

import { buildEchoPlan, DEFAULT_ECHO_PLAN, echoIdForExercise, echoName } from '@/data/echoMapping';
import { Category, Exercise } from '@/data/types';

function ex(id: string, category: Category, focusSound?: string): Exercise {
  return {
    id,
    title: id,
    category,
    focusSound,
    emoji: '⭐',
    durationMin: 3,
    description: '',
    instruction: '',
  };
}

describe('echoIdForExercise (упражнение логопеда → echo-island id)', () => {
  it('автоматизация звука Р → rp-horse', () => {
    expect(echoIdForExercise(ex('a', 'automation', 'Р'))).toBe('rp-horse');
  });
  it('автоматизация Ш → sh-train, Л → aut-words-l', () => {
    expect(echoIdForExercise(ex('a', 'automation', 'Ш'))).toBe('sh-train');
    expect(echoIdForExercise(ex('a', 'automation', 'Л'))).toBe('aut-words-l');
  });
  it('артикуляция со звуком Р → грибок/чашечка', () => {
    expect(['art-mushroom', 'art-cup']).toContain(echoIdForExercise(ex('a', 'articulation', 'Р')));
  });
  it('моторика → из пула m-*', () => {
    const id = echoIdForExercise(ex('a', 'motor'));
    expect(id.startsWith('m-')).toBe(true);
  });
  it('детерминированность по id', () => {
    expect(echoIdForExercise(ex('same', 'phonemic'))).toBe(echoIdForExercise(ex('same', 'phonemic')));
  });
});

describe('buildEchoPlan', () => {
  it('собирает маршрут и убирает дубли', () => {
    const plan = buildEchoPlan([
      ex('1', 'automation', 'Р'),
      ex('2', 'automation', 'Р'), // тот же rp-horse
      ex('3', 'breathing'),
    ]);
    expect(new Set(plan).size).toBe(plan.length);
    expect(plan).toContain('rp-horse');
  });
  it('пустой список → пустой план (фолбэк делает экран)', () => {
    expect(buildEchoPlan([])).toEqual([]);
    expect(DEFAULT_ECHO_PLAN.length).toBeGreaterThan(0);
  });
});

describe('echoName (id → читаемое имя)', () => {
  it('известные id переводятся', () => {
    expect(echoName('rp-horse')).toBe('Лошадка');
    expect(echoName('m-fingers')).toBe('Пальчиковая гимнастика');
  });
  it('неизвестный id → сам id', () => {
    expect(echoName('zzz-unknown')).toBe('zzz-unknown');
  });
});
