/**
 * Домашняя практика родителя: простые упражнения БЕЗ оценки.
 * Шаги + таймер, без процентов и баллов — это спокойная отработка дома
 * (как раздел Home Practice в веб-версии).
 */
export type HomeCategory = 'articulation' | 'breathing' | 'phonemic' | 'motor';

export interface HomeExercise {
  id: string;
  name: string;
  category: HomeCategory;
  emoji: string;
  durationSec: number;
  steps: string[];
  /** Назначено логопедом (раздел «От логопеда»). */
  fromTherapist?: boolean;
}

export const HOME_CATEGORIES: HomeCategory[] = ['articulation', 'breathing', 'phonemic', 'motor'];

export const HOME_EXERCISES: HomeExercise[] = [
  {
    id: 'hp-clicks',
    name: 'Щёлканье язычком',
    category: 'articulation',
    emoji: '🐴',
    durationSec: 60,
    steps: [
      'Улыбнись и открой ротик.',
      'Прижми язычок к нёбу за верхними зубками.',
      'Щёлкни язычком, как лошадка копытом.',
      'Цокай медленно, потом чуть быстрее — 10 раз.',
    ],
    fromTherapist: true,
  },
  {
    id: 'hp-lips',
    name: 'Вибрация губ',
    category: 'articulation',
    emoji: '🏍️',
    durationSec: 45,
    steps: [
      'Расслабь губы и набери воздух.',
      'Выдыхай так, чтобы губы задрожали: «бр-р-р».',
      'Представь, что ты мотоцикл — погуди.',
      'Повтори 5–6 раз с короткими паузами.',
    ],
  },
  {
    id: 'hp-balloon',
    name: 'Дыхание «шарик»',
    category: 'breathing',
    emoji: '🎈',
    durationSec: 60,
    steps: [
      'Положи ручки на животик.',
      'Вдохни носиком — животик-шарик надувается.',
      'Медленно выдохни ртом — шарик сдувается.',
      'Повтори 5 спокойных вдохов-выдохов.',
    ],
  },
  {
    id: 'hp-straw',
    name: 'Дуем через трубочку',
    category: 'breathing',
    emoji: '🥤',
    durationSec: 45,
    steps: [
      'Возьми трубочку и стакан с водой.',
      'Вдохни носиком.',
      'Дуй в трубочку — пусть будут пузыри-бульки.',
      'Дуй ровно и долго, не торопись.',
    ],
  },
  {
    id: 'hp-mirror',
    name: 'Зеркальные рожицы',
    category: 'motor',
    emoji: '🪞',
    durationSec: 50,
    steps: [
      'Сядьте напротив друг друга.',
      'Взрослый показывает рожицу — ребёнок повторяет.',
      'Поменяйтесь: теперь рожицу придумывает ребёнок.',
      'Улыбка, удивление, надутые щёчки — кто смешнее!',
    ],
  },
  {
    id: 'hp-fingers',
    name: 'Пальчики здороваются',
    category: 'motor',
    emoji: '🤲',
    durationSec: 50,
    steps: [
      'Покажи ладошку.',
      'По очереди соединяй каждый пальчик с большим.',
      'Скажи «привет» каждому пальчику.',
      'Повтори другой ручкой.',
    ],
  },
  {
    id: 'hp-hunt',
    name: 'Охота за звуками',
    category: 'phonemic',
    emoji: '🔍',
    durationSec: 120,
    steps: [
      'Выберите звук дня, например «С».',
      'Ходите по дому и ищите предметы на этот звук.',
      'Называй вслух: «Стол! Стул! Сок!»',
      'Кто найдёт больше — тот победил!',
    ],
    fromTherapist: true,
  },
  {
    id: 'hp-clap',
    name: 'Прохлопай слово',
    category: 'phonemic',
    emoji: '👏',
    durationSec: 60,
    steps: [
      'Назови любое слово, например «ма-ши-на».',
      'Прохлопай его по слогам.',
      'Сосчитай, сколько хлопков получилось.',
      'Попробуй короткие и длинные слова.',
    ],
  },
];

/** ммсс из секунд: 90 → "1:30". */
export function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
