import { Ionicons } from '@/web/Icon';
import { useLocalSearchParams } from '@/web/router';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from '@/web/ui';

import { AppButton } from '@/components/AppButton';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AppointmentType, CLIENT_STAGES, TIME_SLOTS, relDate } from '@/data/clinic';
import { formatAge, formatDate, formatDateShort, useT, weekdayLabel } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { newId, useAppStore } from '@/store/useAppStore';
import { colors, radius, spacing, typography } from '@/theme';
import { ROLE_META, STAGE_META } from '@/theme/categories';

const APPT_TYPES: AppointmentType[] = ['session', 'diagnostics', 'consultation'];
const TYPE_KEY: Record<AppointmentType, 'crm.typeSession' | 'crm.typeDiagnostics' | 'crm.typeConsultation'> = {
  session: 'crm.typeSession',
  diagnostics: 'crm.typeDiagnostics',
  consultation: 'crm.typeConsultation',
};

/** Карточка клиента CRM: контакты, этап, специалисты, история приёмов. */
export default function ClinicClientScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lang = useAppStore((s) => s.lang);
  const client = useAppStore((s) => s.clinicClients.find((c) => c.id === id));
  const specialists = useAppStore((s) => s.specialists);
  const appointments = useAppStore((s) => s.appointments);
  const setClientStage = useAppStore((s) => s.setClientStage);
  const addAppointment = useAppStore((s) => s.addAppointment);
  const topUpSubscription = useAppStore((s) => s.topUpSubscription);

  // Форма записи на приём.
  const [bookOpen, setBookOpen] = useState(false);
  const [bSpecialist, setBSpecialist] = useState<string | null>(null);
  const [bDate, setBDate] = useState(relDate(1));
  const [bTime, setBTime] = useState(TIME_SLOTS[2]);
  const [bType, setBType] = useState<AppointmentType>('session');

  if (!client) {
    return (
      <Screen>
        <ScreenHeader title={t('crm.clientNotFound')} back />
      </Screen>
    );
  }

  const clientSpecialists = client.specialistIds
    .map((spId) => specialists.find((s) => s.id === spId))
    .filter((s): s is NonNullable<typeof s> => !!s);

  const history = appointments
    .filter((a) => a.clientId === client.id)
    .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));

  const sub = client.subscription;
  const bookDays = Array.from({ length: 7 }, (_, i) => relDate(i + 1));

  const saveBooking = () => {
    const specialistId = bSpecialist ?? client.specialistIds[0] ?? specialists[0]?.id;
    if (!specialistId) return;
    addAppointment({
      id: newId('ap'),
      clientId: client.id,
      specialistId,
      date: bDate,
      time: bTime,
      durationMin: bType === 'diagnostics' ? 60 : bType === 'consultation' ? 30 : 45,
      type: bType,
      status: 'scheduled',
    });
    setBookOpen(false);
    haptics.success();
    Alert.alert(t('crm.booked'), t('crm.bookedBody'));
  };

  return (
    <Screen>
      <ScreenHeader title={client.childName} back />

      {/* Контакты */}
      <Card style={styles.section}>
        <View style={styles.head}>
          <Avatar name={client.childName} size={52} />
          <View style={styles.headInfo}>
            <Text style={typography.h2}>
              {client.childName.split(' ')[0]}, {formatAge(client.age, lang)}
            </Text>
            <View style={styles.tags}>
              {client.diagnoses.map((d) => (
                <Chip key={d} label={t(`diagnosis.${d}`)} color={colors.orange} />
              ))}
            </View>
          </View>
        </View>
        <InfoRow icon="person-outline" label={t('crm.parent')} value={client.parentName} />
        <InfoRow icon="call-outline" label={t('crm.phone')} value={client.phone} />
        {client.source ? (
          <InfoRow icon="megaphone-outline" label={t('crm.source')} value={client.source} />
        ) : null}
        {client.lastVisit ? (
          <InfoRow
            icon="time-outline"
            label={t('crm.lastVisit')}
            value={formatDate(client.lastVisit)}
          />
        ) : null}
        {client.nextVisit ? (
          <InfoRow
            icon="calendar-outline"
            label={t('crm.nextVisit')}
            value={formatDate(client.nextVisit)}
          />
        ) : null}
        <AppButton
          title={t('crm.call')}
          icon="call-outline"
          variant="outline"
          onPress={() => Alert.alert(t('crm.call'), t('crm.callStub'))}
        />
      </Card>

      {/* Абонемент */}
      <Card style={styles.section}>
        <View style={styles.subHead}>
          <View style={styles.sectionTitle}>
            <Ionicons name="card-outline" size={18} color={colors.purple} />
            <Text style={typography.h3}>{t('crm.subscription')}</Text>
          </View>
          <Ionicons name="add-circle-outline" size={22} color={colors.teal} onPress={() => topUpSubscription(client.id, 4)} />
        </View>
        {sub ? (
          <>
            <Text style={styles.subPlan}>{sub.plan}</Text>
            <ProgressBar value={(sub.sessionsUsed / sub.sessionsPaid) * 100} color={colors.purple} height={9} />
            <View style={styles.subStatsRow}>
              <Text style={styles.subStat}>
                {t('crm.sessionsLeft')}:{' '}
                <Text style={styles.subStrong}>{sub.sessionsPaid - sub.sessionsUsed}</Text> / {sub.sessionsPaid}
              </Text>
              <Text style={styles.subStat}>{sub.pricePerSession.toLocaleString('ru-RU')} ₸/занятие</Text>
            </View>
            <AppButton title={t('crm.topUp')} icon="add" variant="outline" onPress={() => topUpSubscription(client.id, 4)} />
          </>
        ) : (
          <Text style={styles.empty}>{t('crm.noSubscription')}</Text>
        )}
      </Card>

      {/* Запись на приём */}
      <AppButton title={t('crm.book')} icon="calendar" onPress={() => setBookOpen(true)} />

      {/* Этап воронки */}
      <Card style={styles.section}>
        <Text style={typography.h3}>{t('crm.stage')}</Text>
        <View style={styles.stageChips}>
          {CLIENT_STAGES.map((stage) => (
            <Chip
              key={stage}
              label={t(`stage.${stage}`)}
              color={STAGE_META[stage].color}
              selected={client.stage === stage}
              onPress={() => setClientStage(client.id, stage)}
            />
          ))}
        </View>
      </Card>

      {/* Специалисты */}
      <Card style={styles.section}>
        <Text style={typography.h3}>{t('crm.specialists')}</Text>
        {clientSpecialists.length === 0 ? (
          <Text style={styles.empty}>{t('crm.noSpecialists')}</Text>
        ) : (
          clientSpecialists.map((sp) => (
            <View key={sp.id} style={styles.specRow}>
              <Avatar name={sp.name} size={40} />
              <View style={styles.specInfo}>
                <Text style={styles.specName}>{sp.name}</Text>
                <Chip label={t(`spec.${sp.role}`)} color={ROLE_META[sp.role].color} />
              </View>
            </View>
          ))
        )}
      </Card>

      {/* История приёмов */}
      <Card style={styles.section}>
        <Text style={typography.h3}>{t('crm.appointmentsHistory')}</Text>
        {history.length === 0 ? (
          <EmptyState icon="calendar-outline" text={t('crm.noHistory')} />
        ) : (
          history.map((a) => {
            const sp = specialists.find((s) => s.id === a.specialistId);
            const statusColor =
              a.status === 'completed'
                ? colors.success
                : a.status === 'missed'
                  ? colors.danger
                  : colors.teal;
            return (
              <View key={a.id} style={styles.histRow}>
                <View style={styles.histDate}>
                  <Text style={styles.histDateText}>{formatDate(a.date)}</Text>
                  <Text style={styles.histTime}>{a.time}</Text>
                </View>
                <View style={styles.histInfo}>
                  <Text style={styles.histSpec} numberOfLines={1}>
                    {sp?.name}
                  </Text>
                  <Text style={styles.histMeta}>
                    {a.durationMin} {t('common.min')}
                  </Text>
                </View>
                <Chip
                  label={
                    a.status === 'completed'
                      ? t('crm.statusCompleted')
                      : a.status === 'missed'
                        ? t('crm.statusMissed')
                        : t('crm.statusScheduled')
                  }
                  color={statusColor}
                />
              </View>
            );
          })
        )}
      </Card>

      {/* Модалка записи на приём */}
      <Modal visible={bookOpen} transparent animationType="fade" onRequestClose={() => setBookOpen(false)}>
        <View style={styles.overlay}>
          <Card style={styles.bookModal}>
            <View style={styles.bookHead}>
              <Text style={typography.h2}>{t('crm.bookTitle')}</Text>
              <Pressable onPress={() => setBookOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.navy} />
              </Pressable>
            </View>

            <Text style={styles.pickLabel}>{t('crm.pickSpecialist')}</Text>
            <View style={styles.pickRow}>
              {(client.specialistIds.length > 0
                ? client.specialistIds
                : specialists.map((sp) => sp.id)
              )
                .map((spId) => specialists.find((sp) => sp.id === spId))
                .filter((sp): sp is NonNullable<typeof sp> => !!sp)
                .map((sp) => (
                  <Chip
                    key={sp.id}
                    label={sp.name.split(' ')[0]}
                    color={ROLE_META[sp.role].color}
                    selected={(bSpecialist ?? client.specialistIds[0]) === sp.id}
                    onPress={() => setBSpecialist(sp.id)}
                  />
                ))}
            </View>

            <Text style={styles.pickLabel}>{t('crm.pickDate')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickRow}>
              {bookDays.map((d) => (
                <Chip
                  key={d}
                  label={`${weekdayLabel(d, lang)} ${formatDateShort(d)}`}
                  color={colors.teal}
                  selected={bDate === d}
                  onPress={() => setBDate(d)}
                />
              ))}
            </ScrollView>

            <Text style={styles.pickLabel}>{t('crm.pickTime')}</Text>
            <View style={styles.pickRow}>
              {TIME_SLOTS.map((slot) => (
                <Chip key={slot} label={slot} color={colors.navy} selected={bTime === slot} onPress={() => setBTime(slot)} />
              ))}
            </View>

            <Text style={styles.pickLabel}>{t('crm.pickType')}</Text>
            <View style={styles.pickRow}>
              {APPT_TYPES.map((tp) => (
                <Chip key={tp} label={t(TYPE_KEY[tp])} color={colors.orange} selected={bType === tp} onPress={() => setBType(tp)} />
              ))}
            </View>

            <AppButton title={t('crm.bookSave')} icon="checkmark" onPress={saveBooking} />
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headInfo: { flex: 1, gap: 6 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoLabel: { fontSize: 13, color: colors.textSecondary, width: 110 },
  infoValue: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.navy },
  stageChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  empty: { fontSize: 13.5, color: colors.textSecondary, fontStyle: 'italic' },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  subHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subPlan: { fontSize: 15, fontWeight: '700', color: colors.navy },
  subStatsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subStat: { fontSize: 12.5, color: colors.textSecondary },
  subStrong: { fontWeight: '800', color: colors.navy },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 42, 110, 0.45)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  bookModal: { gap: spacing.sm },
  bookHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickLabel: { fontSize: 13, fontWeight: '700', color: colors.navy, marginTop: 4 },
  pickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  specRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  specInfo: { flex: 1, gap: 5 },
  specName: { fontSize: 14.5, fontWeight: '700', color: colors.navy },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  histDate: {
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    gap: 1,
  },
  histDateText: { fontSize: 12, fontWeight: '700', color: colors.navy },
  histTime: { fontSize: 12, color: colors.textSecondary },
  histInfo: { flex: 1, gap: 2 },
  histSpec: { fontSize: 13.5, fontWeight: '700', color: colors.navy },
  histMeta: { fontSize: 12, color: colors.textSecondary },
});
