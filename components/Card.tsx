import React from 'react';
import { StyleSheet, View, ViewProps } from '@/web/ui';

import { colors, radius, shadows, spacing } from '@/theme';

/** Белая карточка со скруглением и мягкой тенью. */
export function Card({ style, children, ...rest }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.card,
  },
});
