import { Ionicons } from '@/web/Icon';
import React from 'react';
import { StyleSheet, Text, View } from '@/web/ui';

import { colors, spacing } from '@/theme';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  text: string;
}

export function EmptyState({ icon = 'leaf-outline', text }: Props) {
  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={32} color={colors.textMuted} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  text: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
});
