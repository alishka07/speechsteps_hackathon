import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from '@/web/ui';

import { colors, radius, spacing } from '@/theme';

interface Props {
  label: string;
  /** Цвет текста; фон делается мягким автоматически, если bg не задан. */
  color?: string;
  bg?: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

/** Маленький тег/фильтр. С onPress работает как переключатель. */
export function Chip({ label, color = colors.teal, bg, selected, onPress, style }: Props) {
  const isButton = !!onPress;
  const background = selected ? color : (bg ?? softOf(color));
  const fg = selected ? colors.white : color;

  const content = (
    <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
      {label}
    </Text>
  );

  if (!isButton) {
    return (
      <span style={{ display: 'inline-flex', ...StyleSheet.flatten([styles.base, { backgroundColor: background }, style]) }}>
        {content}
      </span>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      aria-pressed={selected}
      style={({ pressed }) => [
        styles.base,
        styles.button,
        { backgroundColor: background },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

function softOf(color: string): string {
  switch (color) {
    case colors.orange:
      return colors.orangeSoft;
    case colors.purple:
      return colors.purpleSoft;
    case colors.navy:
      return colors.navySoft;
    case colors.danger:
      return colors.dangerSoft;
    case colors.success:
      return colors.successSoft;
    case colors.warning:
    case colors.gold:
      return colors.goldSoft;
    case colors.peach:
    case colors.peachDark:
      return colors.peachSoft;
    case colors.textMuted:
      return colors.border;
    default:
      return colors.tealSoft;
  }
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: spacing.lg,
  },
  label: { fontSize: 12.5, fontWeight: '700' },
});
