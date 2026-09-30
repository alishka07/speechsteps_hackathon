import { Ionicons } from '@/web/Icon';
import { useLocalSearchParams } from '@/web/router';
import React from 'react';
import { StyleSheet, Text, View } from '@/web/ui';
import { BarChart } from '@/web/charts';

import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StatTile } from '@/components/StatTile';
import { REPORTS } from '@/data/reports';
import { monthLabel, useT } from '@/i18n';
import { useAppStore } from '@/store/useAppStore';
import { colors, scoreColor, spacing, typography } from '@/theme';

/** Превью ежемесячного отчёта с графиком и выводами (мок). */
export default function ReportDetailScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lang = useAppStore((s) => s.lang);
  const child = useAppStore((s) =>
    s.children.find((c) => c.id === REPORTS.find((r) => r.id === id)?.childId),
  );

  const report = REPORTS.find((r) => r.id === id);

  if (!report) {
    return (
      <Screen>
        <ScreenHeader title={t('parent.reportNotFound')} back />
      </Screen>
    );
  }

  const chartData = report.soundSnapshot.map((s) => ({
    value: s.accuracy,
    label: s.sound,
    frontColor: scoreColor(s.accuracy).fg,
  }));

  return (
    <Screen>
      <ScreenHeader
        title={monthLabel(report.period, lang)}
        subtitle={child?.name}
        back
      />

      <View style={styles.statsRow}>
        <StatTile
          icon="speedometer-outline"
          value={`${report.avgAccuracy}%`}
          label={t('parent.avgAccuracy')}
          color={colors.teal}
          bg={colors.tealSoft}
        />
        <StatTile
          icon="book-outline"
          value={String(report.lessonsDone)}
          label={t('parent.lessonsDone')}
          color={colors.orange}
          bg={colors.orangeSoft}
        />
        <StatTile
          icon="mic-outline"
          value={String(report.attempts)}
          label={t('profile.attemptsTotal')}
          color={colors.purple}
          bg={colors.purpleSoft}
        />
      </View>

      <View style={styles.statsRow}>
        <StatTile
          icon="trophy-outline"
          value={report.bestSound}
          label={t('parent.bestSound')}
          color={colors.success}
          bg={colors.successSoft}
        />
        <StatTile
          icon="locate-outline"
          value={report.focusSound}
          label={t('parent.focusSound')}
          color={colors.peachDark}
          bg={colors.peachSoft}
        />
      </View>

      <Card style={styles.section}>
        <View style={styles.sectionTitle}>
          <Ionicons name="bar-chart-outline" size={18} color={colors.teal} />
          <Text style={typography.h3}>{t('parent.soundsChart')}</Text>
        </View>
        <BarChart
          data={chartData}
          barWidth={30}
          barBorderRadius={6}
          maxValue={100}
          yAxisThickness={0}
          xAxisThickness={0}
          noOfSections={4}
          height={150}
          spacing={26}
          initialSpacing={14}
          yAxisTextStyle={styles.axisText}
          xAxisLabelTextStyle={styles.axisLabel}
          isAnimated
        />
      </Card>

      <Card style={styles.section}>
        <View style={styles.sectionTitle}>
          <Ionicons name="reader-outline" size={18} color={colors.orange} />
          <Text style={typography.h3}>{t('parent.conclusions')}</Text>
        </View>
        {report.summary.map((point, i) => (
          <View key={i} style={styles.point}>
            <Ionicons name="checkmark-circle-outline" size={16} color={colors.teal} />
            <Text style={styles.pointText}>{point}</Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: spacing.md },
  section: { gap: spacing.md },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  axisText: { fontSize: 12, color: colors.textMuted },
  axisLabel: { fontSize: 12, color: colors.navy, fontWeight: '700' },
  point: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  pointText: { flex: 1, fontSize: 14, color: colors.navy, lineHeight: 20 },
});
