/** Ежемесячные отчёты по ребёнку (мок). */
export interface MonthlyReport {
  id: string;
  childId: string;
  /** Период в формате YYYY-MM. */
  period: string;
  avgAccuracy: number;
  lessonsDone: number;
  attempts: number;
  bestSound: string;
  focusSound: string;
  /** Краткие выводы — список тезисов. */
  summary: string[];
  /** Срез точности по звукам на конец месяца. */
  soundSnapshot: { sound: string; accuracy: number }[];
}

export const REPORTS: MonthlyReport[] = [
  {
    id: 'report-1-05',
    childId: 'child-1',
    period: '2026-05',
    avgAccuracy: 64,
    lessonsDone: 14,
    attempts: 92,
    bestSound: 'Ш',
    focusSound: 'Р',
    summary: [
      'Звук Р: появилась устойчивая вибрация в изолированной позиции.',
      'В словах Р по-прежнему заменяется на Л — продолжаем автоматизацию в слогах.',
      'Артикуляционная гимнастика выполняется регулярно, 5–6 дней в неделю.',
    ],
    soundSnapshot: [
      { sound: 'Р', accuracy: 47 },
      { sound: 'Л', accuracy: 55 },
      { sound: 'С', accuracy: 66 },
      { sound: 'Ш', accuracy: 80 },
    ],
  },
  {
    id: 'report-1-04',
    childId: 'child-1',
    period: '2026-04',
    avgAccuracy: 55,
    lessonsDone: 11,
    attempts: 68,
    bestSound: 'Ш',
    focusSound: 'Р',
    summary: [
      'Поставлена «Чашечка», начали работу над вибрацией для звука Р.',
      'Дыхательные упражнения освоены, выдох стал длиннее и ровнее.',
    ],
    soundSnapshot: [
      { sound: 'Р', accuracy: 38 },
      { sound: 'Л', accuracy: 50 },
      { sound: 'С', accuracy: 61 },
      { sound: 'Ш', accuracy: 76 },
    ],
  },
  {
    id: 'report-2-05',
    childId: 'child-2',
    period: '2026-05',
    avgAccuracy: 49,
    lessonsDone: 8,
    attempts: 41,
    bestSound: 'П',
    focusSound: 'К',
    summary: [
      'Словарный запас вырос: появились двухсловные фразы.',
      'Слуховое внимание улучшилось — уверенно различает неречевые звуки.',
    ],
    soundSnapshot: [
      { sound: 'К', accuracy: 44 },
      { sound: 'Т', accuracy: 52 },
      { sound: 'П', accuracy: 70 },
    ],
  },
  {
    id: 'report-3-05',
    childId: 'child-3',
    period: '2026-05',
    avgAccuracy: 86,
    lessonsDone: 18,
    attempts: 120,
    bestSound: 'Ш',
    focusSound: 'Р',
    summary: [
      'Звук Ш автоматизирован в словах и фразах, в спонтанной речи редкие замены.',
      'Начали работу над звуком Р — быстрый прогресс в слогах.',
      'Рекомендуем переходить к чистоговоркам и пересказам.',
    ],
    soundSnapshot: [
      { sound: 'Ш', accuracy: 90 },
      { sound: 'С', accuracy: 87 },
      { sound: 'Р', accuracy: 71 },
    ],
  },
  {
    id: 'report-4-05',
    childId: 'child-4',
    period: '2026-05',
    avgAccuracy: 56,
    lessonsDone: 10,
    attempts: 59,
    bestSound: 'Ш',
    focusSound: 'Ж',
    summary: [
      'Различение З/Ж на слух улучшилось с 40% до 60% попыток.',
      'В слогах звук Ж пока неустойчив — продолжаем цепочки слогов.',
      'Домашние занятия проходят 4–5 раз в неделю, динамика положительная.',
    ],
    soundSnapshot: [
      { sound: 'Ж', accuracy: 46 },
      { sound: 'З', accuracy: 55 },
      { sound: 'С', accuracy: 63 },
      { sound: 'Ш', accuracy: 75 },
    ],
  },
  {
    id: 'report-4-04',
    childId: 'child-4',
    period: '2026-04',
    avgAccuracy: 47,
    lessonsDone: 7,
    attempts: 34,
    bestSound: 'С',
    focusSound: 'Ж',
    summary: [
      'Проведена первичная диагностика, составлен план коррекции ФФН.',
      'Освоили базовые дыхательные упражнения.',
    ],
    soundSnapshot: [
      { sound: 'Ж', accuracy: 40 },
      { sound: 'З', accuracy: 48 },
      { sound: 'С', accuracy: 58 },
    ],
  },
];
