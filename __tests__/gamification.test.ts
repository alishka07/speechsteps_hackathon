import { describe, expect, it } from 'vitest';

import {
  ACHIEVEMENTS,
  dailyQuests,
  isUnlocked,
  leagueFor,
  LEAGUES,
  levelInfo,
} from '@/data/gamification';

describe('levelInfo (формула XP веб-версии: 50, +25 за уровень)', () => {
  it('уровень 1 при 0 XP', () => {
    const l = levelInfo(0);
    expect(l.level).toBe(1);
    expect(l.current).toBe(0);
    expect(l.needed).toBe(50);
    expect(l.progress).toBe(0);
  });

  it('пороги уровней: 50 → ур.2, 125 → ур.3, 225 → ур.4', () => {
    expect(levelInfo(50).level).toBe(2);
    expect(levelInfo(124).level).toBe(2);
    expect(levelInfo(125).level).toBe(3);
    expect(levelInfo(225).level).toBe(4);
  });

  it('520 XP → уровень 6, прогресс внутри уровня', () => {
    const l = levelInfo(520);
    expect(l.level).toBe(6);
    expect(l.current).toBe(20);
    expect(l.needed).toBe(175);
    expect(l.progress).toBeCloseTo((20 / 175) * 100, 5);
  });
});

describe('leagueFor (6 лиг по порогам XP)', () => {
  it('0 XP → Коричневая, следующая Бронзовая', () => {
    const r = leagueFor(0);
    expect(r.league.id).toBe('brown');
    expect(r.next?.id).toBe('bronze');
  });

  it('520 XP → Бронзовая', () => {
    expect(leagueFor(520).league.id).toBe('bronze');
  });

  it('20000 XP → Алмазная, следующей нет', () => {
    const r = leagueFor(20000);
    expect(r.league.id).toBe('diamond');
    expect(r.next).toBeNull();
  });

  it('все 6 лиг определены и отсортированы по minXp', () => {
    expect(LEAGUES).toHaveLength(6);
    const xps = LEAGUES.map((l) => l.minXp);
    expect([...xps].sort((a, b) => a - b)).toEqual(xps);
  });
});

describe('isUnlocked (достижения по серии/XP/уровню/урокам)', () => {
  const stats = { streak: 7, xp: 150, level: 3, lessonsDone: 4 };
  it('streak_3 открыт при серии 7', () => {
    const a = ACHIEVEMENTS.find((x) => x.id === 'streak_3')!;
    expect(isUnlocked(a, stats)).toBe(true);
  });
  it('streak_30 закрыт при серии 7', () => {
    const a = ACHIEVEMENTS.find((x) => x.id === 'streak_30')!;
    expect(isUnlocked(a, stats)).toBe(false);
  });
  it('xp_100 открыт, level_5 закрыт', () => {
    expect(isUnlocked(ACHIEVEMENTS.find((x) => x.id === 'xp_100')!, stats)).toBe(true);
    expect(isUnlocked(ACHIEVEMENTS.find((x) => x.id === 'level_5')!, stats)).toBe(false);
  });
});

describe('dailyQuests (3 квеста, детерминированно по childId+дате)', () => {
  it('ровно 3 квеста', () => {
    expect(dailyQuests('child-1', '2026-06-13')).toHaveLength(3);
  });
  it('детерминированность: те же входы → те же квесты', () => {
    const a = dailyQuests('child-1', '2026-06-13').map((q) => q.def.id);
    const b = dailyQuests('child-1', '2026-06-13').map((q) => q.def.id);
    expect(a).toEqual(b);
  });
  it('разные дни → (как правило) разные наборы', () => {
    const a = dailyQuests('child-1', '2026-06-13').map((q) => q.def.id);
    const b = dailyQuests('child-1', '2026-06-20').map((q) => q.def.id);
    expect(a).not.toEqual(b);
  });
  it('квесты в наборе не повторяются', () => {
    const ids = dailyQuests('child-3', '2026-06-13').map((q) => q.def.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
