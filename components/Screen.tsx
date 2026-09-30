import React from 'react';
import { ScrollView, StyleSheet, View } from '@/web/ui';
import { useSafeAreaInsets } from '@/web/ui';

import { colors, spacing } from '@/theme';

interface Props {
  children: React.ReactNode;
  /** Прокручиваемый экран (по умолчанию да). */
  scroll?: boolean;
}

/** Обёртка экрана: фон, отступы и безопасные зоны. */
export function Screen({ children, scroll = true }: Props) {
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: insets.top + spacing.md,
    paddingBottom: spacing.xxl + insets.bottom,
    paddingHorizontal: spacing.lg,
  };

  if (!scroll) {
    return <View style={[styles.root, padding]}>{children}</View>;
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, padding]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { gap: spacing.lg },
});
