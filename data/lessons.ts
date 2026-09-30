import { Lesson } from './types';

/** Готовые уроки (мок). */
export const LESSONS: Lesson[] = [
  {
    id: 'lesson-1',
    title: 'Постановка звука Р',
    goal: 'Поставить звук Р у ребёнка 5 лет',
    exerciseIds: ['ex-br-1', 'ex-art-1', 'ex-art-4', 'ex-art-5', 'ex-au-1'],
    createdAt: '2026-06-03',
    childId: 'child-1',
  },
  {
    id: 'lesson-2',
    title: 'Автоматизация Ш в словах',
    goal: 'Закрепить звук Ш в словах и слогах',
    exerciseIds: ['ex-br-2', 'ex-ph-3', 'ex-au-5', 'ex-co-1'],
    createdAt: '2026-05-28',
    childId: 'child-3',
  },
  {
    id: 'lesson-3',
    title: 'Развитие слухового внимания',
    goal: 'Развить фонематический слух у ребёнка 4 лет',
    exerciseIds: ['ex-br-3', 'ex-ph-2', 'ex-ph-1', 'ex-ph-3', 'ex-co-2'],
    createdAt: '2026-05-20',
    childId: 'child-2',
  },
  {
    id: 'lesson-4',
    title: 'Различаем З и Ж',
    goal: 'Научить различать звуки З и Ж на слух у ребёнка 6 лет',
    exerciseIds: ['ex-br-1', 'ex-ph-1', 'ex-ph-3', 'ex-au-4', 'ex-co-1'],
    createdAt: '2026-06-08',
    childId: 'child-4',
  },
];
