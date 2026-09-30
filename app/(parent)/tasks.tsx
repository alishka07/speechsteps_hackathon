import { Ionicons } from '@/web/Icon';
import React, { useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from '@/web/ui';

import { AppButton } from '@/components/AppButton';
import { Card } from '@/components/Card';
import { ChildSwitcher } from '@/components/ChildSwitcher';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { EXERCISES } from '@/data/exercises';
import { Exercise, Lesson } from '@/data/types';
import { formatDate, useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, spacing, typography } from '@/theme';

// Плавная анимация раскрытия списка (в New Architecture включена по умолчанию).
const animate = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

/** Родитель, экран 2: задания — уроки, назначенные логопедом. */
export default function ParentTasksScreen() {
  const t = useT();
  const parentChildId = useAppStore((s) => s.parentChildId);
  const lessons = useAppStore((s) => s.lessons);
  const customExercises = useAppStore((s) => s.customExercises);

  const childLessons = useMemo(
    () => lessons.filter((l) => l.childId === parentChildId),
    [lessons, parentChildId],
  );
  const allExercises = useMemo(() => [...customExercises, ...EXERCISES], [customExercises]);

  return (
    <Screen>
      <ScreenHeader title={t('parent.tasksTitle')} subtitle={t('parent.tasksSubtitle')} />
      <ChildSwitcher />

      {childLessons.length === 0 ? (
        <EmptyState icon="checkbox-outline" text={t('parent.noTasks')} />
      ) : (
        childLessons.map((lesson) => (
          <LessonCard key={lesson.id} lesson={lesson} allExercises={allExercises} />
        ))
      )}
    </Screen>
  );
}

function LessonCard({ lesson, allExercises }: { lesson: Lesson; allExercises: Exercise[] }) {
  const t = useT();
  const lessonProgress = useAppStore((s) => s.lessonProgress);
  const toggleExerciseDone = useAppStore((s) => s.toggleExerciseDone);

  const [expanded, setExpanded] = useState(false);
  // Подтверждение «Я рядом» — на время сеанса, не персистится.
  const [parentPresent, setParentPresent] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  const exercises = lesson.exerciseIds
    .map((id) => allExercises.find((e) => e.id === id))
    .filter((e): e is Exercise => !!e);
  const done = lessonProgress[lesson.id] ?? [];
  const doneCount = exercises.filter((e) => done.includes(e.id)).length;
  const xpReward = exercises.length * 10;

  const onToggle = (exercise: Exercise, isDone: boolean) => {
    toggleExerciseDone(lesson.id, exercise.id);
    if (!isDone) haptics.tap();
    // Завершили последнее упражнение — празднуем (терапевтический позитив).
    if (!isDone && doneCount + 1 === exercises.length && exercises.length > 0) {
      setCelebrate(true);
      haptics.success();
    }
  };

  // Статус урока: выполнен / просрочен (>7 дней) / в процессе / не начат.
  const allDone = exercises.length > 0 && doneCount === exercises.length;
  const ageDays = (Date.now() - new Date(`${lesson.createdAt}T00:00:00`).getTime()) / 86_400_000;
  const status = allDone
    ? { label: t('parent.statusDone'), color: colors.success }
    : ageDays > 7
      ? { label: t('parent.statusOverdue'), color: colors.danger }
      : doneCount > 0
        ? { label: t('parent.statusInProgress'), color: colors.orange }
        : { label: t('parent.statusNotStarted'), color: colors.navy };

  return (
    <Card style={styles.lessonCard}>
      <Pressable
        onPress={() => {
          animate();
          setExpanded((v) => !v);
        }}
        style={styles.lessonHead}
      >
        <View style={styles.lessonInfo}>
          <Text style={styles.lessonTitle}>{lesson.title}</Text>
          <View style={styles.lessonMetaRow}>
            <Text style={styles.lessonMeta}>{formatDate(lesson.createdAt)}</Text>
            <Chip label={status.label} color={status.color} />
          </View>
        </View>
        <Chip
          label={`${doneCount}/${exercises.length}`}
          color={allDone ? colors.success : colors.orange}
        />
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textMuted}
        />
      </Pressable>

      <ProgressBar
        value={exercises.length > 0 ? (doneCount / exercises.length) * 100 : 0}
        color={colors.teal}
      />

      {expanded ? (
        <View style={styles.body}>
          {/* Тогл присутствия родителя */}
          <View style={[styles.presenceRow, parentPresent && styles.presenceRowOn]}>
            <Ionicons
              name={parentPresent ? 'lock-open-outline' : 'lock-closed-outline'}
              size={18}
              color={parentPresent ? colors.teal : colors.textSecondary}
            />
            <Text style={[styles.presenceText, parentPresent && { color: colors.teal }]}>
              {t('parent.imHere')}
            </Text>
            <Switch
              value={parentPresent}
              onValueChange={setParentPresent}
              trackColor={{ false: colors.border, true: colors.tealSoft }}
              thumbColor={parentPresent ? colors.teal : colors.card}
            />
          </View>

          {exercises.map((exercise) => {
            const isDone = done.includes(exercise.id);
            const locked = !!exercise.requiresParent && !parentPresent;
            return (
              <Pressable
                key={exercise.id}
                disabled={locked}
                onPress={() => onToggle(exercise, isDone)}
                style={({ pressed }) => [
                  styles.exRow,
                  locked && styles.exRowLocked,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={[styles.exEmoji, locked && styles.dimmed]}>{exercise.emoji}</Text>
                <View style={styles.exInfo}>
                  <Text style={[styles.exTitle, locked && styles.dimmed]} numberOfLines={1}>
                    {exercise.title}
                  </Text>
                  {locked ? (
                    <View style={styles.lockRow}>
                      <Ionicons name="lock-closed" size={11} color={colors.textMuted} />
                      <Text style={styles.lockText}>{t('parent.needParent')}</Text>
                    </View>
                  ) : (
                    <Text style={[styles.exStatus, isDone && styles.exStatusDone]}>
                      {isDone ? t('parent.statusDone') : t('parent.statusNotStarted')}
                    </Text>
                  )}
                </View>
                {locked ? (
                  <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
                ) : (
                  <Ionicons
                    name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={isDone ? colors.success : colors.border}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* Празднование завершения урока */}
      <Modal visible={celebrate} transparent animationType="fade" onRequestClose={() => setCelebrate(false)}>
        <View style={styles.celebrateOverlay}>
          <Card style={styles.celebrateCard}>
            <Text style={styles.celebrateEmoji}>🎉</Text>
            <Text style={typography.h2}>{t('parent.lessonDoneTitle')}</Text>
            <View style={styles.xpBig}>
              <Ionicons name="star" size={18} color={colors.gold} />
              <Text style={styles.xpBigText}>+{xpReward} XP</Text>
            </View>
            <Text style={styles.celebrateBody}>{t('parent.lessonDoneBody')}</Text>
            <AppButton title={t('common.close')} onPress={() => setCelebrate(false)} />
          </Card>
        </View>
      </Modal>
    </Card>
  );
}

const styles = StyleSheet.create({
  lessonCard: { gap: spacing.md },
  lessonHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  lessonInfo: { flex: 1, gap: 4 },
  lessonTitle: { fontSize: 15.5, fontWeight: '700', color: colors.navy },
  lessonMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  lessonMeta: { fontSize: 12, color: colors.textSecondary },
  body: { gap: spacing.sm },

  presenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.inputBg,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presenceRowOn: { backgroundColor: colors.tealSoft, borderColor: colors.teal },
  presenceText: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.textSecondary },

  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.inputBg,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  exRowLocked: { opacity: 0.75 },
  exEmoji: { fontSize: 22 },
  exInfo: { flex: 1, gap: 3 },
  exTitle: { fontSize: 14, fontWeight: '700', color: colors.navy },
  exStatus: { fontSize: 12, color: colors.textMuted },
  exStatusDone: { color: colors.success, fontWeight: '700' },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lockText: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic' },
  dimmed: { opacity: 0.6 },
  celebrateOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 42, 110, 0.45)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  celebrateCard: { alignItems: 'center', gap: spacing.md },
  celebrateEmoji: { fontSize: 56 },
  xpBig: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.goldSoft,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  xpBigText: { fontSize: 18, fontWeight: '800', color: colors.gold },
  celebrateBody: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
