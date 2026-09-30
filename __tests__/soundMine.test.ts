import { describe, expect, it } from 'vitest';

import { gradeAttempt, masteryReached, SAMPLE_SOUND_MINE } from '@/data/soundMineLesson';

describe('SAMPLE_SOUND_MINE (срез Р / слово / 10)', () => {
  it('целевой звук Р, уровень word, 10 элементов с уникальными id', () => {
    expect(SAMPLE_SOUND_MINE.targetSound.phoneme).toBe('р');
    expect(SAMPLE_SOUND_MINE.level).toBe('word');
    expect(SAMPLE_SOUND_MINE.items).toHaveLength(10);
    const ids = SAMPLE_SOUND_MINE.items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('язык ru → движок speechsuper', () => {
    expect(SAMPLE_SOUND_MINE.language).toBe('ru');
    expect(SAMPLE_SOUND_MINE.assessment.engine).toBe('speechsuper');
  });

  it('каждый элемент содержит слово со звуком р', () => {
    for (const item of SAMPLE_SOUND_MINE.items) {
      expect(item.text.toLowerCase()).toContain('р');
    }
  });
});

describe('gradeAttempt (pass / review / retry)', () => {
  const a = SAMPLE_SOUND_MINE.assessment; // passThreshold 80, reviewBand [50,75]

  it('score ≥ порога → pass', () => {
    expect(gradeAttempt(80, a)).toBe('pass');
    expect(gradeAttempt(95, a)).toBe('pass');
  });

  it('score в reviewBand → review (границы включительно)', () => {
    expect(gradeAttempt(50, a)).toBe('review');
    expect(gradeAttempt(63, a)).toBe('review');
    expect(gradeAttempt(75, a)).toBe('review');
  });

  it('ниже reviewBand → retry', () => {
    expect(gradeAttempt(49, a)).toBe('retry');
    expect(gradeAttempt(0, a)).toBe('retry');
  });

  it('зазор между reviewBand и порогом (76–79) → retry, не pass', () => {
    expect(gradeAttempt(76, a)).toBe('retry');
    expect(gradeAttempt(79, a)).toBe('retry');
  });
});

describe('masteryReached (≈80% набора)', () => {
  it('8/10 при пороге 80 → достигнуто', () => {
    expect(masteryReached(8, 10, SAMPLE_SOUND_MINE)).toBe(true);
  });
  it('7/10 → не достигнуто', () => {
    expect(masteryReached(7, 10, SAMPLE_SOUND_MINE)).toBe(false);
  });
  it('пустой набор → false', () => {
    expect(masteryReached(0, 0, SAMPLE_SOUND_MINE)).toBe(false);
  });
});
