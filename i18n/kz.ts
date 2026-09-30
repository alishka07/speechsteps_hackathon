import { ru, TranslationKey } from './ru';

/**
 * Казахская локализация — пока заглушка: используем русские строки.
 * Когда появятся переводы, достаточно заменить значения по ключам —
 * структура полностью совпадает с ru.ts.
 */
export const kz: Record<TranslationKey, string> = {
  ...ru,
  appName: 'SpeechSteps',
  'tabs.clients': 'Клиенттер',
  'tabs.builder': 'Конструктор',
  'tabs.library': 'Кітапхана',
  'tabs.profile': 'Профиль',
  'role.child': 'Бала',
  'role.childDesc': '«Жаңғырық аралы» ойынын ойнап, дыбыстарды жаттық.',
  'role.play': 'Ойнау',
};
