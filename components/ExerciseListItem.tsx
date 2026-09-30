import { Ionicons } from '@/web/Icon';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from '@/web/ui';

import { Chip } from '@/components/Chip';
import { Exercise } from '@/data/types';
import { useT } from '@/i18n';
import { colors, radius, shadows, spacing } from '@/theme';
import { CATEGORY_META } from '@/theme/categories';

interface Props {
  exercise: Exercise;
  onPress?: () => void;
  /** Элемент справа (стрелка, кнопка добавления и т.п.). */
  right?: React.ReactNode;
}

/** Карточка упражнения для библиотеки и списков выбора. */
export function ExerciseListItem({ exercise, onPress, right }: Props) {
  const t = useT();
  const meta = CATEGORY_META[exercise.category];

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.emojiBox, { backgroundColor: meta.bg }]}>
        <Text style={styles.emoji}>{exercise.emoji}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {exercise.title}
        </Text>
        <View style={styles.tags}>
          <Chip label={t(`category.${exercise.category}`)} color={meta.color} />
          {exercise.focusSound ? (
            <Chip label={`${t('library.sound')} ${exercise.focusSound}`} color={colors.navy} />
          ) : null}
          {exercise.vision ? <Chip label={`📷 ${t('library.cv')}`} color={colors.purple} /> : null}
        </View>
        <Text style={styles.duration}>
          <Ionicons name="time-outline" size={12} color={colors.textMuted} />{' '}
          {exercise.durationMin} {t('common.min')}
        </Text>
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.card,
  },
  emojiBox: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 26 },
  info: { flex: 1, gap: 5 },
  title: { fontSize: 15, fontWeight: '700', color: colors.navy },
  tags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  duration: { fontSize: 12, color: colors.textMuted },
});
