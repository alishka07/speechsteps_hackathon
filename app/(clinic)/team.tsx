import { Ionicons } from '@/web/Icon';
import React, { useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, View } from '@/web/ui';

import { AppButton } from '@/components/AppButton';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { LabeledInput } from '@/components/LabeledInput';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SPECIALIST_ROLES, SpecialistRole } from '@/data/clinic';
import { useT } from '@/i18n';
import { useAppStore } from '@/store/useAppStore';
import { colors, spacing, typography } from '@/theme';
import { ROLE_META } from '@/theme/categories';

/** CRM клиники, экран 2: команда специалистов всех направлений. */
export default function ClinicTeamScreen() {
  const t = useT();
  const specialists = useAppStore((s) => s.specialists);
  const inviteSpecialist = useAppStore((s) => s.inviteSpecialist);

  const [roleFilter, setRoleFilter] = useState<SpecialistRole | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<SpecialistRole>('speechTherapist');

  const filtered = useMemo(
    () => specialists.filter((s) => !roleFilter || s.role === roleFilter),
    [specialists, roleFilter],
  );

  const sendInvite = () => {
    if (!inviteName.trim()) return;
    inviteSpecialist(inviteName.trim(), inviteRole);
    setInviteName('');
    setInviteOpen(false);
    Alert.alert(t('clinic.inviteSent'), t('clinic.inviteSentBody'));
  };

  return (
    <Screen>
      <ScreenHeader title={t('ctabs.team')} subtitle={t('crm.teamSubtitle')} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        <Chip
          label={t('library.all')}
          color={colors.navy}
          selected={roleFilter === null}
          onPress={() => setRoleFilter(null)}
        />
        {SPECIALIST_ROLES.map((role) => (
          <Chip
            key={role}
            label={t(`spec.${role}`)}
            color={ROLE_META[role].color}
            selected={roleFilter === role}
            onPress={() => setRoleFilter(roleFilter === role ? null : role)}
          />
        ))}
      </ScrollView>

      <AppButton
        title={t('crm.inviteSpecialist')}
        icon="person-add-outline"
        onPress={() => setInviteOpen(true)}
      />

      {filtered.map((sp) => {
        const meta = ROLE_META[sp.role];
        return (
          <Card key={sp.id} style={styles.card}>
            <View style={styles.head}>
              <Avatar name={sp.name} size={48} />
              <View style={styles.info}>
                <Text style={styles.name}>{sp.name}</Text>
                <View style={styles.tags}>
                  <Chip label={t(`spec.${sp.role}`)} color={meta.color} />
                  {sp.status !== 'active' ? (
                    <Chip
                      label={sp.status === 'invited' ? t('clinic.statusInvited') : t('crm.statusVacation')}
                      color={colors.warning}
                    />
                  ) : null}
                </View>
              </View>
              {sp.rating > 0 ? (
                <View style={styles.rating}>
                  <Ionicons name="star" size={13} color={colors.gold} />
                  <Text style={styles.ratingText}>{sp.rating.toFixed(1)}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.loadRow}>
              <Text style={styles.loadLabel}>
                {sp.clients} {t('crm.clientsShort')} · {t('crm.load')} {sp.loadPercent}%
              </Text>
              <ProgressBar
                value={sp.loadPercent}
                color={sp.loadPercent > 80 ? colors.orange : meta.color}
                height={8}
              />
            </View>
          </Card>
        );
      })}

      {/* Приглашение специалиста */}
      <Modal visible={inviteOpen} transparent animationType="fade" onRequestClose={() => setInviteOpen(false)}>
        <View style={styles.overlay}>
          <Card style={styles.modal}>
            <Text style={typography.h2}>{t('crm.inviteSpecialist')}</Text>
            <LabeledInput
              label={t('crm.inviteName')}
              value={inviteName}
              onChangeText={setInviteName}
              placeholder="Сауле Ермекова"
            />
            <View style={styles.roleBlock}>
              <Text style={styles.roleLabel}>{t('crm.inviteRole')}</Text>
              <View style={styles.roleChips}>
                {SPECIALIST_ROLES.map((role) => (
                  <Chip
                    key={role}
                    label={t(`spec.${role}`)}
                    color={ROLE_META[role].color}
                    selected={inviteRole === role}
                    onPress={() => setInviteRole(role)}
                  />
                ))}
              </View>
            </View>
            <AppButton title={t('clinic.inviteSend')} icon="paper-plane-outline" onPress={sendInvite} />
            <AppButton title={t('common.cancel')} variant="ghost" onPress={() => setInviteOpen(false)} />
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { gap: spacing.sm, paddingVertical: 2 },
  card: { gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  info: { flex: 1, gap: 5 },
  name: { fontSize: 15.5, fontWeight: '700', color: colors.navy },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 13.5, fontWeight: '800', color: colors.navy },
  loadRow: { gap: 6 },
  loadLabel: { fontSize: 12.5, color: colors.textSecondary },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 42, 110, 0.45)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modal: { gap: spacing.md },
  roleBlock: { gap: spacing.sm },
  roleLabel: { fontSize: 14, fontWeight: '700', color: colors.navy },
  roleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
