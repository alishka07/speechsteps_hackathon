import { describe, expect, it } from 'vitest';

import { formatTimer, HOME_EXERCISES } from '@/data/homePractice';

describe('formatTimer', () => {
  it('секунды → м:сс', () => {
    expect(formatTimer(90)).toBe('1:30');
    expect(formatTimer(5)).toBe('0:05');
    expect(formatTimer(120)).toBe('2:00');
    expect(formatTimer(0)).toBe('0:00');
  });
});

describe('каталог домашней практики', () => {
  it('у каждого упражнения есть шаги и длительность', () => {
    expect(HOME_EXERCISES.length).toBeGreaterThan(0);
    for (const e of HOME_EXERCISES) {
      expect(e.steps.length).toBeGreaterThanOrEqual(3);
      expect(e.durationSec).toBeGreaterThan(0);
    }
  });
});
