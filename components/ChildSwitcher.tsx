import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from '@/web/ui';

import { useAppStore } from '@/store/useAppStore';
import { colors, radius } from '@/theme';

interface Props {
  /** Светлый вариант для цветной шапки. */
  onLight?: boolean;
}

/** Переключатель ребёнка в родительском кабинете. */
export function ChildSwitcher({ onLight }: Props) {
  const children = useAppStore((s) => s.children);
  const parentChildId = useAppStore((s) => s.parentChildId);
  const setParentChildId = useAppStore((s) => s.setParentChildId);

  if (children.length <= 1) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {children.map((c) => {
        const active = c.id === parentChildId;
        return (
          <Pressable
            key={c.id}
            onPress={() => setParentChildId(c.id)}
            style={[
              styles.pill,
              onLight ? styles.pillLight : styles.pillDark,
              active && (onLight ? styles.pillLightActive : styles.pillDarkActive),
            ]}
          >
            <Text
              style={[
                styles.label,
                onLight ? styles.labelLight : styles.labelDark,
                active && (onLight ? styles.labelActiveOnLight : styles.labelActiveOnDark),
              ]}
            >
              {c.name.split(' ')[0]}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 2 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  pillLight: { backgroundColor: 'rgba(255,255,255,0.35)' },
  pillLightActive: { backgroundColor: colors.white },
  pillDark: { backgroundColor: colors.border },
  pillDarkActive: { backgroundColor: colors.navy },
  label: { fontSize: 13, fontWeight: '700' },
  labelLight: { color: colors.white },
  labelDark: { color: colors.textSecondary },
  labelActiveOnLight: { color: colors.navy },
  labelActiveOnDark: { color: colors.white },
});
