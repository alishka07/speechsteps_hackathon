import { Ionicons } from '@/web/Icon';
import React from 'react';
import { StyleSheet, Text, View } from '@/web/ui';

import { colors, display, radius, spacing } from '@/theme';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  color?: string;
  bg?: string;
}

/** Плитка статистики: иконка, крупное значение, подпись. */
export function StatTile({ icon, value, label, color = colors.teal, bg = colors.tealSoft }: Props) {
  return (
    <View style={[styles.tile, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 4,
  },
  value: { fontSize: 20, fontWeight: '800', fontFamily: display('800'), color: colors.navy },
  label: { fontSize: 12, color: colors.textSecondary },
});
