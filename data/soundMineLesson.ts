import { AttemptStatus, SoundMineLevel } from './types';

/**
 * Контракт «Шахты звуков» (Sound Mine) — между ИИ-конструктором урока и игрой.
 * Конструктор отдаёт этот JSON, игра его потребляет. Один и тот же цикл на
 * каждом уровне иерархии (isolation → story), поэтому новый урок — это ДАННЫЕ,
 * а не код. Глубина в шахте = уровень иерархии.
 *
 * `language` выбирает движок оценки автоматически (SpeechSuper для русского,
 * Cybernet/M2ASR для казахского). `requiresParent` гейтит элемент за
 * подтверждением присутствия родителя. `reviewBand` — баллы в этом диапазоне
 * уходят логопеду на верификацию (гибридная модель + данные для дообучения).
 */
export interface SoundMineTarget {
  /** Фонема, например «р». */
  phoneme: string;
  /** Позиции звука в слове, отрабатываемые уроком. */
  positions: SoundPosition[];
}

export type SoundPosition = 'initial' | 'medial' | 'final';

export interface SoundMineItem {
  id: string;
  /** Что ребёнок произносит (слог/слово/фраза…). */
  text: string;
  /** Опциональная CC0-картинка (id ассета). */
  pictureRef?: string;
  /** Эмодзи-картинка для карточки кристалла (когда нет 3D-ассета). */
  emoji?: string;
  /** Эталонное произношение (TTS-ключ). */
  audioExample?: string;
  position?: SoundPosition;
  /** Гейтит элемент за подтверждением присутствия родителя. */
  requiresParent?: boolean;
}

export interface SoundMineAssessment {
  /** Движок оценки: speechsuper (ru) | cybernet (kk). */
  engine: 'speechsuper' | 'cybernet';
  /** Порог зачёта элемента, %. */
  passThreshold: number;
  /** Максимум попыток на элемент. */
  maxAttempts: number;
  /** Баллы в этом диапазоне флагуются на проверку логопедом. */
  reviewBand: [number, number];
}

export interface SoundMineRewards {
  xpPerItem: number;
  streakBonus: number;
  /** Косметическая награда за прохождение, например "cosmetic:lantern_blue". */
  unlock?: string;
}

export interface SoundMineLesson {
  id: string;
  targetSound: SoundMineTarget;
  language: 'ru' | 'kk';
  level: SoundMineLevel;
  items: SoundMineItem[];
  assessment: SoundMineAssessment;
  progression: {
    /** Порог мастерства по набору элементов (≈80% — правило перехода уровня). */
    masteryThreshold: number;
    /** Следующий уровень или "auto" (поднимаемся по иерархии). */
    advanceTo: SoundMineLevel | 'auto';
  };
  rewards: SoundMineRewards;
}

/**
 * Вертикальный срез: звук Р, уровень «слово», 10 элементов (ru).
 * Этого достаточно, чтобы проверить весь цикл; остальные уровни и звуки —
 * тот же цикл с другими данными.
 */
export const SAMPLE_SOUND_MINE: SoundMineLesson = {
  id: 'sm-r-word-ru',
  targetSound: { phoneme: 'р', positions: ['initial', 'medial', 'final'] },
  language: 'ru',
  level: 'word',
  items: [
    { id: 'r1', text: 'рыба', emoji: '🐟', pictureRef: 'cc0:fish_01', audioExample: 'tts:рыба_ru', position: 'initial' },
    { id: 'r2', text: 'рука', emoji: '✋', pictureRef: 'cc0:hand_01', audioExample: 'tts:рука_ru', position: 'initial' },
    { id: 'r3', text: 'ракета', emoji: '🚀', pictureRef: 'cc0:rocket_01', audioExample: 'tts:ракета_ru', position: 'initial' },
    { id: 'r4', text: 'роза', emoji: '🌹', pictureRef: 'cc0:rose_01', audioExample: 'tts:роза_ru', position: 'initial' },
    { id: 'r5', text: 'рак', emoji: '🦀', pictureRef: 'cc0:crab_01', audioExample: 'tts:рак_ru', position: 'initial' },
    { id: 'r6', text: 'корова', emoji: '🐄', pictureRef: 'cc0:cow_01', audioExample: 'tts:корова_ru', position: 'medial' },
    { id: 'r7', text: 'ворона', emoji: '🐦‍⬛', pictureRef: 'cc0:crow_01', audioExample: 'tts:ворона_ru', position: 'medial' },
    { id: 'r8', text: 'гора', emoji: '⛰️', pictureRef: 'cc0:mountain_01', audioExample: 'tts:гора_ru', position: 'medial' },
    { id: 'r9', text: 'барабан', emoji: '🥁', pictureRef: 'cc0:drum_01', audioExample: 'tts:барабан_ru', position: 'medial' },
    { id: 'r10', text: 'комар', emoji: '🦟', pictureRef: 'cc0:mosquito_01', audioExample: 'tts:комар_ru', position: 'final' },
  ],
  assessment: {
    engine: 'speechsuper',
    passThreshold: 80,
    maxAttempts: 3,
    reviewBand: [50, 75],
  },
  progression: { masteryThreshold: 80, advanceTo: 'auto' },
  rewards: { xpPerItem: 10, streakBonus: 5, unlock: 'cosmetic:lantern_blue' },
};

/**
 * Канонический разбор балла попытки. Та же логика продублирована в игре
 * (soundMine-html.ts, gradeAndReact), где порог зачёта дополнительно
 * смещается сложностью урока. Здесь — эталонное правило (и точка опоры для
 * подключения реального движка оценки):
 *   score ≥ passThreshold        → pass  (кристалл добыт);
 *   reviewBand[0]..reviewBand[1] → review (на проверку логопеду);
 *   иначе                        → retry  (мягкий повтор).
 */
export function gradeAttempt(
  score: number,
  a: Pick<SoundMineAssessment, 'passThreshold' | 'reviewBand'>,
): AttemptStatus {
  if (score >= a.passThreshold) return 'pass';
  const [lo, hi] = a.reviewBand;
  if (score >= lo && score <= hi) return 'review';
  return 'retry';
}

/** Достигнут ли порог мастерства по набору пройденных элементов (≈80%). */
export function masteryReached(passedCount: number, total: number, lesson: SoundMineLesson): boolean {
  if (total <= 0) return false;
  return (passedCount / total) * 100 >= lesson.progression.masteryThreshold;
}
