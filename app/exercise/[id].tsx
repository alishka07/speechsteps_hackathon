import { Ionicons } from '@/web/Icon';
import { useLocalSearchParams } from '@/web/router';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from '@/web/ui';

import { ai, PronunciationResult } from '@/ai';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { ScoreBadge } from '@/components/ScoreBadge';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { EXERCISES } from '@/data/exercises';
import { useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { useAppStore } from '@/store/useAppStore';
import { colors, display, radius, spacing, typography } from '@/theme';
import { CATEGORY_META } from '@/theme/categories';

/** Пример слова для демо-проверки по фокус-звуку. */
const SAMPLE_WORD: Record<string, string> = {
  Р: 'рыба',
  Л: 'лодка',
  С: 'сова',
  Ш: 'шапка',
  Ж: 'жук',
  З: 'зонт',
};

/** Детали упражнения из библиотеки. */
export default function ExerciseDetailScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const customExercises = useAppStore((s) => s.customExercises);

  const exercise = [...customExercises, ...EXERCISES].find((e) => e.id === id);

  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [poseHold, setPoseHold] = useState<number | null>(null);

  if (!exercise) {
    return (
      <Screen>
        <ScreenHeader title={t('exercise.notFound')} back />
      </Screen>
    );
  }

  const meta = CATEGORY_META[exercise.category];
  const sampleWord = (exercise.focusSound && SAMPLE_WORD[exercise.focusSound]) || 'мама';

  const checkPronunciation = async () => {
    setChecking(true);
    setResult(null);
    const r = await ai.scorePronunciation(sampleWord);
    setResult(r);
    setChecking(false);
    haptics.tap();
  };

  const checkPose = async () => {
    setChecking(true);
    setPoseHold(null);
    const r = await ai.scorePose();
    setPoseHold(r.hold);
    setChecking(false);
    haptics.tap();
  };

  return (
    <Screen>
      <ScreenHeader title={exercise.title} back />

      <Card style={styles.hero}>
        <View style={[styles.emojiBox, { backgroundColor: meta.bg }]}>
          <Text style={styles.emoji}>{exercise.emoji}</Text>
        </View>
        <View style={styles.tags}>
          <Chip label={t(`category.${exercise.category}`)} color={meta.color} />
          {exercise.focusSound ? (
            <Chip label={`${t('library.sound')} ${exercise.focusSound}`} color={colors.navy} />
          ) : null}
          <Chip
            label={`${exercise.durationMin} ${t('common.min')}`}
            color={colors.teal}
          />
        </View>
        <Text style={styles.description}>{exercise.description}</Text>
      </Card>

      <Card style={styles.section}>
        <View style={styles.sectionTitle}>
          <Ionicons name="happy-outline" size={18} color={colors.teal} />
          <Text style={typography.h3}>{t('exercise.instruction')}</Text>
        </View>
        <Text style={styles.instruction}>{exercise.instruction}</Text>
      </Card>

      {exercise.wordCards && exercise.wordCards.length > 0 ? (
        <Card style={styles.section}>
          <View style={styles.sectionTitle}>
            <Ionicons name="images-outline" size={18} color={colors.peach} />
            <Text style={typography.h3}>{t('exercise.words')}</Text>
          </View>
          <View style={styles.wordGrid}>
            {exercise.wordCards.map((w) => (
              <View key={w.word} style={styles.wordCard}>
                <Text style={styles.wordEmoji}>{w.emoji}</Text>
                <Text style={styles.wordText}>{w.word}</Text>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      {exercise.parentNotes ? (
        <Card style={styles.section}>
          <View style={styles.sectionTitle}>
            <Ionicons name="heart-outline" size={18} color={colors.orange} />
            <Text style={typography.h3}>{t('exercise.parentNotes')}</Text>
          </View>
          <Text style={styles.instruction}>{exercise.parentNotes}</Text>
        </Card>
      ) : null}

      {exercise.vision ? (
        /* Демо computer-vision: удержание позы (MediaPipe FaceMesh/Hands) */
        <Card style={[styles.section, styles.aiCard]}>
          <View style={styles.sectionTitle}>
            <Ionicons name="videocam" size={18} color={colors.purple} />
            <Text style={[typography.h3, { color: colors.purple }]}>{t('exercise.cvTitle')}</Text>
          </View>
          <Text style={styles.checkHint}>{t('exercise.cvHint')}</Text>

          <View style={styles.cameraStub}>
            <Ionicons name="scan-outline" size={40} color={colors.purple} />
            <Text style={styles.cameraStubText}>{t('exercise.cvPreview')}</Text>
          </View>

          {poseHold != null ? (
            <View style={styles.resultBox}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>{t('exercise.cvHold')}:</Text>
                <View style={styles.flexSpacer} />
                <ScoreBadge score={poseHold} />
              </View>
            </View>
          ) : null}

          <Pressable
            onPress={checkPose}
            disabled={checking}
            style={({ pressed }) => [styles.checkBtn, pressed && { opacity: 0.85 }]}
          >
            {checking ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="videocam" size={18} color={colors.white} />
                <Text style={styles.checkBtnText}>{t('exercise.cvRun')}</Text>
              </>
            )}
          </Pressable>
        </Card>
      ) : (
        /* Демо ИИ-распознавания произношения */
        <Card style={[styles.section, styles.aiCard]}>
          <View style={styles.sectionTitle}>
            <Ionicons name="sparkles" size={18} color={colors.purple} />
            <Text style={[typography.h3, { color: colors.purple }]}>{t('exercise.checkTitle')}</Text>
          </View>
          <Text style={styles.checkHint}>{t('exercise.checkHint')}</Text>
          <View style={styles.checkWordRow}>
            <Text style={styles.checkWordLabel}>{t('exercise.checkWord')}:</Text>
            <Text style={styles.checkWord}>{sampleWord}</Text>
          </View>

          {result ? (
            <View style={styles.resultBox}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>{t('child.colRecognized')}:</Text>
                <Text style={styles.resultWord}>{result.recognizedWord}</Text>
                <ScoreBadge score={result.score} />
              </View>
            </View>
          ) : null}

          <Pressable
            onPress={checkPronunciation}
            disabled={checking}
            style={({ pressed }) => [styles.checkBtn, pressed && { opacity: 0.85 }]}
          >
            {checking ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="mic" size={18} color={colors.white} />
                <Text style={styles.checkBtnText}>{t('exercise.checkRun')}</Text>
              </>
            )}
          </Pressable>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.md, alignItems: 'flex-start' },
  emojiBox: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 38 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  description: { fontSize: 14.5, color: colors.textSecondary, lineHeight: 21 },
  section: { gap: spacing.md },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  instruction: { fontSize: 15, color: colors.navy, lineHeight: 22 },
  wordGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  wordCard: {
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.peachSoft,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minWidth: 92,
  },
  wordEmoji: { fontSize: 40 },
  wordText: { fontSize: 15, fontWeight: '700', color: colors.navy },
  aiCard: { backgroundColor: colors.purpleSoft },
  checkHint: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  checkWordRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkWordLabel: { fontSize: 14, color: colors.textSecondary },
  checkWord: { fontSize: 18, fontWeight: '800', color: colors.navy },
  cameraStub: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.purple,
    borderStyle: 'dashed',
    paddingVertical: spacing.xl,
  },
  cameraStubText: { fontSize: 13, color: colors.textSecondary },
  flexSpacer: { flex: 1 },
  resultBox: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  resultLabel: { fontSize: 14, color: colors.textSecondary },
  resultWord: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.navy, fontStyle: 'italic' },
  checkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.purple,
    borderRadius: radius.full,
    paddingVertical: 13,
    minHeight: 48,
  },
  checkBtnText: { fontSize: 15, fontWeight: '700', fontFamily: display('700'), color: colors.white },
});
