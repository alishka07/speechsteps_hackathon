import { Ionicons } from '@/web/Icon';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from '@/web/ui';

import { colors, display, radius, spacing } from '@/theme';

type Variant = 'primary' | 'ai' | 'orange' | 'outline' | 'ghost';

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

const BG: Record<Variant, string> = {
  primary: colors.teal,
  ai: colors.purple,
  orange: colors.orange,
  outline: colors.card,
  ghost: 'transparent',
};

// Параметры свечения (цвет задаётся под цвет кнопки в рантайме).
const glow = {
  shadowOpacity: 0.35,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 4 },
  elevation: 4,
} as const;

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
}: Props) {
  const isFilled = variant === 'primary' || variant === 'ai' || variant === 'orange';
  const fg = isFilled ? colors.white : variant === 'ghost' ? colors.textSecondary : colors.navy;
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: BG[variant] },
        // Мягкое цветное свечение под залитыми кнопками (--shadow-glow-* референса).
        isFilled && !inactive && { shadowColor: BG[variant], ...glow },
        variant === 'outline' && styles.outline,
        pressed && styles.pressed,
        inactive && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={fg} style={styles.icon} /> : null}
          <Text style={[styles.label, { color: fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
    minHeight: 50,
  },
  outline: {
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.55 },
  icon: { marginRight: spacing.sm },
  label: { fontSize: 16, fontWeight: '700', fontFamily: display('700') },
});
