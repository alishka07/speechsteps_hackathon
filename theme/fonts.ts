import { TextStyle } from '@/web/ui';

/**
 * Шрифты как в веб-референсе: Nunito — дисплейный (заголовки, акценты),
 * Quicksand — основной текст. RN не синтезирует жирность кастомных
 * шрифтов, поэтому каждому весу соответствует своё семейство.
 */
export const FONTS = {
  display: {
    regular: 'Nunito_400Regular',
    semibold: 'Nunito_600SemiBold',
    bold: 'Nunito_700Bold',
    extrabold: 'Nunito_800ExtraBold',
  },
  body: {
    regular: 'Nunito_400Regular',
    medium: 'Nunito_500Medium',
    semibold: 'Nunito_600SemiBold',
    bold: 'Nunito_700Bold',
  },
} as const;

/** Дисплейное семейство (Nunito) по весу из стиля. */
export function display(weight: TextStyle['fontWeight'] = '700'): string {
  const w = Number(weight) || 700;
  if (w >= 800) return FONTS.display.extrabold;
  if (w >= 700) return FONTS.display.bold;
  if (w >= 600) return FONTS.display.semibold;
  return FONTS.display.regular;
}

/** Текстовое семейство (Quicksand) по весу из стиля. */
export function body(weight: TextStyle['fontWeight'] = '400'): string {
  const w = Number(weight) || 400;
  if (w >= 700) return FONTS.body.bold;
  if (w >= 600) return FONTS.body.semibold;
  if (w >= 500) return FONTS.body.medium;
  return FONTS.body.regular;
}
