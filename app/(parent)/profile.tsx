import { Ionicons } from '@/web/Icon';
import { useRouter } from '@/web/router';
import React from 'react';
import { StyleSheet, Text, View } from '@/web/ui';

import { AppButton } from '@/components/AppButton';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { ChildSwitcher } from '@/components/ChildSwitcher';
import { Chip } from '@/components/Chip';
import { LangSwitch } from '@/components/LangSwitch';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { formatAge, formatDate, useT } from '@/i18n';
import { useAppStore } from '@/store/useAppStore';
import { colors, spacing, typography } from '@/theme';

/** Родитель, экран 4: профиль — родитель, ребёнок, логопед, язык. */
export default function ParentProfileScreen() {
  const t = useT();
  const router = useRouter();
  const lang = useAppStore((s) => s.lang);
  const parent = useAppStore((s) => s.parent);
  const therapist = useAppStore((s) => s.therapist);
  const parentChildId = useAppStore((s) => s.parentChildId);
  const child = useAppStore((s) => s.children.find((c) => c.id === parentChildId));

  return (
    <Screen>
      <ScreenHeader title={t('ptabs.profile')} right={<LangSwitch />} />

      {/* Родитель */}
      <Card style={styles.row}>
        <Avatar name={parent.name} size={56} />
        <View style={styles.info}>
          <Text style={typography.h2}>{parent.name}</Text>
          <Chip label={`${t('parent.profileParent')} · ${parent.relation}`} color={colors.peachDark} />
        </View>
      </Card>

      {/* Ребёнок */}
      <Text style={typography.h3}>{t('parent.profileChild')}</Text>
      <ChildSwitcher />
      {child ? (
        <Card style={styles.childCard}>
          <View style={styles.row2}>
            <Avatar name={child.name} size={48} />
            <View style={styles.info}>
              <Text style={styles.childName}>{child.name}</Text>
              <Text style={styles.meta}>
                {formatAge(child.age, lang)} · {t('child.connected')}:{' '}
                {formatDate(child.connectedAt)}
              </Text>
            </View>
          </View>
          <View style={styles.tags}>
            <Text style={styles.tagsLabel}>{t('addChild.diagnosis')}:</Text>
            {child.diagnoses.map((d) => (
              <Chip key={d} label={t(`diagnosis.${d}`)} color={colors.orange} />
            ))}
          </View>
        </Card>
      ) : null}

      {/* Логопед */}
      <Text style={typography.h3}>{t('parent.profileTherapist')}</Text>
      <Card style={styles.row}>
        <Avatar name={therapist.name} size={48} />
        <View style={styles.info}>
          <Text style={styles.childName}>{therapist.name}</Text>
          <View style={styles.therapistRow}>
            <Ionicons name="medkit-outline" size={13} color={colors.purple} />
            <Text style={styles.therapistId}>{therapist.id}</Text>
          </View>
        </View>
        <Chip label={t('profile.role')} color={colors.purple} />
      </Card>

      {/* Язык */}
      <Card style={styles.langCard}>
        <Ionicons name="language-outline" size={20} color={colors.navy} />
        <Text style={styles.langText}>{t('profile.language')}</Text>
        <LangSwitch />
      </Card>

      <AppButton
        title={t('profile.signOut')}
        icon="log-out-outline"
        variant="outline"
        onPress={() => router.replace('/')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  row2: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  info: { flex: 1, gap: 6 },
  childCard: { gap: spacing.md },
  childName: { fontSize: 16, fontWeight: '700', color: colors.navy },
  meta: { fontSize: 12.5, color: colors.textSecondary },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  tagsLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  therapistRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  therapistId: { fontSize: 13, fontWeight: '700', color: colors.purple, letterSpacing: 1 },
  langCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  langText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.navy },
});
