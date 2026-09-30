import { Ionicons } from '@/web/Icon';
import { useRouter } from '@/web/router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from '@/web/ui';

import { Card } from '@/components/Card';
import { ChildSwitcher } from '@/components/ChildSwitcher';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ScoreBadge } from '@/components/ScoreBadge';
import { REPORTS } from '@/data/reports';
import { monthLabel, useT } from '@/i18n';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, spacing } from '@/theme';

/** Родитель, экран 3: список ежемесячных отчётов. */
export default function ParentReportsScreen() {
  const t = useT();
  const router = useRouter();
  const lang = useAppStore((s) => s.lang);
  const parentChildId = useAppStore((s) => s.parentChildId);

  const reports = REPORTS.filter((r) => r.childId === parentChildId);

  return (
    <Screen>
      <ScreenHeader title={t('parent.reportsTitle')} subtitle={t('parent.reportsSubtitle')} />
      <ChildSwitcher />

      {reports.length === 0 ? (
        <EmptyState icon="document-text-outline" text={t('parent.noReports')} />
      ) : (
        reports.map((report) => (
          <Pressable
            key={report.id}
            onPress={() => router.push({ pathname: '/report/[id]', params: { id: report.id } })}
            style={({ pressed }) => pressed && { opacity: 0.9 }}
          >
            <Card style={styles.card}>
              <View style={styles.iconBox}>
                <Ionicons name="document-text-outline" size={22} color={colors.peachDark} />
              </View>
              <View style={styles.info}>
                <Text style={styles.title}>{monthLabel(report.period, lang)}</Text>
                <Text style={styles.meta}>
                  {t('parent.lessonsDone')}: {report.lessonsDone} · {t('profile.attemptsTotal')}:{' '}
                  {report.attempts}
                </Text>
              </View>
              <ScoreBadge score={report.avgAccuracy} />
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.peachSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 3 },
  title: { fontSize: 15.5, fontWeight: '700', color: colors.navy },
  meta: { fontSize: 12, color: colors.textSecondary },
});
