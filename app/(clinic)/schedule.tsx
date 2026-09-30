import { Ionicons } from '@/web/Icon';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from '@/web/ui';

import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AppointmentType, relDate } from '@/data/clinic';
import { formatDateShort, useT, weekdayLabel } from '@/i18n';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, spacing } from '@/theme';

const TYPE_COLOR: Record<AppointmentType, string> = {
  session: colors.teal,
  diagnostics: colors.purple,
  consultation: colors.orange,
};

/** CRM клиники, экран 4: расписание приёмов всех специалистов. */
export default function ClinicScheduleScreen() {
  const t = useT();
  const lang = useAppStore((s) => s.lang);
  const appointments = useAppStore((s) => s.appointments);
  const clients = useAppStore((s) => s.clinicClients);
  const specialists = useAppStore((s) => s.specialists);
  const setAppointmentStatus = useAppStore((s) => s.setAppointmentStatus);

  // Вчера + сегодня + 5 дней вперёд.
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => relDate(i - 1)), []);
  const [selectedDay, setSelectedDay] = useState(relDate(0));

  const dayAppointments = appointments
    .filter((a) => a.date === selectedDay)
    .sort((a, b) => a.time.localeCompare(b.time));

  const clientById = (id: string) => clients.find((c) => c.id === id);
  const specialistById = (id: string) => specialists.find((s) => s.id === id);

  return (
    <Screen>
      <ScreenHeader title={t('ctabs.schedule')} subtitle={t('crm.scheduleSubtitle')} />

      {/* Выбор дня */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
        {days.map((day) => {
          const active = day === selectedDay;
          const isToday = day === relDate(0);
          const count = appointments.filter((a) => a.date === day).length;
          return (
            <Pressable
              key={day}
              onPress={() => setSelectedDay(day)}
              style={[styles.dayPill, active && styles.dayPillActive]}
            >
              <Text style={[styles.dayLabel, active && styles.dayLabelActive]}>
                {isToday ? t('crm.today') : weekdayLabel(day, lang)}
              </Text>
              <Text style={[styles.dayDate, active && styles.dayLabelActive]}>
                {formatDateShort(day)}
              </Text>
              {count > 0 ? (
                <View style={[styles.countDot, active && styles.countDotActive]}>
                  <Text style={[styles.countText, active && { color: colors.navy }]}>{count}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {dayAppointments.length === 0 ? (
        <EmptyState icon="calendar-outline" text={t('crm.noAppointments')} />
      ) : (
        dayAppointments.map((a) => {
          const client = clientById(a.clientId);
          const specialist = specialistById(a.specialistId);
          return (
            <Card key={a.id} style={styles.card}>
              <View style={styles.row}>
                <View style={[styles.timePill, { backgroundColor: colors.navySoft }]}>
                  <Text style={styles.timeText}>{a.time}</Text>
                  <Text style={styles.durText}>
                    {a.durationMin} {t('common.min')}
                  </Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.child}>{client?.childName}</Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {specialist?.name}
                    {specialist ? ` · ${t(`spec.${specialist.role}`)}` : ''}
                  </Text>
                  <Chip
                    label={t(
                      a.type === 'session'
                        ? 'crm.typeSession'
                        : a.type === 'diagnostics'
                          ? 'crm.typeDiagnostics'
                          : 'crm.typeConsultation',
                    )}
                    color={TYPE_COLOR[a.type]}
                  />
                </View>
              </View>

              {a.status === 'scheduled' ? (
                <View style={styles.actions}>
                  <Pressable
                    onPress={() => setAppointmentStatus(a.id, 'completed')}
                    style={[styles.actionBtn, { backgroundColor: colors.successSoft }]}
                  >
                    <Ionicons name="checkmark" size={15} color={colors.success} />
                    <Text style={[styles.actionText, { color: colors.success }]}>
                      {t('crm.markDone')}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setAppointmentStatus(a.id, 'missed')}
                    style={[styles.actionBtn, { backgroundColor: colors.dangerSoft }]}
                  >
                    <Ionicons name="close" size={15} color={colors.danger} />
                    <Text style={[styles.actionText, { color: colors.danger }]}>
                      {t('crm.markMissed')}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Chip
                  label={a.status === 'completed' ? t('crm.statusCompleted') : t('crm.statusMissed')}
                  color={a.status === 'completed' ? colors.success : colors.danger}
                />
              )}
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  days: { gap: spacing.sm, paddingVertical: 2 },
  dayPill: {
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 72,
  },
  dayPillActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  dayLabel: { fontSize: 12.5, fontWeight: '800', color: colors.navy },
  dayLabelActive: { color: colors.white },
  dayDate: { fontSize: 12, color: colors.textSecondary },
  countDot: {
    backgroundColor: colors.tealSoft,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  countDotActive: { backgroundColor: colors.white },
  countText: { fontSize: 12, fontWeight: '800', color: colors.teal },
  card: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  timePill: {
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
  },
  timeText: { fontSize: 14, fontWeight: '800', color: colors.navy },
  durText: { fontSize: 12, color: colors.textSecondary },
  info: { flex: 1, gap: 5 },
  child: { fontSize: 15, fontWeight: '700', color: colors.navy },
  meta: { fontSize: 12.5, color: colors.textSecondary },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  actionText: { fontSize: 12.5, fontWeight: '700' },
});
