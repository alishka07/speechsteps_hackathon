import { Lang } from '@/i18n';

/**
 * Мок-данные для родительского кабинета: статистика по звукам,
 * точность по неделям и серии занятий. Ключ — id ребёнка.
 */

export interface SoundStat {
  sound: string;
  /** Точность произношения, 0–100. */
  accuracy: number;
  attempts: number;
  /** Изменение за неделю, в процентных пунктах. */
  delta: number;
}

export const SOUND_STATS: Record<string, SoundStat[]> = {
  'child-1': [
    { sound: 'Р', accuracy: 54, attempts: 14, delta: 7 },
    { sound: 'Л', accuracy: 61, attempts: 28, delta: 9 },
    { sound: 'С', accuracy: 70, attempts: 23, delta: 4 },
    { sound: 'Ш', accuracy: 82, attempts: 17, delta: 2 },
  ],
  'child-2': [
    { sound: 'К', accuracy: 48, attempts: 12, delta: 5 },
    { sound: 'Т', accuracy: 55, attempts: 19, delta: 3 },
    { sound: 'П', accuracy: 72, attempts: 15, delta: 6 },
  ],
  'child-3': [
    { sound: 'Ш', accuracy: 91, attempts: 31, delta: 3 },
    { sound: 'С', accuracy: 88, attempts: 26, delta: 2 },
    { sound: 'Р', accuracy: 76, attempts: 18, delta: 8 },
  ],
  'child-4': [
    { sound: 'Ж', accuracy: 49, attempts: 16, delta: 4 },
    { sound: 'З', accuracy: 58, attempts: 21, delta: 6 },
    { sound: 'С', accuracy: 66, attempts: 13, delta: 3 },
    { sound: 'Ш', accuracy: 78, attempts: 9, delta: 1 },
  ],
};

/** Средняя точность произношения по неделям (последние 6 недель). */
export const WEEKLY_ACCURACY: Record<string, number[]> = {
  'child-1': [52, 55, 58, 61, 66, 71],
  'child-2': [38, 41, 40, 46, 50, 53],
  'child-3': [74, 78, 81, 84, 87, 90],
  'child-4': [42, 47, 51, 54, 58, 63],
};

/** Средняя точность по месяцам (последние 6 месяцев) — для тогла «Месяц». */
export const MONTHLY_ACCURACY: Record<string, number[]> = {
  'child-1': [40, 47, 54, 60, 66, 71],
  'child-2': [30, 35, 41, 45, 49, 53],
  'child-3': [62, 70, 76, 82, 86, 90],
  'child-4': [33, 40, 47, 53, 58, 63],
};

const MONTH_LETTERS: Record<Lang, string[]> = {
  ru: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
  kz: ['Қаң', 'Ақп', 'Нау', 'Сәу', 'Мам', 'Мау', 'Шіл', 'Там', 'Қыр', 'Қаз', 'Қар', 'Жел'],
};

/** Подпись для i-го месяца с конца (последние 6 месяцев от текущего). */
export function monthShort(indexFromStart: number, lang: Lang): string {
  const now = new Date('2026-06-13');
  const m = (now.getMonth() - (5 - indexFromStart) + 12) % 12;
  return MONTH_LETTERS[lang][m];
}

/** Серия дней занятий подряд. */
export const STREAKS: Record<string, number> = {
  'child-1': 5,
  'child-2': 1,
  'child-3': 12,
  'child-4': 4,
};

/** Накопленный XP ребёнка (мок для геймификации). */
export const XP_BY_CHILD: Record<string, number> = {
  'child-1': 520,
  'child-2': 140,
  'child-3': 1240,
  'child-4': 340,
};

/** Пройдено уроков из общего пути (мок: x из y). */
export const LESSON_TOTALS: Record<string, { done: number; total: number }> = {
  'child-1': { done: 21, total: 45 },
  'child-2': { done: 6, total: 30 },
  'child-3': { done: 32, total: 45 },
  'child-4': { done: 18, total: 45 },
};

/** Подпись недели для графика: Н1…Н6 / А1…А6. */
export function weekLabel(index: number, lang: Lang): string {
  return `${lang === 'kz' ? 'А' : 'Н'}${index + 1}`;
}
