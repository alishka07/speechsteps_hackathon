import { useLocalSearchParams, useRouter } from '@/web/router';
import React from 'react';
import { StyleSheet, Text, View } from '@/web/ui';

import { Card } from '@/components/Card';
import { ExerciseListItem } from '@/components/ExerciseListItem';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { EXERCISES } from '@/data/exercises';
import { formatDate, useT } from '@/i18n';
import { useAppStore } from '@/store/useAppStore';
import { colors, spacing, typography } from '@/theme';

/** Просмотр сохранённого урока. */
export default function LessonDetailScreen() {
  const t = useT();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const lesson = useAppStore((s) => s.lessons.find((l) => l.id === id));
  const customExercises = useAppStore((s) => s.customExercises);
  const allExercises = [...customExercises, ...EXERCISES];

  if (!lesson) {
    return (
      <Screen>
        <ScreenHeader title={t('lesson.notFound')} back />
      </Screen>
    );
  }

  const exercises = lesson.exerciseIds
    .map((exId) => allExercises.find((e) => e.id === exId))
    .filter((e): e is NonNullable<typeof e> => !!e);

  return (
    <Screen>
      <ScreenHeader title={lesson.title} subtitle={formatDate(lesson.createdAt)} back />

      <Card style={styles.goalCard}>
        <Text style={styles.goalLabel}>{t('lesson.goal')}</Text>
        <Text style={styles.goalText}>{lesson.goal}</Text>
      </Card>

      <Text style={typography.h2}>
        {t('lesson.exercises')} ({exercises.length})
      </Text>

      <View style={styles.list}>
        {exercises.map((e) => (
          <ExerciseListItem
            key={e.id}
            exercise={e}
            onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: e.id } })}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  goalCard: { gap: spacing.sm },
  goalLabel: { fontSize: 12, fontWeight: '800', color: colors.purple, letterSpacing: 1, textTransform: 'uppercase' },
  goalText: { fontSize: 15, color: colors.navy, lineHeight: 21 },
  list: { gap: spacing.md },
});
