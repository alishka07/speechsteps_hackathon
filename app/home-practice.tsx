import { Ionicons } from '@/web/Icon';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from '@/web/ui';

import { AppButton } from '@/components/AppButton';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { HOME_CATEGORIES, HOME_EXERCISES, HomeCategory, HomeExercise, formatTimer } from '@/data/homePractice';
import { useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { colors, display, radius, spacing, typography } from '@/theme';
import { CATEGORY_META } from '@/theme/categories';

/** Домашняя практика родителя: простые упражнения с таймером, без оценки. */
export default function HomePracticeScreen() {
  const t = useT();
  const [category, setCategory] = useState<HomeCategory | null>(null);
  const [active, setActive] = useState<HomeExercise | null>(null);
  const [doneIds, setDoneIds] = useState<string[]>([]);

  const exercises = useMemo(
    () => HOME_EXERCISES.filter((e) => !category || e.category === category),
    [category],
  );

  return (
    <Screen>
      <ScreenHeader title={t('home.title')} subtitle={t('home.subtitle')} back />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        <Chip
          label={t('library.all')}
          color={colors.peachDark}
          selected={category === null}
          onPress={() => setCategory(null)}
        />
        {HOME_CATEGORIES.map((c) => (
          <Chip
            key={c}
            label={t(`category.${c}`)}
            color={CATEGORY_META[c].color}
            selected={category === c}
            onPress={() => setCategory(category === c ? null : c)}
          />
        ))}
      </ScrollView>

      {exercises.map((ex) => {
        const meta = CATEGORY_META[ex.category];
        const done = doneIds.includes(ex.id);
        return (
          <Pressable key={ex.id} onPress={() => setActive(ex)} style={({ pressed }) => pressed && { opacity: 0.9 }}>
            <Card style={styles.card}>
              <View style={[styles.emojiBox, { backgroundColor: meta.bg }]}>
                <Text style={styles.emoji}>{ex.emoji}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{ex.name}</Text>
                <View style={styles.tags}>
                  <Chip label={t(`category.${ex.category}`)} color={meta.color} />
                  {ex.fromTherapist ? <Chip label={t('home.fromTherapist')} color={colors.purple} /> : null}
                </View>
                <Text style={styles.meta}>
                  <Ionicons name="time-outline" size={12} color={colors.textMuted} /> {formatTimer(ex.durationSec)} ·{' '}
                  {ex.steps.length} {t('home.stepsShort')}
                </Text>
              </View>
              {done ? (
                <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              ) : (
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              )}
            </Card>
          </Pressable>
        );
      })}

      <PracticeModal
        exercise={active}
        onClose={() => setActive(null)}
        onDone={(id) => setDoneIds((prev) => (prev.includes(id) ? prev : [...prev, id]))}
      />
    </Screen>
  );
}

function PracticeModal({
  exercise,
  onClose,
  onDone,
}: {
  exercise: HomeExercise | null;
  onClose: () => void;
  onDone: (id: string) => void;
}) {
  const t = useT();
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Сброс при смене упражнения.
  useEffect(() => {
    setRemaining(exercise?.durationSec ?? 0);
    setRunning(false);
    setCompleted(false);
  }, [exercise]);

  // Тикаем, пока запущено.
  useEffect(() => {
    if (!running) return;
    timer.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (timer.current) clearInterval(timer.current);
          setRunning(false);
          setCompleted(true);
          haptics.success();
          if (exercise) onDone(exercise.id);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [running, exercise, onDone]);

  const reset = () => {
    setRemaining(exercise?.durationSec ?? 0);
    setRunning(false);
    setCompleted(false);
  };

  return (
    <Modal visible={!!exercise} animationType="slide" onRequestClose={onClose}>
      <Screen>
        <ScreenHeader title={exercise?.name ?? ''} />
        {exercise ? (
          <>
            {/* Шаги */}
            <Card style={styles.section}>
              <Text style={typography.h3}>{t('home.steps')}</Text>
              {exercise.steps.map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </Card>

            {/* Таймер — без оценки, просто отработка */}
            <Card style={styles.timerCard}>
              {completed ? (
                <>
                  <Text style={styles.bigEmoji}>🎉</Text>
                  <Text style={typography.h2}>{t('home.doneTitle')}</Text>
                  <Text style={styles.doneHint}>{t('home.doneHint')}</Text>
                </>
              ) : (
                <Text style={styles.timer}>{formatTimer(remaining)}</Text>
              )}

              <View style={styles.controls}>
                {!completed ? (
                  <AppButton
                    title={running ? t('home.pause') : t('home.start')}
                    icon={running ? 'pause' : 'play'}
                    variant="primary"
                    onPress={() => setRunning((v) => !v)}
                    style={styles.ctrlBtn}
                  />
                ) : null}
                <AppButton
                  title={t('home.reset')}
                  icon="refresh"
                  variant="outline"
                  onPress={reset}
                  style={styles.ctrlBtn}
                />
              </View>
            </Card>

            <AppButton title={t('common.close')} variant="ghost" onPress={onClose} />
          </>
        ) : null}
      </Screen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  filters: { gap: spacing.sm, paddingVertical: 2 },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emojiBox: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 26 },
  info: { flex: 1, gap: 5 },
  name: { fontSize: 15, fontWeight: '700', color: colors.navy },
  tags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  meta: { fontSize: 12, color: colors.textMuted },
  section: { gap: spacing.md },
  stepRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.peachSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { fontSize: 13, fontWeight: '800', color: colors.peachDark, fontFamily: display('800') },
  stepText: { flex: 1, fontSize: 15, color: colors.navy, lineHeight: 22 },
  timerCard: { alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.xl },
  timer: { fontSize: 64, fontWeight: '800', color: colors.navy, fontFamily: display('800') },
  bigEmoji: { fontSize: 56 },
  doneHint: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  controls: { flexDirection: 'row', gap: spacing.md, alignSelf: 'stretch' },
  ctrlBtn: { flex: 1 },
});
