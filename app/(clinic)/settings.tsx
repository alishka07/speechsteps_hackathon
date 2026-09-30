import { Ionicons } from '@/web/Icon';
import { useRouter } from '@/web/router';
import React from 'react';
import { Alert, StyleSheet, Text, View } from '@/web/ui';

import { AppButton } from '@/components/AppButton';
import { Card } from '@/components/Card';
import { LangSwitch } from '@/components/LangSwitch';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { CLINIC } from '@/data/clinic';
import { useT } from '@/i18n';
import { colors, spacing, typography } from '@/theme';

/** CRM клиники, экран 5: профиль клиники, тариф, язык. */
export default function ClinicSettingsScreen() {
  const t = useT();
  const router = useRouter();

  return (
    <Screen>
      <ScreenHeader title={t('ctabs.settings')} right={<LangSwitch />} />

      <Card style={styles.identity}>
        <View style={styles.logoBox}>
          <Ionicons name="business" size={28} color={colors.navy} />
        </View>
        <View style={styles.identityInfo}>
          <Text style={typography.h2}>{CLINIC.name}</Text>
          <Text style={styles.code}>{CLINIC.code}</Text>
        </View>
      </Card>

      <Card style={styles.planCard}>
        <View style={styles.planHead}>
          <View style={styles.planTitleRow}>
            <Ionicons name="ribbon-outline" size={18} color={colors.purple} />
            <Text style={typography.h3}>
              {t('clinic.plan')}: {t('clinic.planName')}
            </Text>
          </View>
          <Text style={styles.planPrice}>{t('clinic.planPrice')}</Text>
        </View>
        <Text style={styles.planDesc}>{t('clinic.planDesc')}</Text>
        <AppButton
          title={t('clinic.changePlan')}
          variant="outline"
          onPress={() => Alert.alert(t('clinic.plan'), t('login.stub'))}
        />
      </Card>

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
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  logoBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.navySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityInfo: { flex: 1, gap: 4 },
  code: { fontSize: 14, fontWeight: '800', color: colors.purple, letterSpacing: 2 },
  planCard: { gap: spacing.md, backgroundColor: colors.purpleSoft },
  planHead: { gap: 4 },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  planPrice: { fontSize: 18, fontWeight: '800', color: colors.purple },
  planDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  langCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  langText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.navy },
});
