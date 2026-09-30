import { Category, DiagnosisKey, Exercise } from './types';

/**
 * Коррекционный путь по логопедическому заключению.
 * Опирается на классическую этапность (Фомичёва, Коноваленко) и методики
 * по нозологиям (Архипова, Филичева/Чиркина, Жукова и др.) — см.
 * docs/therapy-paths.md. Данные клинические, поэтому русский — прямо здесь.
 */

export type StageId =
  | 'prep_breath'
  | 'prep_artic'
  | 'prep_motor'
  | 'prep_phonemic'
  | 'setting'
  | 'automation'
  | 'differentiation'
  | 'connected';

export interface TherapyStage {
  id: StageId;
  title: string;
  goal: string;
  categories: Category[];
  /** Регионы «Острова Эха» для прогрессии карты. */
  regions: string[];
  emoji: string;
}

/** Канонический порядок этапов (по нему выстраивается любой маршрут). */
export const STAGES: TherapyStage[] = [
  {
    id: 'prep_breath',
    title: 'Дыхательная база',
    goal: 'Поставить плавный речевой выдох, силу и направленность воздушной струи.',
    categories: ['breathing'],
    regions: ['hills'],
    emoji: '🌬️',
  },
  {
    id: 'prep_artic',
    title: 'Артикуляционная база',
    goal: 'Развить подвижность и точность органов артикуляции (артикуляционная гимнастика).',
    categories: ['articulation'],
    regions: ['lake'],
    emoji: '👅',
  },
  {
    id: 'prep_motor',
    title: 'Моторная база',
    goal: 'Развить мелкую и артикуляционную моторику, нормализовать тонус.',
    categories: ['motor'],
    regions: ['trail'],
    emoji: '🤲',
  },
  {
    id: 'prep_phonemic',
    title: 'Фонематическое восприятие',
    goal: 'Научить слышать и выделять звуки, развить звуковой анализ и синтез.',
    categories: ['phonemic'],
    regions: ['forest'],
    emoji: '👂',
  },
  {
    id: 'setting',
    title: 'Постановка звука',
    goal: 'Вызвать правильный изолированный звук (по подражанию / механически).',
    categories: ['articulation', 'automation'],
    regions: ['motor', 'caves'],
    emoji: '✨',
  },
  {
    id: 'automation',
    title: 'Автоматизация',
    goal: 'Закрепить звук: слоги → слова → словосочетания → предложения → речь.',
    categories: ['automation'],
    regions: ['motor', 'caves'],
    emoji: '🔁',
  },
  {
    id: 'differentiation',
    title: 'Дифференциация звуков',
    goal: 'Научить различать смешиваемые звуки (С–Ш, Р–Л, З–Ж…) на слух и в речи.',
    categories: ['phonemic', 'automation'],
    regions: ['forest'],
    emoji: '🔀',
  },
  {
    id: 'connected',
    title: 'Связная речь',
    goal: 'Ввести навык в самостоятельную речь: пересказ, рассказ, диалог.',
    categories: ['connected'],
    regions: ['town', 'forest'],
    emoji: '💬',
  },
];

const STAGE_ORDER: StageId[] = STAGES.map((s) => s.id);
const byStageId = new Map(STAGES.map((s) => [s.id, s]));

export interface DiagnosisProgram {
  diagnosis: DiagnosisKey;
  /** Полное название заключения. */
  fullName: string;
  /** Методика/авторы. */
  method: string;
  /** Акцент коррекции. */
  note: string;
  /** Этапы маршрута (в любом порядке — нормализуется к каноническому). */
  stages: StageId[];
}

export const PROGRAMS: Record<DiagnosisKey, DiagnosisProgram> = {
  dyslalia: {
    diagnosis: 'dyslalia',
    fullName: 'Дислалия',
    method: 'Фомичёва, Коноваленко, Богомолова',
    note: 'Короткий подготовительный этап; упор на постановку и автоматизацию нарушенных звуков по онтогенезу (свистящие → шипящие → сонорные).',
    stages: ['prep_artic', 'prep_phonemic', 'setting', 'automation', 'differentiation', 'connected'],
  },
  dysarthria: {
    diagnosis: 'dysarthria',
    fullName: 'Дизартрия',
    method: 'Архипова, Лопатина',
    note: 'Длительный подготовительный этап: нормализация тонуса, дыхательная и артикуляционная база, моторика, логопедический массаж; медленная автоматизация.',
    stages: ['prep_breath', 'prep_artic', 'prep_motor', 'prep_phonemic', 'setting', 'automation', 'differentiation', 'connected'],
  },
  ffn: {
    diagnosis: 'ffn',
    fullName: 'Фонетико-фонематическое недоразвитие (ФФНР)',
    method: 'Филичева, Чиркина',
    note: 'Акцент на фонематическое восприятие, звуковой анализ и синтез, дифференциацию смешиваемых звуков.',
    stages: ['prep_phonemic', 'prep_artic', 'setting', 'differentiation', 'automation', 'connected'],
  },
  onr: {
    diagnosis: 'onr',
    fullName: 'Общее недоразвитие речи (ОНР)',
    method: 'Жукова; Филичева/Чиркина; Нищева',
    note: 'Комплексная работа по уровням ОНР: словарь, грамматика, фразовая и связная речь наряду со звукопроизношением.',
    stages: ['prep_breath', 'prep_artic', 'prep_phonemic', 'prep_motor', 'setting', 'automation', 'differentiation', 'connected'],
  },
  speechDelay: {
    diagnosis: 'speechDelay',
    fullName: 'Задержка речевого развития (ЗРР)',
    method: 'Громова, Янушко',
    note: 'Стимуляция речевой активности, звукоподражания, накопление словаря, простая фраза; постановка звуков — на более поздних этапах.',
    stages: ['prep_breath', 'prep_artic', 'prep_phonemic', 'connected'],
  },
  stuttering: {
    diagnosis: 'stuttering',
    fullName: 'Заикание',
    method: 'Выгодская/Пеллингер; Селиверстов',
    note: 'Нормализация дыхания, плавность, темпо-ритм, релаксация, охранительный речевой режим; работа над плавностью, а не над звуками.',
    stages: ['prep_breath', 'prep_motor', 'connected'],
  },
};

export interface PathStep {
  stage: TherapyStage;
  /** Заключения, которым нужен этот этап (для подсказки логопеду). */
  forDiagnoses: DiagnosisKey[];
}

/**
 * Строит коррекционный маршрут по одному или нескольким заключениям:
 * объединяет программы в канонической этапности, помечая, какое заключение
 * требует каждого этапа. Без заключений — пустой маршрут.
 */
export function buildTherapyPath(diagnoses: DiagnosisKey[]): PathStep[] {
  const need = new Map<StageId, DiagnosisKey[]>();
  for (const d of diagnoses) {
    const program = PROGRAMS[d];
    if (!program) continue;
    for (const stageId of program.stages) {
      const list = need.get(stageId) ?? [];
      if (!list.includes(d)) list.push(d);
      need.set(stageId, list);
    }
  }
  return STAGE_ORDER.filter((id) => need.has(id)).map((id) => ({
    stage: byStageId.get(id)!,
    forDiagnoses: need.get(id)!,
  }));
}

export interface StageLesson {
  title: string;
  rationale: string;
  exerciseIds: string[];
}

/**
 * Собирает урок под конкретный этап маршрута: берёт упражнения категорий
 * этапа (для звуковых этапов — приоритет упражнениям под фокус-звук).
 * Чистая функция — каталог передаётся параметром.
 */
export function buildStageLesson(
  stage: TherapyStage,
  exercises: Exercise[],
  focusSound?: string,
  max = 5,
): StageLesson {
  const sound = focusSound?.toUpperCase();
  const inStage = exercises.filter((e) => stage.categories.includes(e.category));
  const ranked = [...inStage].sort((a, b) => {
    const rank = (e: Exercise) => (sound && e.focusSound?.toUpperCase() === sound ? 0 : e.focusSound ? 2 : 1);
    return rank(a) - rank(b);
  });
  return {
    title: sound ? `${stage.title}: звук ${sound}` : stage.title,
    rationale: stage.goal,
    exerciseIds: ranked.slice(0, max).map((e) => e.id),
  };
}
