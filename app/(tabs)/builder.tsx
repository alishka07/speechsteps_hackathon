import { Ionicons } from '@/web/Icon';
import { useRouter } from '@/web/router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from '@/web/ui';

import { ai } from '@/ai';
import { AppButton } from '@/components/AppButton';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { ExerciseListItem } from '@/components/ExerciseListItem';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { WorldGamesCard } from '@/components/WorldGamesCard';
import { EXERCISES } from '@/data/exercises';
import { SOUND_STATS } from '@/data/parent';
import { buildStageLesson, buildTherapyPath } from '@/data/therapyPaths';
import { Exercise } from '@/data/types';
import { formatDate, useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { newId, useAppStore } from '@/store/useAppStore';
import { colors, radius, spacing, typography } from '@/theme';
import { CATEGORY_META } from '@/theme/categories';

/** Экран 3: ИИ-конструктор урока. */
export default function BuilderScreen() {
  const t = useT();
  const router = useRouter();
  const lessons = useAppStore((s) => s.lessons);
  const addLesson = useAppStore((s) => s.addLesson);
  const customExercises = useAppStore((s) => s.customExercises);
  const children = useAppStore((s) => s.children);

  const allExercises = useMemo(() => [...customExercises, ...EXERCISES], [customExercises]);
  const byId = (id: string) => allExercises.find((e) => e.id === id);

  const [goal, setGoal] = useState('');
  const [generating, setGenerating] = useState(false);
  const [planTitle, setPlanTitle] = useState('');
  const [rationale, setRationale] = useState('');
  const [planIds, setPlanIds] = useState<string[] | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [stageChildId, setStageChildId] = useState(children[0]?.id ?? '');

  const stageChild = children.find((c) => c.id === stageChildId);
  const path = stageChild ? buildTherapyPath(stageChild.diagnoses) : [];

  /** Самый слабый звук ребёнка — фокус для звуковых этапов. */
  const weakestSound = (childId: string): string | undefined => {
    const stats = SOUND_STATS[childId] ?? [];
    if (stats.length === 0) return undefined;
    return [...stats].sort((a, b) => a.accuracy - b.accuracy)[0].sound;
  };

  const genFromStage = (stageIndex: number) => {
    const step = path[stageIndex];
    if (!step) return;
    const lesson = buildStageLesson(step.stage, allExercises, weakestSound(stageChildId));
    setPlanTitle(lesson.title);
    setRationale(lesson.rationale);
    setPlanIds(lesson.exerciseIds);
    haptics.success();
  };

  const generate = async () => {
    if (!goal.trim()) {
      Alert.alert(t('builder.title'), t('builder.emptyGoal'));
      return;
    }
    setGenerating(true);
    setPlanIds(null);
    const plan = await ai.generateLessonPlan(goal);
    setPlanTitle(plan.title);
    setRationale(plan.rationale);
    setPlanIds(plan.exerciseIds);
    setGenerating(false);
  };

  const move = (index: number, dir: -1 | 1) => {
    setPlanIds((ids) => {
      if (!ids) return ids;
      const next = [...ids];
      const j = index + dir;
      if (j < 0 || j >= next.length) return ids;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const remove = (index: number) => {
    setPlanIds((ids) => (ids ? ids.filter((_, i) => i !== index) : ids));
  };

  const addExercise = (id: string) => {
    setPlanIds((ids) => (ids && !ids.includes(id) ? [...ids, id] : ids));
    setPickerOpen(false);
  };

  const save = () => {
    if (!planIds || planIds.length === 0) return;
    addLesson({
      id: newId('lesson'),
      title: planTitle || goal,
      goal,
      exerciseIds: planIds,
      createdAt: new Date().toISOString().slice(0, 10),
    });
    Alert.alert(t('builder.savedTitle'), t('builder.savedBody'));
  };

  const send = () => {
    if (!planIds || planIds.length === 0) return;
    // Выбираем ребёнка — урок попадёт в «Задания» его родителя через общий store.
    setSendOpen(true);
  };

  const sendToChild = (childId: string) => {
    if (!planIds || planIds.length === 0) return;
    addLesson({
      id: newId('lesson'),
      title: planTitle || goal,
      goal,
      exerciseIds: planIds,
      createdAt: new Date().toISOString().slice(0, 10),
      childId,
    });
    setSendOpen(false);
    Alert.alert(t('builder.sentTitle'), t('builder.sentBody'));
  };

  return (
    <Screen>
      <ScreenHeader title={t('builder.title')} subtitle={t('builder.subtitle')} />

      <Card style={styles.goalCard}>
        <View style={styles.aiBadge}>
          <Ionicons name="sparkles" size={13} color={colors.purple} />
          <Text style={styles.aiBadgeText}>AI</Text>
        </View>
        <Text style={styles.goalLabel}>{t('builder.goalLabel')}</Text>
        <TextInput
          style={styles.goalInput}
          value={goal}
          onChangeText={setGoal}
          placeholder={t('builder.goalPlaceholder')}
          placeholderTextColor={colors.textMuted}
          multiline
        />
        <AppButton
          title={t('builder.generate')}
          icon="sparkles"
          variant="ai"
          onPress={generate}
          loading={generating}
        />
      </Card>

      {/* Урок по этапу коррекционного маршрута (по заключению ребёнка) */}
      {children.length > 0 ? (
        <Card style={styles.stageCard}>
          <View style={styles.stageTitleRow}>
            <Ionicons name="git-branch-outline" size={16} color={colors.purple} />
            <Text style={styles.goalLabel}>{t('builder.byStage')}</Text>
          </View>
          <Text style={styles.stageHint}>{t('builder.byStageHint')}</Text>

          <View style={styles.stageChips}>
            {children.map((c) => (
              <Chip
                key={c.id}
                label={c.name.split(' ')[0]}
                color={colors.teal}
                selected={c.id === stageChildId}
                onPress={() => setStageChildId(c.id)}
              />
            ))}
          </View>

          {path.length === 0 ? (
            <Text style={styles.stageHint}>{t('builder.noPath')}</Text>
          ) : (
            path.map((step, i) => (
              <Pressable
                key={step.stage.id}
                onPress={() => genFromStage(i)}
                style={({ pressed }) => [styles.stageRow, pressed && { opacity: 0.85 }]}
              >
                <View style={styles.stageNum}>
                  <Text style={styles.stageNumText}>{i + 1}</Text>
                </View>
                <View style={styles.stageInfo}>
                  <Text style={styles.stageName} numberOfLines={1}>
                    {step.stage.emoji} {step.stage.title}
                  </Text>
                  <View style={styles.stageCats}>
                    {step.stage.categories.map((cat) => (
                      <Chip key={cat} label={t(`category.${cat}`)} color={CATEGORY_META[cat].color} />
                    ))}
                  </View>
                </View>
                <Ionicons name="add-circle" size={24} color={colors.teal} />
              </Pressable>
            ))
          )}
        </Card>
      ) : null}

      {/* Управление 3D-миром «Остров Эха» для выбранного выше ребёнка */}
      {stageChild ? (
        <View style={styles.worldWrap}>
          <Text style={styles.worldHint}>
            🎮 Игры 3D-мира для: {stageChild.name.split(' ')[0]}
          </Text>
          <WorldGamesCard childId={stageChildId} />
        </View>
      ) : null}

      {generating ? (
        <Card style={styles.loadingCard}>
          <ActivityIndicator color={colors.purple} />
          <Text style={styles.loadingText}>{t('builder.generating')}</Text>
        </Card>
      ) : null}

      {planIds ? (
        <Card style={styles.planCard}>
          <Text style={typography.h2}>{planTitle}</Text>
          <Text style={styles.rationale}>{rationale}</Text>

          {planIds.map((id, index) => {
            const ex = byId(id);
            if (!ex) return null;
            return (
              <PlanRow
                key={id}
                exercise={ex}
                index={index}
                isFirst={index === 0}
                isLast={index === planIds.length - 1}
                onUp={() => move(index, -1)}
                onDown={() => move(index, 1)}
                onRemove={() => remove(index)}
                categoryLabel={t(`category.${ex.category}`)}
              />
            );
          })}

          <AppButton
            title={t('builder.addFromLibrary')}
            icon="add"
            variant="outline"
            onPress={() => setPickerOpen(true)}
          />
          <AppButton title={t('builder.save')} icon="save-outline" onPress={save} />
          <AppButton
            title={t('builder.send')}
            icon="paper-plane-outline"
            variant="orange"
            onPress={send}
          />
        </Card>
      ) : null}

      <Text style={typography.h2}>{t('builder.myLessons')}</Text>
      {lessons.map((lesson) => (
        <Pressable
          key={lesson.id}
          onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: lesson.id } })}
          style={({ pressed }) => pressed && { opacity: 0.9 }}
        >
          <Card style={styles.lessonCard}>
            <View style={styles.lessonInfo}>
              <Text style={styles.lessonTitle}>{lesson.title}</Text>
              <Text style={styles.lessonMeta}>
                {formatDate(lesson.createdAt)} · {lesson.exerciseIds.length}{' '}
                {t('builder.exercisesLabel')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Card>
        </Pressable>
      ))}

      <Modal visible={pickerOpen} animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={typography.h2}>{t('builder.pickExercise')}</Text>
            <Pressable onPress={() => setPickerOpen(false)} hitSlop={8}>
              <Ionicons name="close" size={26} color={colors.navy} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalList}>
            {allExercises
              .filter((e) => !planIds?.includes(e.id))
              .map((e) => (
                <ExerciseListItem
                  key={e.id}
                  exercise={e}
                  onPress={() => addExercise(e.id)}
                  right={<Ionicons name="add-circle" size={24} color={colors.teal} />}
                />
              ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Выбор ребёнка для отправки урока родителю */}
      <Modal visible={sendOpen} transparent animationType="fade" onRequestClose={() => setSendOpen(false)}>
        <View style={styles.sendOverlay}>
          <Card style={styles.sendCard}>
            <View style={styles.modalHeaderInline}>
              <Text style={typography.h2}>{t('builder.sendPick')}</Text>
              <Pressable onPress={() => setSendOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.navy} />
              </Pressable>
            </View>
            {children.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => sendToChild(c.id)}
                style={({ pressed }) => [styles.sendRow, pressed && { opacity: 0.85 }]}
              >
                <Avatar name={c.name} size={40} />
                <Text style={styles.sendName}>{c.name}</Text>
                <Ionicons name="paper-plane-outline" size={18} color={colors.orange} />
              </Pressable>
            ))}
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}

function PlanRow({
  exercise,
  index,
  isFirst,
  isLast,
  onUp,
  onDown,
  onRemove,
  categoryLabel,
}: {
  exercise: Exercise;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
  categoryLabel: string;
}) {
  const meta = CATEGORY_META[exercise.category];
  return (
    <View style={styles.planRow}>
      <View style={[styles.planIndex, { backgroundColor: meta.bg }]}>
        <Text style={[styles.planIndexText, { color: meta.color }]}>{index + 1}</Text>
      </View>
      <View style={styles.planInfo}>
        <Text style={styles.planTitle} numberOfLines={1}>
          {exercise.emoji} {exercise.title}
        </Text>
        <Chip label={categoryLabel} color={meta.color} />
      </View>
      <View style={styles.planActions}>
        <Pressable
          onPress={onUp}
          disabled={isFirst}
          hitSlop={4}
          style={({ pressed }) => [styles.planActionBtn, pressed && styles.planActionPressed]}
        >
          <Ionicons name="chevron-up" size={22} color={isFirst ? colors.border : colors.navy} />
        </Pressable>
        <Pressable
          onPress={onDown}
          disabled={isLast}
          hitSlop={4}
          style={({ pressed }) => [styles.planActionBtn, pressed && styles.planActionPressed]}
        >
          <Ionicons name="chevron-down" size={22} color={isLast ? colors.border : colors.navy} />
        </Pressable>
        {/* Корзина отделена, чтобы не промахнуться при перестановке. */}
        <Pressable
          onPress={onRemove}
          hitSlop={4}
          style={({ pressed }) => [
            styles.planActionBtn,
            styles.planRemoveBtn,
            pressed && styles.planActionPressed,
          ]}
        >
          <Ionicons name="trash-outline" size={19} color={colors.danger} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  goalCard: { gap: spacing.md },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.purpleSoft,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  aiBadgeText: { fontSize: 12, fontWeight: '800', color: colors.purple },
  goalLabel: { fontSize: 14, fontWeight: '700', color: colors.navy },
  worldWrap: { gap: spacing.sm },
  worldHint: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  stageCard: { gap: spacing.md },
  stageTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stageHint: { fontSize: 12.5, color: colors.textSecondary, lineHeight: 18 },
  stageChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.inputBg,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  stageNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageNumText: { fontSize: 13, fontWeight: '800', color: colors.purple },
  stageInfo: { flex: 1, gap: 5 },
  stageName: { fontSize: 14.5, fontWeight: '700', color: colors.navy },
  stageCats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  goalInput: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 15,
    color: colors.navy,
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.purpleSoft,
  },
  loadingText: { fontSize: 14, fontWeight: '600', color: colors.purple, flex: 1 },
  planCard: { gap: spacing.md },
  rationale: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.inputBg,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  planIndex: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planIndexText: { fontSize: 14, fontWeight: '800' },
  planInfo: { flex: 1, gap: 5 },
  planTitle: { fontSize: 14.5, fontWeight: '700', color: colors.navy },
  planActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  planActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planRemoveBtn: { marginLeft: spacing.sm, backgroundColor: colors.dangerSoft },
  planActionPressed: { opacity: 0.7, backgroundColor: colors.border },
  lessonCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  lessonInfo: { flex: 1, gap: 3 },
  lessonTitle: { fontSize: 15, fontWeight: '700', color: colors.navy },
  lessonMeta: { fontSize: 12.5, color: colors.textSecondary },
  modalRoot: { flex: 1, backgroundColor: colors.bg, paddingTop: 56 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  modalList: { padding: spacing.lg, gap: spacing.md },
  sendOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 42, 110, 0.45)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  sendCard: { gap: spacing.md },
  modalHeaderInline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.inputBg,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  sendName: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.navy },
});
