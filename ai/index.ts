import { EXERCISES } from '@/data/exercises';
import { Category, Exercise } from '@/data/types';

/**
 * Модуль ИИ. Сейчас — локальные заглушки с задержкой и простой
 * keyword-логикой. Чтобы подключить реальный API, достаточно реализовать
 * интерфейс AiProvider и заменить экспортируемый `ai` — UI не изменится.
 */

export interface GeneratedPlan {
  title: string;
  /** Краткое «объяснение» ИИ, почему подобраны эти упражнения. */
  rationale: string;
  exerciseIds: string[];
}

export interface PronunciationResult {
  recognizedWord: string;
  score: number; // 0–100
}

export interface SoundAccuracy {
  sound: string;
  accuracy: number; // 0–100
}

/** Черновик упражнения, сгенерированный ИИ для ручного конструктора. */
export interface ExerciseDraft {
  title: string;
  category: Category;
  focusSound?: string;
  emoji: string;
  durationMin: number;
  description: string;
  instruction: string;
  parentNotes: string;
}

export interface GenerateExerciseParams {
  goal?: string;
  category?: Category;
  focusSound?: string;
}

export interface PoseResult {
  /** Доля времени, удержана ли поза, 0–100. */
  hold: number;
}

export interface AiProvider {
  generateLessonPlan(goal: string): Promise<GeneratedPlan>;
  scorePronunciation(expectedWord: string): Promise<PronunciationResult>;
  /** Оценка удержания позы лица/языка/рук (computer vision, MediaPipe). */
  scorePose(): Promise<PoseResult>;
  /** Рекомендации родителю на основе слабых звуков ребёнка. */
  generateRecommendations(stats: SoundAccuracy[]): Promise<string[]>;
  /** Сгенерировать черновик упражнения по цели / звуку / категории. */
  generateExercise(params: GenerateExerciseParams): Promise<ExerciseDraft>;
}

/** Игровые метафоры по звуку — основа детских инструкций. */
const SOUND_IMAGERY: Record<string, { emoji: string; image: string; voice: string }> = {
  Р: { emoji: '🐯', image: 'тигр', voice: 'р-р-р' },
  Л: { emoji: '🚢', image: 'пароход', voice: 'л-л-л' },
  С: { emoji: '💨', image: 'насос', voice: 'с-с-с' },
  Ш: { emoji: '🐍', image: 'змейка', voice: 'ш-ш-ш' },
  Ж: { emoji: '🐝', image: 'пчёлка', voice: 'ж-ж-ж' },
  З: { emoji: '🦟', image: 'комарик', voice: 'з-з-з' },
};

const WORDS_BY_SOUND: Record<string, string[]> = {
  Р: ['рыба', 'рука', 'ракета', 'корова'],
  Л: ['лампа', 'лодка', 'луна', 'пила'],
  С: ['сова', 'сумка', 'санки', 'нос'],
  Ш: ['шапка', 'мышка', 'шуба', 'камыш'],
  Ж: ['жук', 'жаба', 'ёжик', 'лужа'],
  З: ['зонт', 'коза', 'замок', 'ваза'],
};

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Звуки, которые умеем выделять из цели («поставить звук Р…»). */
const KNOWN_SOUNDS = ['Р', 'Л', 'С', 'Ш', 'Ж', 'З'];

function detectSound(goal: string): string | undefined {
  const lower = goal.toLowerCase();
  const m = lower.match(/звук[а-я]*\s*[«"']?([рлсшжз])/i);
  if (m) return m[1].toUpperCase();
  return KNOWN_SOUNDS.find((s) => lower.includes(`звука ${s.toLowerCase()}`));
}

function pickByCategory(category: Category, sound: string | undefined, count: number): Exercise[] {
  const pool = EXERCISES.filter((e) => e.category === category);
  // Сначала упражнения под нужный звук, затем универсальные (без фокус-звука).
  const ranked = [...pool].sort((a, b) => {
    const rank = (e: Exercise) => (sound && e.focusSound === sound ? 0 : e.focusSound ? 2 : 1);
    return rank(a) - rank(b);
  });
  return ranked.slice(0, count);
}

const localStubProvider: AiProvider = {
  /**
   * Имитация генерации плана: ~1.5 сек «думает», затем собирает 4–6
   * упражнений из каталога по ключевым словам цели.
   */
  async generateLessonPlan(goal: string): Promise<GeneratedPlan> {
    await delay(1500);

    const lower = goal.toLowerCase();
    const sound = detectSound(goal);
    const wantsBreathing = /дыхан/.test(lower);
    const wantsPhonemic = /слух|фонемат|различ/.test(lower);
    const wantsConnected = /связн|рассказ|предложен/.test(lower);
    const wantsAutomation = /автоматизац|закреп/.test(lower) || !!sound;

    const plan: Exercise[] = [];

    // Структура занятия: разминка-дыхание → артикуляция → основная часть.
    plan.push(...pickByCategory('breathing', sound, wantsBreathing ? 2 : 1));
    plan.push(...pickByCategory('articulation', sound, sound ? 2 : 1));
    if (wantsPhonemic) plan.push(...pickByCategory('phonemic', sound, 2));
    if (wantsAutomation) plan.push(...pickByCategory('automation', sound, 2));
    if (wantsConnected || plan.length < 4) plan.push(...pickByCategory('connected', sound, 1));

    const unique = plan.filter((e, i) => plan.findIndex((x) => x.id === e.id) === i);
    const exerciseIds = unique.slice(0, 6).map((e) => e.id);

    const title = sound
      ? `Занятие: звук ${sound}`
      : wantsPhonemic
        ? 'Занятие: фонематический слух'
        : wantsConnected
          ? 'Занятие: связная речь'
          : 'Индивидуальное занятие';

    const rationale = sound
      ? `План построен вокруг звука ${sound}: дыхательная разминка, артикуляционная подготовка и закрепление в игровой форме.`
      : 'План построен по классической структуре: дыхательная разминка, артикуляционная гимнастика и основная часть по цели занятия.';

    return { title, rationale, exerciseIds };
  },

  /** Имитация оценки произношения: лёгкое «искажение» слова и балл. */
  async scorePronunciation(expectedWord: string): Promise<PronunciationResult> {
    await delay(800);
    const score = 35 + Math.floor(Math.random() * 60);
    const recognizedWord =
      score > 75 ? expectedWord : expectedWord.replace(/р/gi, 'л').replace(/ш/gi, 'с');
    return { recognizedWord, score };
  },

  /**
   * Имитация computer-vision-оценки удержания позы. ТОЧКА ПОДКЛЮЧЕНИЯ
   * MediaPipe (FaceMesh/Hands): заменить случайный балл на долю кадров,
   * где поза распознана, сохранив контракт PoseResult.
   */
  async scorePose(): Promise<PoseResult> {
    await delay(1500);
    return { hold: 55 + Math.floor(Math.random() * 45) };
  },

  /**
   * Имитация рекомендаций: берём 1–2 самых слабых звука (<70%) и
   * советуем подходящие упражнения из каталога.
   */
  async generateRecommendations(stats: SoundAccuracy[]): Promise<string[]> {
    await delay(900);

    const weak = [...stats].sort((a, b) => a.accuracy - b.accuracy).filter((s) => s.accuracy < 70);
    if (weak.length === 0) {
      return [
        'Отличная динамика по всем звукам! Поддерживайте режим занятий 10–15 минут в день.',
        'Добавьте упражнения на связную речь: пересказы и рассказы по картинкам.',
      ];
    }

    const tips = weak.slice(0, 2).map((s) => {
      const suited = EXERCISES.filter((e) => e.focusSound === s.sound).slice(0, 2);
      const names = suited.map((e) => `«${e.title}»`).join(' и ');
      return names
        ? `Звук ${s.sound} пока даётся сложно (${s.accuracy}%). Повторяйте ${names} по 3–4 минуты в день.`
        : `Звук ${s.sound} пока даётся сложно (${s.accuracy}%). Уделите ему 5 минут артикуляционной гимнастики ежедневно.`;
    });

    tips.push('Занимайтесь понемногу, но каждый день — регулярность важнее длительности.');
    return tips;
  },

  /**
   * Имитация генерации упражнения: ~1.2 сек, затем собирает детский
   * черновик по звуку и категории. Инструкции — без оценочных слов,
   * в игровой форме (как требует детский режим платформы).
   */
  async generateExercise(params: GenerateExerciseParams): Promise<ExerciseDraft> {
    await delay(1200);

    const sound = (params.focusSound?.toUpperCase() || detectSound(params.goal ?? '')) as
      | string
      | undefined;
    const category = params.category ?? inferCategory(params.goal ?? '', sound);
    const img = sound ? SOUND_IMAGERY[sound] : undefined;
    const words = sound ? (WORDS_BY_SOUND[sound] ?? []) : [];

    let title: string;
    let instruction: string;
    let parentNotes: string;
    let emoji: string;
    let durationMin = 4;

    switch (category) {
      case 'breathing':
        emoji = '🎈';
        title = 'Воздушный волшебник';
        instruction =
          'Сделай вдох носиком, как будто нюхаешь цветок, а потом плавно подуй на ладошку — длинно-длинно, пока хватает ветерка!';
        parentNotes = 'Следите, чтобы щёки не надувались, плечи не поднимались. Вдох — носом, выдох — ртом, 4–5 раз.';
        durationMin = 3;
        break;
      case 'phonemic':
        emoji = '👂';
        title = sound ? `Поймай звук ${sound}` : 'Поймай звук';
        instruction = sound
          ? `Слушай внимательно! Я буду называть слова, а ты хлопни в ладоши, когда услышишь звук ${sound}: ${words.join(', ')}.`
          : 'Слушай слова и хлопни в ладоши, как только услышишь наш звук — поймай его!';
        parentNotes = 'Произносите слова чётко, в спокойном темпе. Сначала выделяйте нужный звук голосом, потом — обычно.';
        break;
      case 'automation':
        emoji = img?.emoji ?? '🗣️';
        title = sound ? `Слова со звуком ${sound}` : 'Повторяй за мной';
        instruction = sound
          ? `Превратись в ${img?.image ?? 'волшебника'} и порычи: ${img?.voice ?? '...'}. А теперь назови картинки чётко: ${words.join(', ')}.`
          : 'Повторяй за мной слоги и слова громко и чётко, как настоящий волшебник!';
        parentNotes = sound
          ? `Если звук ${sound} «теряется» в слове — вернитесь к изолированному «${img?.voice ?? ''}» и повторите слово по слогам.`
          : 'Хвалите за старание, а не за результат. Если трудно — разбейте слово на слоги.';
        durationMin = 5;
        break;
      case 'connected':
        emoji = '📖';
        title = 'Расскажи историю';
        instruction = sound
          ? `Придумай маленькую историю, чтобы в ней жили слова со звуком ${sound}: ${words.slice(0, 3).join(', ')}. Кто герой? Что случилось?`
          : 'Посмотри на картинку и расскажи историю: кто на ней, что делает, что было дальше?';
        parentNotes = 'Помогайте вопросами «кто? что делает? а потом?», но не рассказывайте за ребёнка — пусть говорит сам.';
        durationMin = 6;
        break;
      case 'motor':
        emoji = '🤲';
        title = 'Пальчиковая зарядка';
        instruction =
          'Покажи камере ладошку и по очереди соединяй каждый пальчик с большим: раз, два, три, четыре. А теперь другой ручкой!';
        parentNotes = 'Мелкая моторика тесно связана с речью. Делайте медленно и чётко, обеими руками.';
        durationMin = 3;
        break;
      default: // articulation
        emoji = img?.emoji ?? '😀';
        title = sound ? `Зарядка для звука ${sound}` : 'Весёлая зарядка для язычка';
        instruction = sound
          ? `Делаем зарядку для звука ${sound}! Улыбнись, открой ротик и потянись язычком вверх, как будто хочешь достать носик. Подержи, пока я считаю до пяти!`
          : 'Улыбнись, открой ротик и покажи язычку гимнастику: вверх к носику, вниз к подбородку, в стороны — как качели!';
        parentNotes = 'Выполняйте перед зеркалом, медленно и без напряжения. По 5–6 повторений, 2 раза в день.';
        durationMin = 3;
    }

    const description = sound
      ? `Упражнение на «${category}» для постановки и закрепления звука ${sound} в игровой форме.`
      : `Упражнение на «${category}» в игровой форме.`;

    return {
      title,
      category,
      focusSound: sound,
      emoji,
      durationMin,
      description,
      instruction,
      parentNotes,
    };
  },
};

/** Грубое определение категории по цели, если она не задана явно. */
function inferCategory(goal: string, sound: string | undefined): Category {
  const lower = goal.toLowerCase();
  if (/дыхан|вдох|выдох|подуть|дуем/.test(lower)) return 'breathing';
  if (/моторик|пальчик|пальц|рук|колечк/.test(lower)) return 'motor';
  if (/слух|фонемат|различ|поймай/.test(lower)) return 'phonemic';
  if (/связн|рассказ|предложен|истори|пересказ/.test(lower)) return 'connected';
  if (/автоматизац|закреп|слов|слог/.test(lower) || sound) return 'automation';
  return 'articulation';
}

/** Текущий провайдер ИИ. Позже заменяется на реальный API. */
export const ai: AiProvider = localStubProvider;
