import { TextStyle, ViewStyle } from '@/web/ui';

import { display } from './fonts';

export { FONTS, display, body } from './fonts';

/**
 * Палитра выровнена под веб-референс speech-steps (его HSL-токены,
 * сконвертированные в hex): тёплый off-white фон, мягкое трио
 * бирюза / коралл / лаванда и десатурированный грифельный текст.
 */
export const colors = {
  bg: '#FCFBF7', // --background 40 33% 98%
  card: '#FFFFFF', // --card 0 0% 100%

  // Грифельный «foreground» (--foreground 220 20% 20%). Раньше был navy:
  // ключ оставлен, чтобы перекрасить весь текст и фирменный цвет клиники.
  navy: '#29303D',
  // Коралл (--secondary 15 85% 65%) — вторичный акцент.
  orange: '#F2805A',
  // Бирюза (--primary 168 65% 45%) — основной цвет.
  teal: '#28BD9F',
  // Лаванда (--accent 260 60% 70%).
  purple: '#A385E0',
  /** Коралловый акцент родительских экранов (= secondary). */
  peach: '#F2805A',
  peachSoft: '#FCE2D9',
  /** Тёмный коралл: активные состояния и текст на белом (контраст AA). */
  peachDark: '#C2562F',

  text: '#29303D', // --foreground
  // --muted-foreground, затемнены до контраста WCAG AA на белом.
  textSecondary: '#565D6E',
  textMuted: '#7E8494',

  border: '#E7E2DA', // --border 40 20% 88%
  inputBg: '#FAF7F1',

  tealSoft: '#DCF7F1', // --primary-light 168 65% 92%
  orangeSoft: '#FCE2D9', // --secondary-light 15 85% 92%
  purpleSoft: '#E7DEF7', // --accent-light 260 60% 92%
  navySoft: '#E7E9EE',

  success: '#28BD66', // --success 145 60% 45%
  warning: '#ED9F1A', // --warning 38 92% 55% (затемнён для AA)
  danger: '#DD4B4B', // --destructive 0 70% 55%
  /** Золото для XP-наград (--coins 45 100% 50%). */
  gold: '#F5B400',
  goldSoft: '#FCF1CF',
  successSoft: '#D6F5E3', // --success-light 145 60% 90%
  warningSoft: '#FDECCE', // --warning-light 38 92% 90%
  dangerSoft: '#F9DCDC',

  white: '#FFFFFF',
};

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 26,
  full: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

// --shadow-md референса: мягкая грифельная тень.
export const shadows: { card: ViewStyle } = {
  card: {
    shadowColor: '#29303D',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
};

export const typography: Record<string, TextStyle> = {
  h1: { fontSize: 26, fontWeight: '800', fontFamily: display('800'), color: colors.navy, letterSpacing: 0.2 },
  h2: { fontSize: 20, fontWeight: '700', fontFamily: display('700'), color: colors.navy },
  h3: { fontSize: 16, fontWeight: '700', fontFamily: display('700'), color: colors.navy },
  body: { fontSize: 15, color: colors.navy },
  secondary: { fontSize: 13, color: colors.textSecondary },
  caption: { fontSize: 12, color: colors.textMuted },
};

/** Цвет для оценки произношения: зелёный / жёлтый / красный. */
export function scoreColor(score: number): { fg: string; bg: string } {
  if (score >= 80) return { fg: colors.success, bg: colors.successSoft };
  if (score >= 55) return { fg: colors.warning, bg: colors.warningSoft };
  return { fg: colors.danger, bg: colors.dangerSoft };
}
