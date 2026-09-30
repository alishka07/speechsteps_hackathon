import React from 'react';
import { Pressable, StyleSheet, Text, View } from '@/web/ui';

import type { Lang } from '@/i18n';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius } from '@/theme';

const LANGS: Lang[] = ['ru', 'kz'];

/** Переключатель языка RU / KZ. */
export function LangSwitch() {
  const lang = useAppStore((s) => s.lang);
  const setLang = useAppStore((s) => s.setLang);

  return (
    <View style={styles.wrap}>
      {LANGS.map((l) => {
        const active = l === lang;
        return (
          <Pressable
            key={l}
            onPress={() => setLang(l)}
            style={[styles.pill, active && styles.pillActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{l.toUpperCase()}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: radius.full,
    padding: 3,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  pillActive: { backgroundColor: colors.card },
  label: { fontSize: 12, fontWeight: '800', color: colors.textMuted },
  labelActive: { color: colors.navy },
});
