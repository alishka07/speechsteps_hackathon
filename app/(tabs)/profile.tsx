import { Ionicons } from '@/web/Icon';
import { useRouter } from '@/web/router';
import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from '@/web/ui';

import { AppButton } from '@/components/AppButton';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { LangSwitch } from '@/components/LangSwitch';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StatTile } from '@/components/StatTile';
import { EXERCISES } from '@/data/exercises';
import { SOUND_STATS } from '@/data/parent';
import { formatAge, formatDate, formatDateShort, useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { buildReportHtml, exportPdf } from '@/lib/pdf';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, spacing, typography } from '@/theme';

/** Экран 6: профиль логопеда + экспорт отчёта по ребёнку (заглушка PDF). */
export default function ProfileScreen() {
  const t = useT();
  const router = useRouter();
  const therapist = useAppStore((s) => s.therapist);
  const children = useAppStore((s) => s.children);
  const lessons = useAppStore((s) => s.lessons);
  const attempts = useAppStore((s) => s.attempts);
  const notes = useAppStore((s) => s.notes);
  const lang = useAppStore((s) => s.lang);
  const customExercises = useAppStore((s) => s.customExercises);

  const [copied, setCopied] = useState(false);
  const [reportChildId, setReportChildId] = useState(children[0]?.id ?? null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Тарифы из веб-версии (мок).
  const plans = [
    { id: 'free', name: 'Free', price: '$0', limit: 2, featKey: 'ther.planFreeFeat' as const, current: true },
    { id: 'starter', name: 'Starter', price: '$17', limit: 5, featKey: 'ther.planStarterFeat' as const, current: false },
    { id: 'pro', name: 'Pro', price: '$47', limit: 25, featKey: 'ther.planProFeat' as const, current: false },
  ];

  const copyId = () => {
    // Заглушка копирования для браузерной версии.
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const reportChild = children.find((c) => c.id === reportChildId);
  const report = useMemo(() => {
    if (!reportChild) return null;
    const childAttempts = attempts.filter((a) => a.childId === reportChild.id);
    const avg =
      childAttempts.length > 0
        ? Math.round(childAttempts.reduce((sum, a) => sum + a.score, 0) / childAttempts.length)
        : 0;
    const weekMinutes = reportChild.daily.reduce((sum, d) => sum + d.minutes, 0);
    return { attemptsCount: childAttempts.length, avg, weekMinutes };
  }, [reportChild, attempts]);

  const sharePdf = async () => {
    if (!reportChild || !report || exporting) return;
    const childAttempts = attempts
      .filter((a) => a.childId === reportChild.id)
      .sort((a, b) => b.date.localeCompare(a.date));
    const html = buildReportHtml({
      title: t('profile.report'),
      childName: reportChild.name,
      ageLabel: formatAge(reportChild.age, lang),
      diagnoses: reportChild.diagnoses.map((d) => t(`diagnosis.${d}`)),
      therapistName: therapist.name,
      avgScore: report.avg,
      attemptsCount: report.attemptsCount,
      weekMinutes: report.weekMinutes,
      soundStats: SOUND_STATS[reportChild.id] ?? [],
      attempts: childAttempts.map((a) => ({
        date: formatDateShort(a.date),
        exerciseTitle: a.exerciseTitle,
        expectedWord: a.expectedWord,
        recognizedWord: a.recognizedWord,
        score: a.score,
      })),
      notes: notes
        .filter((n) => n.childId === reportChild.id)
        .map((n) => ({ title: n.title, text: n.text, date: formatDate(n.date) })),
      labels: {
        therapist: t('parent.profileTherapist'),
        avgScore: t('profile.avgScore'),
        attempts: t('profile.attemptsTotal'),
        weekMinutes: t('profile.timeThisWeek'),
        bySound: t('parent.bySound'),
        history: t('child.attempts'),
        notes: t('child.notes'),
        generated: `${t('profile.report')} · ${formatDate(new Date().toISOString().slice(0, 10))}`,
        minShort: t('common.minShort'),
      },
    });
    setExporting(true);
    const res = await exportPdf(html);
    setExporting(false);
    if (res === 'shared') haptics.success();
    else if (res === 'web') Alert.alert(t('profile.report'), t('profile.reportStub'));
  };

  return (
    <Screen>
      <ScreenHeader title={t('profile.title')} right={<LangSwitch />} />

      <Card style={styles.identity}>
        <Avatar name={therapist.name} size={64} />
        <View style={styles.identityInfo}>
          <Text style={typography.h2}>{therapist.name}</Text>
          <Chip label={t('profile.role')} color={colors.purple} />
        </View>
      </Card>

      <Card style={styles.idCard}>
        <Text style={styles.idLabel}>{t('profile.therapistId')}</Text>
        <View style={styles.idRow}>
          <Text style={styles.idValue}>{therapist.id}</Text>
          <Pressable onPress={copyId} style={styles.copyBtn}>
            <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={colors.navy} />
            <Text style={styles.copyText}>{copied ? t('profile.copied') : t('profile.copy')}</Text>
          </Pressable>
        </View>
        <Text style={styles.idHint}>{t('profile.idHint')}</Text>
      </Card>

      {/* Телетерапия (заглушка) */}
      <Pressable
        onPress={() => Alert.alert(t('ther.teletherapy'), t('login.stub'))}
        style={({ pressed }) => pressed && { opacity: 0.9 }}
      >
        <Card style={styles.rowCard}>
          <View style={styles.rowIcon}>
            <Ionicons name="videocam-outline" size={20} color={colors.teal} />
          </View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>{t('ther.teletherapy')}</Text>
            <Text style={styles.rowMeta}>{t('ther.teletherapyDesc')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Card>
      </Pressable>

      {/* Апгрейд практики */}
      <Card style={[styles.rowCard, styles.upgradeCard]}>
        <View style={[styles.rowIcon, { backgroundColor: colors.goldSoft }]}>
          <Ionicons name="ribbon-outline" size={20} color={colors.gold} />
        </View>
        <View style={styles.rowInfo}>
          <Text style={styles.rowTitle}>{t('ther.upgrade')}</Text>
          <Text style={styles.rowMeta}>{t('ther.upgradeDesc')}</Text>
        </View>
        <Pressable onPress={() => setPlansOpen(true)} style={styles.plansBtn}>
          <Text style={styles.plansBtnText}>{t('ther.viewPlans')}</Text>
        </Pressable>
      </Card>

      <Text style={typography.h2}>{t('profile.stats')}</Text>
      <View style={styles.statsRow}>
        <StatTile
          icon="people-outline"
          value={String(children.length)}
          label={t('profile.activeClients')}
          color={colors.teal}
          bg={colors.tealSoft}
        />
        <StatTile
          icon="document-text-outline"
          value={String(lessons.length)}
          label={t('profile.lessonsCreated')}
          color={colors.orange}
          bg={colors.orangeSoft}
        />
        <StatTile
          icon="library-outline"
          value={String(EXERCISES.length + customExercises.length)}
          label={t('profile.exercisesInLibrary')}
          color={colors.purple}
          bg={colors.purpleSoft}
        />
      </View>

      <Text style={typography.h2}>{t('profile.language')}</Text>
      <Card style={styles.langCard}>
        <Ionicons name="language-outline" size={20} color={colors.navy} />
        <Text style={styles.langText}>{t('profile.language')}</Text>
        <LangSwitch />
      </Card>

      <Text style={typography.h2}>{t('profile.report')}</Text>
      <Card style={styles.reportCard}>
        <Text style={styles.selectLabel}>{t('profile.selectChild')}</Text>
        <View style={styles.childChips}>
          {children.map((c) => (
            <Chip
              key={c.id}
              label={c.name.split(' ')[0]}
              color={colors.teal}
              selected={c.id === reportChildId}
              onPress={() => setReportChildId(c.id)}
            />
          ))}
        </View>
        <AppButton
          title={t('profile.exportPdf')}
          icon="download-outline"
          onPress={() => setPreviewOpen(true)}
          disabled={!reportChild}
        />
      </Card>

      <AppButton
        title={t('profile.signOut')}
        icon="log-out-outline"
        variant="outline"
        onPress={() => router.replace('/')}
      />

      {/* Тарифы */}
      <Modal
        visible={plansOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPlansOpen(false)}
      >
        <View style={styles.overlay}>
          <Card style={styles.plansModal}>
            <View style={styles.plansHead}>
              <Text style={typography.h2}>{t('ther.viewPlans')}</Text>
              <Pressable onPress={() => setPlansOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.navy} />
              </Pressable>
            </View>
            {plans.map((plan) => (
              <View key={plan.id} style={[styles.planRow, plan.current && styles.planRowCurrent]}>
                <View style={styles.planInfo}>
                  <View style={styles.planNameRow}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planPrice}>
                      {plan.price}
                      <Text style={styles.planPer}>{t('ther.perMonth')}</Text>
                    </Text>
                  </View>
                  <Text style={styles.planLimit}>
                    {plan.limit} {t('ther.childrenLimit')} · {t(plan.featKey)}
                  </Text>
                </View>
                {plan.current ? (
                  <Chip label={t('ther.current')} color={colors.teal} />
                ) : (
                  <Pressable
                    onPress={() => {
                      setPlansOpen(false);
                      Alert.alert(t('ther.planChosen'), t('ther.planChosenBody'));
                    }}
                    style={styles.choosePlanBtn}
                  >
                    <Text style={styles.choosePlanText}>{t('ther.choose')}</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </Card>
        </View>
      </Modal>

      <Modal
        visible={previewOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewOpen(false)}
      >
        <View style={styles.overlay}>
          <Card style={styles.preview}>
            <Text style={typography.h2}>{t('profile.reportPreview')}</Text>
            {reportChild && report ? (
              <View style={styles.previewBody}>
                <Text style={styles.previewName}>{reportChild.name}</Text>
                <Text style={styles.previewMeta}>{t('profile.period')}</Text>
                <View style={styles.previewRow}>
                  <Text style={styles.previewKey}>{t('profile.avgScore')}</Text>
                  <Text style={styles.previewVal}>{report.avg}%</Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewKey}>{t('profile.attemptsTotal')}</Text>
                  <Text style={styles.previewVal}>{report.attemptsCount}</Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewKey}>{t('profile.timeThisWeek')}</Text>
                  <Text style={styles.previewVal}>
                    {report.weekMinutes} {t('common.min')}
                  </Text>
                </View>
              </View>
            ) : null}
            <AppButton
              title={t('profile.sharePdf')}
              icon="share-outline"
              loading={exporting}
              onPress={sharePdf}
            />
            <AppButton title={t('common.close')} variant="ghost" onPress={() => setPreviewOpen(false)} />
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  identityInfo: { flex: 1, gap: 6 },
  idCard: { gap: spacing.sm },
  idLabel: { fontSize: 12, fontWeight: '800', color: colors.purple, letterSpacing: 1 },
  idRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  idValue: { fontSize: 26, fontWeight: '800', color: colors.navy, letterSpacing: 2 },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  copyText: { fontSize: 13, fontWeight: '700', color: colors.navy },
  idHint: { fontSize: 12.5, color: colors.textSecondary },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  upgradeCard: { backgroundColor: colors.goldSoft },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: colors.navy },
  rowMeta: { fontSize: 12, color: colors.textSecondary },
  plansBtn: {
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  plansBtnText: { fontSize: 12.5, fontWeight: '800', color: colors.white },
  plansModal: { gap: spacing.md },
  plansHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.inputBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  planRowCurrent: { borderColor: colors.teal, backgroundColor: colors.tealSoft },
  planInfo: { flex: 1, gap: 4 },
  planNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planName: { fontSize: 15.5, fontWeight: '800', color: colors.navy },
  planPrice: { fontSize: 15, fontWeight: '800', color: colors.navy },
  planPer: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  planLimit: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  choosePlanBtn: {
    backgroundColor: colors.teal,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  choosePlanText: { fontSize: 12.5, fontWeight: '800', color: colors.white },
  langCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  langText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.navy },
  reportCard: { gap: spacing.md },
  selectLabel: { fontSize: 14, fontWeight: '700', color: colors.navy },
  childChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 42, 110, 0.45)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  preview: { gap: spacing.md },
  previewBody: { gap: spacing.sm },
  previewName: { fontSize: 17, fontWeight: '800', color: colors.navy },
  previewMeta: { fontSize: 12.5, color: colors.textSecondary },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  previewKey: { fontSize: 14, color: colors.textSecondary },
  previewVal: { fontSize: 14, fontWeight: '800', color: colors.navy },
  previewStub: { fontSize: 12.5, color: colors.textMuted, fontStyle: 'italic' },
});
