export type Category =
  | 'articulation'
  | 'phonemic'
  | 'automation'
  | 'breathing'
  | 'connected'
  | 'motor';

export type DiagnosisKey =
  | 'speechDelay'
  | 'dysarthria'
  | 'dyslalia'
  | 'ffn'
  | 'stuttering'
  | 'onr';

export interface Exercise {
  id: string;
  title: string;
  category: Category;
  /** Звук, над которым работает упражнение (Р, С, Ш…), если применимо. */
  focusSound?: string;
  emoji: string;
  durationMin: number;
  description: string;
  /** Инструкция для ребёнка простыми словами. */
  instruction: string;
  /** Заметки для родителя: на что обратить внимание дома. */
  parentNotes?: string;
  /** Требует присутствия родителя: в режиме родителя блокируется
   *  до подтверждения «Я рядом». */
  requiresParent?: boolean;
  /** Упражнение с компьютерным зрением (камера + MediaPipe): отслеживание
   *  позы лица/языка/рук. В детском режиме запускается camera-плеером. */
  vision?: boolean;
  /** Создано логопедом вручную (не из стандартного каталога). */
  custom?: boolean;
  /** Слова для тренировки с emoji-картинкой — показываются ребёнку карточками. */
  wordCards?: { word: string; emoji: string }[];
}

/** Уровни артикуляционной иерархии — глубина в «Шахте звуков». */
export type SoundMineLevel =
  | 'isolation'
  | 'syllable'
  | 'word'
  | 'phrase'
  | 'sentence'
  | 'story';

/** Итог попытки: pass ≥ порога; review — попал в reviewBand; retry — ниже. */
export type AttemptStatus = 'pass' | 'review' | 'retry';

/** Попытка произношения: что ждали, что «распознал» ИИ и оценка в %. */
export interface Attempt {
  id: string;
  childId: string;
  date: string; // ISO: 2026-06-10
  exerciseTitle: string;
  expectedWord: string;
  recognizedWord: string;
  score: number; // 0–100
  // --- «Шахта звуков» (articulation hierarchy). Поля опциональны: старые
  //     попытки и обычные зоны их не заполняют, история произношения цела. ---
  /** id элемента урока (кристалла). */
  itemId?: string;
  /** Уровень иерархии, на котором сделана попытка. */
  level?: SoundMineLevel;
  /** Целевой звук (фонема), например «р». */
  targetSound?: string;
  /** Номер попытки по этому элементу (1..maxAttempts). */
  attemptNo?: number;
  /** Был ли распознан жест (pinch-pull) — иначе сработал tap-фолбэк. */
  gestureOk?: boolean;
  /** Длительность записи речи, мс. */
  durationMs?: number;
  /** Итог попытки для очереди верификации логопеда. */
  status?: AttemptStatus;
  /** Оценка, подтверждённая/исправленная логопедом (очередь review). Пара
   *  (аудио + человеческая метка) — материал для дообучения модели. */
  verifiedScore?: number;
}

/** Данные одной попытки из «Шахты звуков» (мост игры → store). */
export interface SoundMineAttemptInput {
  /** Заголовок урока — попадает в существующую «Историю попыток». */
  lessonTitle: string;
  itemId: string;
  /** Что ребёнок должен был сказать. */
  expected: string;
  /** Что «распознал» движок оценки. */
  transcription: string;
  score: number;
  level: SoundMineLevel;
  targetSound: string;
  attemptNo: number;
  gestureOk: boolean;
  durationMs: number;
  status: AttemptStatus;
}

export interface DailyStat {
  date: string; // ISO
  minutes: number;
  tasks: number;
  /** Средняя оценка произношения за день, null — занятий не было. */
  avgScore: number | null;
}

export interface Child {
  id: string;
  name: string;
  age: number;
  diagnoses: DiagnosisKey[];
  /** Прогресс курса, 0–100. */
  progress: number;
  connectedAt: string; // ISO
  /** Статистика за последние 7 дней (включая сегодня). */
  daily: DailyStat[];
}

export interface Note {
  id: string;
  childId: string;
  title: string;
  text: string;
  date: string; // ISO
}

export interface Lesson {
  id: string;
  title: string;
  goal: string;
  exerciseIds: string[];
  createdAt: string; // ISO
  /** Кому назначен урок (если назначен). */
  childId?: string;
}
