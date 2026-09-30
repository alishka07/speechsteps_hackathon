import { Attempt, Child, Note } from './types';

/**
 * Сид-данные: 4 ребёнка с разными нарушениями.
 * daily — последние 7 дней (04.06–10.06.2026, сегодня — 10.06).
 */
export const CHILDREN: Child[] = [
  {
    id: 'child-1',
    name: 'Алия Серикова',
    age: 5,
    diagnoses: ['dysarthria'],
    progress: 62,
    connectedAt: '2026-03-14',
    daily: [
      { date: '2026-06-04', minutes: 18, tasks: 4, avgScore: 64 },
      { date: '2026-06-05', minutes: 12, tasks: 3, avgScore: 68 },
      { date: '2026-06-06', minutes: 0, tasks: 0, avgScore: null },
      { date: '2026-06-07', minutes: 21, tasks: 5, avgScore: 71 },
      { date: '2026-06-08', minutes: 15, tasks: 3, avgScore: 73 },
      { date: '2026-06-09', minutes: 17, tasks: 4, avgScore: 76 },
      { date: '2026-06-10', minutes: 9, tasks: 2, avgScore: 79 },
    ],
  },
  {
    id: 'child-2',
    name: 'Тимур Ахметов',
    age: 4,
    diagnoses: ['speechDelay', 'onr'],
    progress: 34,
    connectedAt: '2026-04-23',
    daily: [
      { date: '2026-06-04', minutes: 10, tasks: 2, avgScore: 48 },
      { date: '2026-06-05', minutes: 0, tasks: 0, avgScore: null },
      { date: '2026-06-06', minutes: 8, tasks: 2, avgScore: 52 },
      { date: '2026-06-07', minutes: 0, tasks: 0, avgScore: null },
      { date: '2026-06-08', minutes: 12, tasks: 3, avgScore: 55 },
      { date: '2026-06-09', minutes: 6, tasks: 1, avgScore: 50 },
      { date: '2026-06-10', minutes: 0, tasks: 0, avgScore: null },
    ],
  },
  {
    id: 'child-3',
    name: 'Дана Жумабаева',
    age: 7,
    diagnoses: ['dyslalia'],
    progress: 81,
    connectedAt: '2026-01-20',
    daily: [
      { date: '2026-06-04', minutes: 22, tasks: 6, avgScore: 82 },
      { date: '2026-06-05', minutes: 19, tasks: 5, avgScore: 85 },
      { date: '2026-06-06', minutes: 14, tasks: 3, avgScore: 80 },
      { date: '2026-06-07', minutes: 0, tasks: 0, avgScore: null },
      { date: '2026-06-08', minutes: 25, tasks: 6, avgScore: 88 },
      { date: '2026-06-09', minutes: 20, tasks: 5, avgScore: 90 },
      { date: '2026-06-10', minutes: 16, tasks: 4, avgScore: 91 },
    ],
  },
  {
    id: 'child-4',
    name: 'Алихан Бекетов',
    age: 6,
    diagnoses: ['ffn'],
    progress: 47,
    connectedAt: '2026-05-02',
    daily: [
      { date: '2026-06-04', minutes: 0, tasks: 0, avgScore: null },
      { date: '2026-06-05', minutes: 11, tasks: 3, avgScore: 58 },
      { date: '2026-06-06', minutes: 13, tasks: 3, avgScore: 61 },
      { date: '2026-06-07', minutes: 9, tasks: 2, avgScore: 57 },
      { date: '2026-06-08', minutes: 0, tasks: 0, avgScore: null },
      { date: '2026-06-09', minutes: 14, tasks: 4, avgScore: 65 },
      { date: '2026-06-10', minutes: 7, tasks: 2, avgScore: 69 },
    ],
  },
];

/** История попыток произношения (мок «распознавания» речи). */
export const ATTEMPTS: Attempt[] = [
  // Алия — работа над звуком Р
  { id: 'at-101', childId: 'child-1', date: '2026-06-10', exerciseTitle: 'Слова со звуком Р', expectedWord: 'ракета', recognizedWord: 'лакета', score: 58 },
  { id: 'at-102', childId: 'child-1', date: '2026-06-10', exerciseTitle: 'Рычим как тигр', expectedWord: 'р-р-р', recognizedWord: 'р-р-р', score: 86 },
  { id: 'at-103', childId: 'child-1', date: '2026-06-09', exerciseTitle: 'Слоги с Р: ра-ро-ру', expectedWord: 'ра-ро-ру', recognizedWord: 'ра-ро-ру', score: 81 },
  { id: 'at-104', childId: 'child-1', date: '2026-06-09', exerciseTitle: 'Слова со звуком Р', expectedWord: 'рыба', recognizedWord: 'рыба', score: 77 },
  { id: 'at-105', childId: 'child-1', date: '2026-06-08', exerciseTitle: 'Слова со звуком Р', expectedWord: 'корова', recognizedWord: 'koowa', score: 41 },
  { id: 'at-106', childId: 'child-1', date: '2026-06-07', exerciseTitle: 'Слоги с Р: ра-ро-ру', expectedWord: 'ру-ры-ра', recognizedWord: 'лу-лы-ра', score: 52 },
  { id: 'at-107', childId: 'child-1', date: '2026-06-05', exerciseTitle: 'Рычим как тигр', expectedWord: 'р-р-р', recognizedWord: 'в-в-в', score: 35 },
  { id: 'at-108', childId: 'child-1', date: '2026-06-04', exerciseTitle: 'Чашечка', expectedWord: '—', recognizedWord: '—', score: 70 },

  // Тимур — задержка речи, простые слова
  { id: 'at-201', childId: 'child-2', date: '2026-06-09', exerciseTitle: 'Расскажи по картинке', expectedWord: 'собака', recognizedWord: 'абака', score: 49 },
  { id: 'at-202', childId: 'child-2', date: '2026-06-08', exerciseTitle: 'Поймай звук', expectedWord: 'мама', recognizedWord: 'мама', score: 84 },
  { id: 'at-203', childId: 'child-2', date: '2026-06-08', exerciseTitle: 'Цепочка слогов', expectedWord: 'па-ба-па', recognizedWord: 'па-па-па', score: 56 },
  { id: 'at-204', childId: 'child-2', date: '2026-06-06', exerciseTitle: 'Поймай звук', expectedWord: 'дом', recognizedWord: 'дём', score: 62 },
  { id: 'at-205', childId: 'child-2', date: '2026-06-04', exerciseTitle: 'Цепочка слогов', expectedWord: 'та-да-та', recognizedWord: 'та-та', score: 38 },

  // Дана — автоматизация Ш, почти готово
  { id: 'at-301', childId: 'child-3', date: '2026-06-10', exerciseTitle: 'Змейка: слова со звуком Ш', expectedWord: 'камыш', recognizedWord: 'камыш', score: 94 },
  { id: 'at-302', childId: 'child-3', date: '2026-06-10', exerciseTitle: 'Змейка: слова со звуком Ш', expectedWord: 'шапка', recognizedWord: 'шапка', score: 91 },
  { id: 'at-303', childId: 'child-3', date: '2026-06-09', exerciseTitle: 'Цепочка слогов', expectedWord: 'са-ша-са', recognizedWord: 'са-ша-са', score: 89 },
  { id: 'at-304', childId: 'child-3', date: '2026-06-08', exerciseTitle: 'Змейка: слова со звуком Ш', expectedWord: 'мышка', recognizedWord: 'мышка', score: 92 },
  { id: 'at-305', childId: 'child-3', date: '2026-06-06', exerciseTitle: 'Расскажи по картинке', expectedWord: 'кошка спит', recognizedWord: 'коска спит', score: 67 },
  { id: 'at-306', childId: 'child-3', date: '2026-06-05', exerciseTitle: 'Змейка: слова со звуком Ш', expectedWord: 'шуба', recognizedWord: 'шуба', score: 88 },
  { id: 'at-307', childId: 'child-3', date: '2026-06-04', exerciseTitle: 'Насос: звук С', expectedWord: 'с-с-с', recognizedWord: 'с-с-с', score: 90 },

  // Мирас — фонематика
  { id: 'at-401', childId: 'child-4', date: '2026-06-10', exerciseTitle: 'Цепочка слогов', expectedWord: 'ра-ла-ра', recognizedWord: 'ра-ла-ла', score: 63 },
  { id: 'at-402', childId: 'child-4', date: '2026-06-09', exerciseTitle: 'Поймай звук', expectedWord: 'жук', recognizedWord: 'жук', score: 82 },
  { id: 'at-403', childId: 'child-4', date: '2026-06-07', exerciseTitle: 'Цепочка слогов', expectedWord: 'за-жа-за', recognizedWord: 'жа-жа-жа', score: 44 },
  { id: 'at-404', childId: 'child-4', date: '2026-06-06', exerciseTitle: 'Что звучало?', expectedWord: '—', recognizedWord: '—', score: 75 },
  { id: 'at-405', childId: 'child-4', date: '2026-06-05', exerciseTitle: 'Поймай звук', expectedWord: 'зонт', recognizedWord: 'жонт', score: 51 },
];

/** Заметки логопеда по детям. */
export const NOTES: Note[] = [
  {
    id: 'note-1',
    childId: 'child-1',
    title: 'Итоги 1 урока',
    text: 'Замечаются проблемы со звуком Р: замена на Л в начале слов. «Чашечка» получается, вибрации пока нет.',
    date: '2026-06-03',
  },
  {
    id: 'note-2',
    childId: 'child-1',
    title: 'Домашнее задание',
    text: 'Маме: ежедневно «Грибок» и «Лошадка» по 3 минуты перед зеркалом.',
    date: '2026-06-08',
  },
  {
    id: 'note-3',
    childId: 'child-2',
    title: 'Первичная диагностика',
    text: 'Словарный запас ниже возрастной нормы. Начинаем с неречевых звуков и простых слоговых цепочек.',
    date: '2026-04-25',
  },
  {
    id: 'note-4',
    childId: 'child-3',
    title: 'Звук Ш почти автоматизирован',
    text: 'В словах стабильно, в спонтанной речи изредка «с». Переходим к чистоговоркам и связной речи.',
    date: '2026-06-09',
  },
];
