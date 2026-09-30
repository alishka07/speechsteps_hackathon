import { useAppStore } from '@/store/useAppStore';
import { kz } from './kz';
import { ru, TranslationKey } from './ru';

export type Lang = 'ru' | 'kz';
export type { TranslationKey };

const dictionaries: Record<Lang, Record<TranslationKey, string>> = { ru, kz };

export function translate(lang: Lang, key: TranslationKey): string {
  return dictionaries[lang][key] ?? key;
}

/** Хук перевода: const t = useT(); t('login.title') */
export function useT(): (key: TranslationKey) => string {
  const lang = useAppStore((s) => s.lang);
  return (key) => translate(lang, key);
}

const WEEKDAYS: Record<Lang, string[]> = {
  ru: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
  kz: ['Жс', 'Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб'],
};

/** Короткое название дня недели по ISO-дате ('2026-06-10' → 'Ср'). */
export function weekdayLabel(isoDate: string, lang: Lang): string {
  const day = new Date(`${isoDate}T12:00:00`).getDay();
  return WEEKDAYS[lang][day];
}

/** '2026-06-10' → '10.06.2026' */
export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}.${m}.${y}`;
}

/** '2026-06-10' → '10.06' */
export function formatDateShort(isoDate: string): string {
  const [, m, d] = isoDate.split('-');
  return `${d}.${m}`;
}

const MONTHS: Record<Lang, string[]> = {
  ru: [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
  ],
  kz: [
    'Қаңтар', 'Ақпан', 'Наурыз', 'Сәуір', 'Мамыр', 'Маусым',
    'Шілде', 'Тамыз', 'Қыркүйек', 'Қазан', 'Қараша', 'Желтоқсан',
  ],
};

/** '2026-05' → 'Май 2026'. */
export function monthLabel(period: string, lang: Lang): string {
  const [y, m] = period.split('-');
  return `${MONTHS[lang][parseInt(m, 10) - 1]} ${y}`;
}

/** Возраст с правильным склонением: 1 год, 4 года, 5 лет / 5 жас. */
export function formatAge(age: number, lang: Lang): string {
  if (lang === 'kz') return `${age} жас`;
  const mod10 = age % 10;
  const mod100 = age % 100;
  if (mod10 === 1 && mod100 !== 11) return `${age} год`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${age} года`;
  return `${age} лет`;
}
