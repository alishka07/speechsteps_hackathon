import { Ionicons } from '@/web/Icon';
import { useLocalSearchParams, useRouter } from '@/web/router';
import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from '@/web/ui';
import { BarChart, LineChart } from '@/web/charts';

import { AppButton } from '@/components/AppButton';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { LabeledInput } from '@/components/LabeledInput';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ScoreBadge } from '@/components/ScoreBadge';
import { StatTile } from '@/components/StatTile';
import { WorldGamesCard } from '@/components/WorldGamesCard';
import { WorldProgressCard } from '@/components/WorldProgressCard';
import { SOUND_STATS } from '@/data/parent';
import { buildTherapyPath, PROGRAMS } from '@/data/therapyPaths';
import { formatAge, formatDate, formatDateShort, useT, weekdayLabel } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { buildReportHtml, exportPdf } from '@/lib/pdf';
import { newId, useAppStore } from '@/store/useAppStore';
import { colors, radius, spacing, typography } from '@/theme';
import { CATEGORY_META } from '@/theme/categories';

/** Экран 2: карточка ребёнка — активность, попытки, графики, уроки, заметки. */
export default function ChildScreen() {
  const t = useT();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const lang = useAppStore((s) => s.lang);
  const child = useAppStore((s) => s.children.find((c) => c.id === id));
  const attempts = useAppStore((s) => s.attempts).filter((a) => a.childId === id);
  const notes = useAppStore((s) => s.notes).filter((n) => n.childId === id);
  const lessons = useAppStore((s) => s.lessons).filter((l) => l.childId === id);
  const therapist = useAppStore((s) => s.therapist);
  const addNote = useAppStore((s) => s.addNote);
  const [exporting, setExporting] = useState(false);

  const [noteOpen, setNoteOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteText, setNoteText] = useState('');
  const [pathOpen, setPathOpen] = useState(true);

  const today = child?.daily[child.daily.length - 1];
  const weekMinutes = child?.daily.reduce((sum, d) => sum + d.minutes, 0) ?? 0;
  const weekLessons = child?.daily.filter((d) => d.tasks > 0).length ?? 0;

  const activityData = useMemo(
    () =>
      (child?.daily ?? []).map((d) => ({
        value: d.minutes,
        label: weekdayLabel(d.date, lang),
      })),
    [child, lang],
  );

  const scoreData = useMemo(
    () =>
      (child?.daily ?? []).map((d) => ({
        value: d.avgScore ?? 0,
        label: weekdayLabel(d.date, lang),
      })),
    [child, lang],
  );

  const sortedAttempts = useMemo(
    () => [...attempts].sort((a, b) => b.date.localeCompare(a.date)),
    [attempts],
  );

  if (!child) {
    return (
      <Screen>
        <ScreenHeader title={t('child.notFound')} back />
      </Screen>
    );
  }

  const saveNote = () => {
    if (!noteTitle.trim() && !noteText.trim()) return;
    addNote({
      id: newId('note'),
      childId: child.id,
      title: noteTitle.trim() || '—',
      text: noteText.trim(),
      date: new Date().toISOString().slice(0, 10),
    });
    setNoteTitle('');
    setNoteText('');
    setNoteOpen(false);
  };

  const doExportPdf = async () => {
    if (exporting) return;
    const avg =
      attempts.length > 0
        ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length)
        : 0;
    const html = buildReportHtml({
      title: t('child.exportPdf'),
      childName: child.name,
      ageLabel: formatAge(child.age, lang),
      diagnoses: child.diagnoses.map((d) => t(`diagnosis.${d}`)),
      therapistName: therapist.name,
      avgScore: avg,
      attemptsCount: attempts.length,
      weekMinutes,
      soundStats: SOUND_STATS[child.id] ?? [],
      attempts: sortedAttempts.map((a) => ({
        date: formatDateShort(a.date),
        exerciseTitle: a.exerciseTitle,
        expectedWord: a.expectedWord,
        recognizedWord: a.recognizedWord,
        score: a.score,
      })),
      notes: notes.map((n) => ({ title: n.title, text: n.text, date: formatDate(n.date) })),
      labels: {
        therapist: t('parent.profileTherapist'),
        avgScore: t('profile.avgScore'),
        attempts: t('profile.attemptsTotal'),
        weekMinutes: t('profile.timeThisWeek'),
        bySound: t('parent.bySound'),
        history: t('child.attempts'),
        notes: t('child.notes'),
        generated: `${t('child.exportPdf')} · ${formatDate(new Date().toISOString().slice(0, 10))}`,
        minShort: t('common.minShort'),
      },
    });
    setExporting(true);
    const res = await exportPdf(html);
    setExporting(false);
    if (res === 'shared') haptics.success();
    else Alert.alert(t('child.exportPdf'), t('profile.reportStub'));
  };

  return (
    <Screen>
      <ScreenHeader title={child.name} back />

      {/* Шапка профиля */}
      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Avatar name={child.name} size={56} />
          <View style={styles.headerInfo}>
            <Text style={typography.h2}>{child.name}</Text>
            <Text style={styles.meta}>
              {formatAge(child.age, lang)} · {t('child.connected')}: {formatDate(child.connectedAt)}
            </Text>
          </View>
        </View>
        <View style={styles.tags}>
          {child.diagnoses.map((d) => (
            <Chip key={d} label={t(`diagnosis.${d}`)} color={colors.orange} />
          ))}
        </View>
        <View style={styles.statsRow}>
          <StatTile
            icon="time-outline"
            value={`${today?.minutes ?? 0}${t('common.minShort')}`}
            label={t('child.timeToday')}
            color={colors.teal}
            bg={colors.tealSoft}
          />
          <StatTile
            icon="checkmark-circle-outline"
            value={String(today?.tasks ?? 0)}
            label={t('child.tasksToday')}
            color={colors.success}
            bg={colors.successSoft}
          />
        </View>
      </Card>

      {/* Прогресс 3D-мира «Остров Эха» */}
      <WorldProgressCard childId={child.id} style={styles.section} allowReset />

      {/* Управление мини-играми мира (логопед) */}
      <WorldGamesCard childId={child.id} style={styles.section} />

      {/* Коррекционный маршрут по заключению */}
      {(() => {
        const path = buildTherapyPath(child.diagnoses);
        if (path.length === 0) return null;
        const programs = child.diagnoses.map((d) => PROGRAMS[d]).filter(Boolean);
        return (
          <Card style={styles.section}>
            <Pressable onPress={() => setPathOpen((v) => !v)} style={styles.pathHead}>
              <SectionTitle icon="git-branch-outline" color={colors.purple} title={t('child.therapyPath')} />
              <Ionicons name={pathOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
            </Pressable>
            {pathOpen ? (
              <>
                {programs.map((p) => (
                  <View key={p.diagnosis} style={styles.programNote}>
                    <Text style={styles.programMethod}>
                      {p.fullName} · {p.method}
                    </Text>
                    <Text style={styles.programText}>{p.note}</Text>
                  </View>
                ))}
                {path.map((step, i) => (
                  <View key={step.stage.id} style={styles.stageRow}>
                    <View style={styles.stageNum}>
                      <Text style={styles.stageNumText}>{i + 1}</Text>
                    </View>
                    <View style={styles.stageBody}>
                      <Text style={styles.stageTitle}>
                        {step.stage.emoji} {step.stage.title}
                      </Text>
                      <Text style={styles.stageGoal}>{step.stage.goal}</Text>
                      <View style={styles.stageTags}>
                        {step.stage.categories.map((c) => (
                          <Chip key={c} label={t(`category.${c}`)} color={CATEGORY_META[c].color} />
                        ))}
                      </View>
                    </View>
                  </View>
                ))}
              </>
            ) : null}
          </Card>
        );
      })()}

      {/* Недельная сводка */}
      <Card style={styles.section}>
        <SectionTitle icon="calendar-outline" color={colors.teal} title={t('child.weeklySummary')} />
        <View style={styles.statsRow}>
          <StatTile
            icon="time-outline"
            value={`${weekMinutes}${t('common.minShort')}`}
            label={t('child.timeThisWeek')}
            color={colors.teal}
            bg={colors.tealSoft}
          />
          <StatTile
            icon="book-outline"
            value={String(weekLessons)}
            label={t('child.lessonsThisWeek')}
            color={colors.orange}
            bg={colors.orangeSoft}
          />
        </View>
      </Card>

      {/* Активность по дням */}
      <Card style={styles.section}>
        <SectionTitle icon="pulse-outline" color={colors.purple} title={t('child.dailyActivity')} />
        <BarChart
          data={activityData}
          barWidth={18}
          barBorderRadius={5}
          frontColor={colors.teal}
          yAxisThickness={0}
          xAxisThickness={0}
          noOfSections={4}
          height={140}
          spacing={14}
          initialSpacing={10}
          yAxisTextStyle={styles.axisText}
          xAxisLabelTextStyle={styles.axisText}
          isAnimated
        />
      </Card>

      {/* Средняя оценка по дням */}
      <Card style={styles.section}>
        <SectionTitle
          icon="trending-up-outline"
          color={colors.success}
          title={t('child.avgScoreByDay')}
        />
        <LineChart
          data={scoreData}
          color={colors.orange}
          thickness={3}
          dataPointsColor={colors.orange}
          maxValue={100}
          noOfSections={4}
          height={140}
          spacing={42}
          initialSpacing={16}
          yAxisThickness={0}
          xAxisThickness={0}
          yAxisTextStyle={styles.axisText}
          xAxisLabelTextStyle={styles.axisText}
          curved
          isAnimated
        />
      </Card>

      {/* История попыток */}
      <Card style={styles.section}>
        <SectionTitle icon="mic-outline" color={colors.orange} title={t('child.attempts')} />
        {sortedAttempts.length === 0 ? (
          <EmptyState icon="mic-off-outline" text={t('child.noAttempts')} />
        ) : (
          // Карточки-строки вместо таблицы: на ширине телефона читабельнее.
          sortedAttempts.map((a) => (
            <View key={a.id} style={styles.attemptRow}>
              <View style={styles.attemptInfo}>
                <View style={styles.attemptHead}>
                  <Text style={styles.attemptDate}>{formatDateShort(a.date)}</Text>
                  <Text style={styles.attemptExercise} numberOfLines={1}>
                    {a.exerciseTitle}
                  </Text>
                </View>
                <Text style={styles.attemptWords} numberOfLines={2}>
                  <Text style={styles.attemptExpected}>{a.expectedWord}</Text>
                  {'  →  '}
                  <Text style={styles.attemptRecognized}>{a.recognizedWord}</Text>
                </Text>
              </View>
              <ScoreBadge score={a.score} />
            </View>
          ))
        )}
      </Card>

      {/* Назначенные уроки */}
      <Card style={styles.section}>
        <SectionTitle
          icon="clipboard-outline"
          color={colors.teal}
          title={t('child.assignedLessons')}
        />
        {lessons.length === 0 ? (
          <EmptyState icon="clipboard-outline" text={t('child.noLessons')} />
        ) : (
          lessons.map((lesson) => (
            <Pressable
              key={lesson.id}
              onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: lesson.id } })}
              style={({ pressed }) => [styles.lessonRow, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.lessonInfo}>
                <Text style={styles.lessonTitle}>{lesson.title}</Text>
                <Text style={styles.lessonMeta}>{formatDate(lesson.createdAt)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          ))
        )}
      </Card>

      {/* Заметки */}
      <Card style={styles.section}>
        <View style={styles.notesHeader}>
          <SectionTitle icon="document-text-outline" color={colors.orange} title={t('child.notes')} />
          <Pressable onPress={() => setNoteOpen(true)} style={styles.addNoteBtn}>
            <Ionicons name="add" size={16} color={colors.navy} />
            <Text style={styles.addNoteText}>{t('child.addNote')}</Text>
          </Pressable>
        </View>
        {notes.map((note) => (
          <View key={note.id} style={styles.noteRow}>
            <View style={styles.noteHead}>
              <Text style={styles.noteTitle}>{note.title.toUpperCase()}</Text>
              <Text style={styles.noteDate}>{formatDate(note.date)}</Text>
            </View>
            <Text style={styles.noteText}>{note.text}</Text>
          </View>
        ))}
      </Card>

      {/* Действия */}
      <Card style={styles.section}>
        <SectionTitle icon="reader-outline" color={colors.orange} title={t('child.actions')} />
        <AppButton
          title={t('child.exportPdf')}
          icon="download-outline"
          variant="outline"
          loading={exporting}
          onPress={doExportPdf}
        />
      </Card>

      {/* Модалка добавления заметки */}
      <Modal visible={noteOpen} transparent animationType="fade" onRequestClose={() => setNoteOpen(false)}>
        <View style={styles.overlay}>
          <Card style={styles.noteModal}>
            <Text style={typography.h2}>{t('child.addNote')}</Text>
            <LabeledInput
              label={t('child.noteTitle')}
              value={noteTitle}
              onChangeText={setNoteTitle}
            />
            <LabeledInput
              label={t('child.noteText')}
              value={noteText}
              onChangeText={setNoteText}
              multiline
            />
            <AppButton title={t('common.save')} onPress={saveNote} />
            <AppButton title={t('common.cancel')} variant="ghost" onPress={() => setNoteOpen(false)} />
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}

function SectionTitle({
  icon,
  color,
  title,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
}) {
  return (
    <View style={styles.sectionTitle}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={typography.h3}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerCard: { gap: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerInfo: { flex: 1, gap: 4 },
  meta: { fontSize: 12.5, color: colors.textSecondary },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  section: { gap: spacing.md },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  axisText: { fontSize: 12, color: colors.textMuted },
  pathHead: { flexDirection: 'row', alignItems: 'center' },
  programNote: { backgroundColor: colors.purpleSoft, borderRadius: radius.md, padding: spacing.md, gap: 3 },
  programMethod: { fontSize: 13, fontWeight: '800', color: colors.purple },
  programText: { fontSize: 12.5, color: colors.textSecondary, lineHeight: 18 },
  stageRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  stageNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageNumText: { fontSize: 13, fontWeight: '800', color: colors.purple },
  stageBody: { flex: 1, gap: 5 },
  stageTitle: { fontSize: 14.5, fontWeight: '700', color: colors.navy },
  stageGoal: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  stageTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  attemptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.inputBg,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  attemptInfo: { flex: 1, gap: 4 },
  attemptHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  attemptDate: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  attemptExercise: { flex: 1, fontSize: 13.5, fontWeight: '700', color: colors.navy },
  attemptWords: { fontSize: 13.5, color: colors.textSecondary },
  attemptExpected: { fontWeight: '700', color: colors.navy },
  attemptRecognized: { fontStyle: 'italic' },

  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.inputBg,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  lessonInfo: { flex: 1, gap: 2 },
  lessonTitle: { fontSize: 14.5, fontWeight: '700', color: colors.navy },
  lessonMeta: { fontSize: 12, color: colors.textSecondary },

  notesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  addNoteText: { fontSize: 12.5, fontWeight: '700', color: colors.navy },
  noteRow: {
    backgroundColor: colors.inputBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 4,
  },
  noteHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  noteTitle: { fontSize: 13, fontWeight: '800', color: colors.navy },
  noteDate: { fontSize: 12, color: colors.textMuted },
  noteText: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 19 },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 42, 110, 0.45)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  noteModal: { gap: spacing.md },
});
