import { describe, expect, it } from 'vitest';

import { ai } from '@/ai';

describe('ai.generateExercise (черновик упражнения)', () => {
  it('по категории «дыхание» — дыхательный черновик', async () => {
    const d = await ai.generateExercise({ category: 'breathing' });
    expect(d.category).toBe('breathing');
    expect(d.instruction.length).toBeGreaterThan(0);
    expect(d.title.length).toBeGreaterThan(0);
  });

  it('звук Р + автоматизация — сохраняет фокус-звук', async () => {
    const d = await ai.generateExercise({ category: 'automation', focusSound: 'Р' });
    expect(d.focusSound).toBe('Р');
  });

  it('моторика по цели', async () => {
    const d = await ai.generateExercise({ goal: 'развить мелкую моторику и пальчики' });
    expect(d.category).toBe('motor');
  });
});

describe('ai.scorePronunciation / scorePose', () => {
  it('произношение: балл в диапазоне, слово — строка', async () => {
    const r = await ai.scorePronunciation('рыба');
    expect(r.score).toBeGreaterThanOrEqual(35);
    expect(r.score).toBeLessThanOrEqual(94);
    expect(typeof r.recognizedWord).toBe('string');
  });

  it('поза (computer vision): удержание в диапазоне', async () => {
    const r = await ai.scorePose();
    expect(r.hold).toBeGreaterThanOrEqual(55);
    expect(r.hold).toBeLessThanOrEqual(99);
  });
});

describe('ai.generateRecommendations', () => {
  it('слабый звук упоминается в рекомендациях', async () => {
    const tips = await ai.generateRecommendations([{ sound: 'Р', accuracy: 50 }]);
    expect(tips.length).toBeGreaterThan(0);
    expect(tips.join(' ')).toContain('Р');
  });

  it('при сильных звуках — поддерживающие советы без паники', async () => {
    const tips = await ai.generateRecommendations([{ sound: 'С', accuracy: 95 }]);
    expect(tips.length).toBeGreaterThan(0);
  });
});

describe('ai.generateLessonPlan', () => {
  it('по цели со звуком Р собирает план из упражнений', async () => {
    const plan = await ai.generateLessonPlan('поставить звук Р у ребёнка 5 лет');
    expect(plan.exerciseIds.length).toBeGreaterThanOrEqual(4);
    expect(plan.title).toContain('Р');
  });
});
