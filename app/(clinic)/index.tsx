import { Ionicons } from '@/web/Icon';
import { useRouter } from '@/web/router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from '@/web/ui';

import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { LangSwitch } from '@/components/LangSwitch';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StatTile } from '@/components/StatTile';
import { CLINIC, relDate } from '@/data/clinic';
import { useT } from '@/i18n';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, spacing, typography } from '@/theme';

/** CRM клиники, экран 1: обзор — KPI, расписание на сегодня, внимание. */
export default function ClinicOverviewScreen() {
  const t = useT();
  const router = useRouter();
  const specialists = useAppStore((s) => s.specialists);
  const clients = useAppStore((s) => s.clinicClients);
  const appointments = useAppStore((s) => s.appointments);
  const setAppointmentStatus = useAppStore((s) => s.setAppointmentStatus);

  const today = relDate(0);
  const todayAppointments = appointments
    .filter((a) => a.date === today)
    .sort((a, b) => a.time.localeCompare(b.time));

  const activeCount = clients.filter((c) => c.stage === 'active').length;
  const leadsCount = clients.filter((c) => c.stage === 'lead' || c.stage === 'diagnostics').length;
  const activeSpecialists = specialists.filter((s) => s.status === 'active').length;
  // Выручка: проведённые занятия абонементов × цена.
  const revenue = clients.reduce(
    (sum, c) => sum + (c.subscription ? c.subscription.sessionsUsed * c.subscription.pricePerSession : 0),
    0,
  );
  const revenueShort = revenue >= 1000 ? `${Math.round(revenue / 1000)}K` : String(revenue);

  // Клиенты в работе без запланированного следующего визита.
  const needAttention = clients.filter(
    (c) => (c.stage === 'active' || c.stage === 'paused' || c.stage === 'lead') && !c.nextVisit,
  );

  const clientById = (id: string) => clients.find((c) => c.id === id);
  const specialistById = (id: string) => specialists.find((s) => s.id === id);

  return (
    <Screen>
      <ScreenHeader
        title={CLINIC.name}
        subtitle={t('clinic.title')}
        right={
          <View style={styles.headerRight}>
            <LangSwitch />
            <Pressable
              onPress={() => router.replace('/')}
              style={styles.exitBtn}
              hitSlop={8}
              accessibilityLabel={t('profile.signOut')}
            >
              <Ionicons name="log-out-outline" size={20} color={colors.navy} />
            </Pressable>
          </View>
        }
      />

      {/* KPI */}
      <View style={styles.kpiRow}>
        <StatTile
          icon="people-outline"
          value={String(activeCount)}
          label={t('crm.activeClients')}
          color={colors.success}
          bg={colors.successSoft}
        />
        <StatTile
          icon="sparkles-outline"
          value={String(leadsCount)}
          label={t('crm.leads')}
          color={colors.purple}
          bg={colors.purpleSoft}
        />
      </View>
      <View style={styles.kpiRow}>
        <StatTile
          icon="calendar-outline"
          value={String(todayAppointments.length)}
          label={t('crm.sessionsToday')}
          color={colors.teal}
          bg={colors.tealSoft}
        />
        <StatTile
          icon="medkit-outline"
          value={String(activeSpecialists)}
          label={t('crm.specialistsCount')}
          color={colors.orange}
          bg={colors.orangeSoft}
        />
        <StatTile
          icon="cash-outline"
          value={revenueShort}
          label={t('crm.kpiRevenue')}
          color={colors.navy}
          bg={colors.navySoft}
        />
      </View>

      {/* Расписание на сегодня */}
      <Card style={styles.section}>
        <View style={styles.sectionTitle}>
          <Ionicons name="today-outline" size={18} color={colors.teal} />
          <Text style={typography.h3}>{t('crm.todaySchedule')}</Text>
        </View>
        {todayAppointments.length === 0 ? (
          <EmptyState icon="calendar-outline" text={t('crm.noAppointments')} />
        ) : (
          todayAppointments.map((a) => {
            const client = clientById(a.clientId);
            const specialist = specialistById(a.specialistId);
            return (
              <View key={a.id} style={styles.apptRow}>
                <View style={styles.timePill}>
                  <Text style={styles.timeText}>{a.time}</Text>
                </View>
                <View style={styles.apptInfo}>
                  <Text style={styles.apptChild} numberOfLines={1}>
                    {client?.childName}
                  </Text>
                  <Text style={styles.apptMeta} numberOfLines={1}>
                    {specialist?.name} · {a.durationMin} {t('common.min')}
                  </Text>
                </View>
                {a.status === 'scheduled' ? (
                  <View style={styles.apptActions}>
                    <Pressable
                      onPress={() => setAppointmentStatus(a.id, 'completed')}
                      style={[styles.apptBtn, { backgroundColor: colors.success }]}
                      hitSlop={4}
                    >
                      <Ionicons name="checkmark" size={16} color={colors.white} />
                    </Pressable>
                    <Pressable
                      onPress={() => setAppointmentStatus(a.id, 'missed')}
                      style={[styles.apptBtn, { backgroundColor: colors.dangerSoft }]}
                      hitSlop={4}
                    >
                      <Ionicons name="close" size={16} color={colors.danger} />
                    </Pressable>
                  </View>
                ) : (
                  <Chip
                    label={a.status === 'completed' ? t('crm.statusCompleted') : t('crm.statusMissed')}
                    color={a.status === 'completed' ? colors.success : colors.danger}
                  />
                )}
              </View>
            );
          })
        )}
      </Card>

      {/* Требуют внимания */}
      <Card style={[styles.section, needAttention.length > 0 && styles.attentionCard]}>
        <View style={styles.sectionTitle}>
          <Ionicons
            name={needAttention.length > 0 ? 'alert-circle-outline' : 'checkmark-circle-outline'}
            size={18}
            color={needAttention.length > 0 ? colors.danger : colors.success}
          />
          <Text style={typography.h3}>{t('crm.needFollowup')}</Text>
        </View>
        {needAttention.length === 0 ? (
          <Text style={styles.calmText}>{t('crm.allCalm')}</Text>
        ) : (
          needAttention.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => router.push({ pathname: '/clinic-client/[id]', params: { id: c.id } })}
              style={({ pressed }) => [styles.attRow, pressed && { opacity: 0.85 }]}
            >
              <Avatar name={c.childName} size={38} />
              <View style={styles.apptInfo}>
                <Text style={styles.apptChild}>{c.childName}</Text>
                <Text style={styles.attMeta}>
                  {t(`stage.${c.stage}`)} · {t('crm.noNextVisit')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          ))
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  exitBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiRow: { flexDirection: 'row', gap: spacing.md },
  section: { gap: spacing.md },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  apptRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  timePill: {
    backgroundColor: colors.tealSoft,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  timeText: { fontSize: 13, fontWeight: '800', color: colors.teal },
  apptInfo: { flex: 1, gap: 2 },
  apptChild: { fontSize: 14.5, fontWeight: '700', color: colors.navy },
  apptMeta: { fontSize: 12, color: colors.textSecondary },
  apptActions: { flexDirection: 'row', gap: spacing.sm },
  apptBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attentionCard: { borderWidth: 1, borderColor: colors.dangerSoft },
  calmText: { fontSize: 13.5, color: colors.textSecondary },
  attRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  attMeta: { fontSize: 12, color: colors.danger, fontWeight: '600' },
});
