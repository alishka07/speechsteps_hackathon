import { Ionicons } from '@/web/Icon';
import { useRouter } from '@/web/router';
import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from '@/web/ui';

import { AppButton } from '@/components/AppButton';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { LangSwitch } from '@/components/LangSwitch';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StatTile } from '@/components/StatTile';
import { Child } from '@/data/types';
import { formatAge, formatDate, useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, spacing, typography } from '@/theme';

/** Сессий отслежено — мок-показатель, как в веб-версии. */
const SESSIONS_TRACKED = 23;

const DIAGNOSIS_COLORS = [colors.orange, colors.purple, colors.teal];

/** Экран 1: список клиентов (детей). */
export default function ClientsScreen() {
  const t = useT();
  const router = useRouter();
  const children = useAppStore((s) => s.children);
  const lang = useAppStore((s) => s.lang);
  const requests = useAppStore((s) => s.requests);
  const acceptRequest = useAppStore((s) => s.acceptRequest);
  const declineRequest = useAppStore((s) => s.declineRequest);

  return (
    <Screen>
      <ScreenHeader title={t('clients.title')} subtitle={t('clients.subtitle')} right={<LangSwitch />} />

      {/* KPI, как на дашборде веб-версии */}
      <View style={styles.kpiRow}>
        <StatTile
          icon="people-outline"
          value={String(children.length)}
          label={t('profile.activeClients')}
          color={colors.teal}
          bg={colors.tealSoft}
        />
        <StatTile
          icon="time-outline"
          value={String(requests.length)}
          label={t('ther.kpiRequests')}
          color={colors.orange}
          bg={colors.orangeSoft}
        />
        <StatTile
          icon="stats-chart-outline"
          value={String(SESSIONS_TRACKED)}
          label={t('ther.kpiSessions')}
          color={colors.purple}
          bg={colors.purpleSoft}
        />
      </View>

      {/* Заявки от родителей */}
      {requests.length > 0 ? (
        <Card style={styles.requestsCard}>
          <Text style={typography.h3}>{t('ther.requests')}</Text>
          {requests.map((req) => (
            <View key={req.id} style={styles.requestRow}>
              <Avatar name={req.childName} size={44} />
              <View style={styles.requestInfo}>
                <Text style={styles.requestChild}>
                  {req.childName}, {formatAge(req.age, lang)}
                </Text>
                <Text style={styles.requestMeta}>
                  {req.parentName} {t('ther.wantsConnect')} · {formatDate(req.date)}
                </Text>
                <View style={styles.requestTags}>
                  {req.diagnoses.map((d) => (
                    <Chip key={d} label={t(`diagnosis.${d}`)} color={colors.orange} />
                  ))}
                </View>
              </View>
              <View style={styles.requestActions}>
                <Pressable
                  onPress={() => {
                    haptics.success();
                    acceptRequest(req.id);
                  }}
                  style={[styles.requestBtn, styles.acceptBtn]}
                  hitSlop={4}
                >
                  <Ionicons name="checkmark" size={20} color={colors.white} />
                </Pressable>
                <Pressable
                  onPress={() =>
                    Alert.alert(t('ther.declineTitle'), t('ther.declineBody'), [
                      { text: t('common.cancel'), style: 'cancel' },
                      { text: t('ther.decline'), style: 'destructive', onPress: () => declineRequest(req.id) },
                    ])
                  }
                  style={[styles.requestBtn, styles.declineBtn]}
                  hitSlop={4}
                >
                  <Ionicons name="close" size={20} color={colors.danger} />
                </Pressable>
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      <AppButton
        title={t('clients.addChild')}
        icon="add"
        onPress={() => router.push('/child/add')}
      />

      {children.length === 0 ? (
        <EmptyState icon="people-outline" text={t('clients.empty')} />
      ) : (
        children.map((child) => (
          <ClientCard
            key={child.id}
            child={child}
            ageLabel={formatAge(child.age, lang)}
            progressLabel={t('clients.progress')}
            diagnosisLabels={child.diagnoses.map((d) => t(`diagnosis.${d}`))}
            onPress={() => router.push({ pathname: '/child/[id]', params: { id: child.id } })}
          />
        ))
      )}
    </Screen>
  );
}

function ClientCard({
  child,
  ageLabel,
  progressLabel,
  diagnosisLabels,
  onPress,
}: {
  child: Child;
  ageLabel: string;
  progressLabel: string;
  diagnosisLabels: string[];
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.9 }}>
      <Card style={styles.card}>
        <View style={styles.row}>
          <Avatar name={child.name} size={52} />
          <View style={styles.info}>
            <Text style={styles.name}>{child.name}</Text>
            <Text style={styles.age}>{ageLabel}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </View>

        <View style={styles.tags}>
          {diagnosisLabels.map((label, i) => (
            <Chip key={label} label={label} color={DIAGNOSIS_COLORS[i % DIAGNOSIS_COLORS.length]} />
          ))}
        </View>

        <View style={styles.progressRow}>
          <ProgressBar value={child.progress} />
          <Text style={styles.progressText}>
            {progressLabel}: {child.progress}%
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  kpiRow: { flexDirection: 'row', gap: spacing.md },
  requestsCard: { gap: spacing.md },
  requestRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  requestInfo: { flex: 1, gap: 4 },
  requestChild: { fontSize: 15, fontWeight: '700', color: colors.navy },
  requestMeta: { fontSize: 12, color: colors.textSecondary },
  requestTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  requestActions: { flexDirection: 'row', gap: spacing.sm },
  requestBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: { backgroundColor: colors.success },
  declineBtn: { backgroundColor: colors.dangerSoft },
  card: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 17, fontWeight: '700', color: colors.navy },
  age: { fontSize: 13, color: colors.textSecondary },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  progressText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
});
