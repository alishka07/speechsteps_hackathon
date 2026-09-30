import { Category, Exercise } from './types';

/**
 * Мост каталогов: упражнения логопеда (основное приложение) ↔ упражнения
 * игрового мира «Остров Эха» (echo-island). У проектов разные словари,
 * поэтому маппинг идёт по категории и фокус-звуку.
 *
 * Прямой путь: урок логопеда → маршрут дня в игре (getLessonPlan).
 * Обратный: событие игры (echo-island id) → читаемое название попытки.
 */

/** Русские названия используемых echo-island упражнений (для истории попыток). */
export const ECHO_NAMES: Record<string, string> = {
  'art-smile': 'Улыбка',
  'art-tube': 'Трубочка',
  'art-puff': 'Надувание щёк',
  'art-cup': 'Чашечка',
  'art-mushroom': 'Грибок',
  'art-clock': 'Часики',
  'art-swing': 'Качели',
  'art-frog': 'Лягушка',
  'art-spoon': 'Лопаточка',
  'art-needle': 'Иголочка',
  'art-lip-clicks': 'Пощёлкивание губами',
  'art-fence': 'Заборчик',
  'br-windmill': 'Ветерок и мельница',
  'br-pinwheel': 'Вертушка',
  'br-dandelion': 'Одуванчик',
  'br-feather': 'Пёрышко',
  'br-snowflake': 'Снежинка на ладошке',
  'br-straw': 'Дуем через трубочку',
  'br-football': 'Футбол',
  'br-bee': 'Пчёлка жужжит',
  'br-balloon': 'Воздушный шар',
  'br-diaphragm': 'Диафрагмальное дыхание',
  'ph-first-sound': 'Первый звук в слове',
  'ph-last-sound': 'Последний звук',
  'ph-position': 'Выделение звука в слове',
  'ph-rhyme': 'Найди рифму',
  'ph-syllable-count': 'Сколько слогов',
  'ph-soft-hard': 'Мягкий или твёрдый',
  'ph-voiced-voiceless': 'Звонкий или глухой',
  'ph-word-from-sounds': 'Собери слово из звуков',
  'rp-horse': 'Лошадка',
  'rp-woodpecker': 'Дятел',
  'rp-motor': 'Моторчик',
  'aut-syllables-ra': 'Слоги РА-РО-РУ-РЫ',
  'aut-words-l': 'Слова со звуком Л',
  's-snake': 'Змейка С-С-С',
  'sh-train': 'Поезд Ш-Ш-Ш',
  'rp-zh-bug': 'Жук жужжит',
  'story-retell': 'Пересказ истории',
  'dialog-greeting': 'Диалог: приветствие',
  'prosody-emotion': 'Эмоция по голосу',
  'lex-antonyms': 'Антонимы',
  'lex-synonyms': 'Синонимы',
  'v-echo': 'Эхо',
  'v-animals': 'Звукоподражание',
};

/** Читаемое название echo-island упражнения (фолбэк — сам id). */
export function echoName(id: string): string {
  return ECHO_NAMES[id] ?? MOTOR_NAMES[id] ?? id;
}

const POOLS: Record<Category, string[]> = {
  articulation: ['art-smile', 'art-tube', 'art-cup', 'art-mushroom', 'art-clock', 'art-swing', 'art-frog', 'art-spoon'],
  breathing: ['br-windmill', 'br-pinwheel', 'br-dandelion', 'br-feather', 'br-snowflake', 'br-straw', 'br-balloon'],
  phonemic: ['ph-first-sound', 'ph-last-sound', 'ph-position', 'ph-rhyme', 'ph-syllable-count', 'ph-soft-hard', 'ph-word-from-sounds'],
  automation: ['s-snake'],
  connected: ['story-retell', 'dialog-greeting', 'prosody-emotion', 'lex-antonyms', 'lex-synonyms'],
  // Моторика → camera-упражнения «Тропы Ловких Лап» (отслеживание рук).
  motor: ['m-fingers', 'm-ring', 'm-mirroring', 'm-fist-palm', 'm-piano', 'm-bunny'],
};

/** Имена echo-id моторики для истории попыток. */
const MOTOR_NAMES: Record<string, string> = {
  'm-fingers': 'Пальчиковая гимнастика',
  'm-ring': 'Колечко',
  'm-mirroring': 'Зеркало',
  'm-fist-palm': 'Кулак — ребро — ладонь',
  'm-piano': 'Пианино',
  'm-bunny': 'Зайчик',
};

/** Автоматизация — упражнение под конкретный звук. */
const SOUND_AUTOMATION: Record<string, string> = {
  Р: 'rp-horse',
  Л: 'aut-words-l',
  С: 's-snake',
  Ш: 'sh-train',
  Ж: 'rp-zh-bug',
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Одно упражнение логопеда → echo-island id (детерминированно). */
export function echoIdForExercise(ex: Exercise): string {
  if (ex.category === 'automation' && ex.focusSound) {
    const sound = ex.focusSound.toUpperCase();
    if (SOUND_AUTOMATION[sound]) return SOUND_AUTOMATION[sound];
  }
  // Артикуляция со звуком Р тяготеет к подготовительным упражнениям грибок/чашечка.
  if (ex.category === 'articulation' && ex.focusSound?.toUpperCase() === 'Р') {
    return hash(ex.id) % 2 === 0 ? 'art-mushroom' : 'art-cup';
  }
  const pool = POOLS[ex.category];
  return pool[hash(ex.id) % pool.length];
}

/** Маршрут дня для игры: упражнения урока → echo-island id без повторов. */
export function buildEchoPlan(exercises: Exercise[]): string[] {
  const ids = exercises.map(echoIdForExercise);
  return [...new Set(ids)];
}

/** Запасной маршрут, если ребёнку ещё не назначен ни один урок. */
export const DEFAULT_ECHO_PLAN = ['art-spoon', 'br-windmill', 'rp-horse', 'ph-first-sound', 'v-echo'];
