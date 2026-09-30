import { describe, expect, it } from 'vitest';

import { buildStageLesson, buildTherapyPath, PROGRAMS, STAGES } from '@/data/therapyPaths';
import { Category, DiagnosisKey, Exercise } from '@/data/types';

function ex(id: string, category: Category, focusSound?: string): Exercise {
  return { id, title: id, category, focusSound, emoji: '⭐', durationMin: 3, description: '', instruction: '' };
}

const ALL: DiagnosisKey[] = ['speechDelay', 'dysarthria', 'dyslalia', 'ffn', 'stuttering', 'onr'];

describe('buildTherapyPath', () => {
  it('без заключений — пустой маршрут', () => {
    expect(buildTherapyPath([])).toEqual([]);
  });

  it('дислалия: постановка → автоматизация → дифференциация → связная речь', () => {
    const ids = buildTherapyPath(['dyslalia']).map((s) => s.stage.id);
    expect(ids).toEqual(['prep_artic', 'prep_phonemic', 'setting', 'automation', 'differentiation', 'connected']);
  });

  it('дизартрия: длинный подготовительный этап с моторикой и дыханием', () => {
    const ids = buildTherapyPath(['dysarthria']).map((s) => s.stage.id);
    expect(ids[0]).toBe('prep_breath');
    expect(ids).toContain('prep_motor');
    expect(ids).toContain('setting');
  });

  it('заикание: дыхание/моторика/связная речь, без постановки звуков', () => {
    const ids = buildTherapyPath(['stuttering']).map((s) => s.stage.id);
    expect(ids).not.toContain('setting');
    expect(ids).not.toContain('automation');
    expect(ids).toContain('prep_breath');
  });

  it('маршрут всегда в канонической этапности', () => {
    const order = STAGES.map((s) => s.id);
    for (const d of ALL) {
      const ids = buildTherapyPath([d]).map((s) => s.stage.id);
      const sorted = [...ids].sort((a, b) => order.indexOf(a) - order.indexOf(b));
      expect(ids).toEqual(sorted);
    }
  });

  it('несколько заключений: объединение этапов + пометка, кому нужен этап', () => {
    const path = buildTherapyPath(['dyslalia', 'dysarthria']);
    const setting = path.find((s) => s.stage.id === 'setting')!;
    expect(setting.forDiagnoses.sort()).toEqual(['dysarthria', 'dyslalia']);
    // моторная база нужна только дизартрии
    const motor = path.find((s) => s.stage.id === 'prep_motor')!;
    expect(motor.forDiagnoses).toEqual(['dysarthria']);
  });

  it('у каждого заключения есть программа с методикой и этапами', () => {
    for (const d of ALL) {
      expect(PROGRAMS[d].method.length).toBeGreaterThan(0);
      expect(PROGRAMS[d].stages.length).toBeGreaterThan(0);
    }
  });
});

describe('buildStageLesson (урок по этапу)', () => {
  const stage = STAGES.find((s) => s.id === 'automation')!; // categories: ['automation']
  const catalog = [
    ex('a1', 'automation', 'С'),
    ex('a2', 'automation', 'Р'),
    ex('a3', 'automation'),
    ex('b1', 'breathing'),
  ];

  it('берёт только упражнения категорий этапа', () => {
    const lesson = buildStageLesson(stage, catalog);
    expect(lesson.exerciseIds).not.toContain('b1');
    expect(lesson.exerciseIds.length).toBeGreaterThan(0);
  });

  it('фокус-звук приоритетнее: упражнение под звук — первым', () => {
    const lesson = buildStageLesson(stage, catalog, 'Р');
    expect(lesson.exerciseIds[0]).toBe('a2');
    expect(lesson.title).toContain('Р');
  });

  it('пустой каталог по этапу → пустой урок', () => {
    const lesson = buildStageLesson(STAGES.find((s) => s.id === 'connected')!, catalog);
    expect(lesson.exerciseIds).toEqual([]);
  });
});
