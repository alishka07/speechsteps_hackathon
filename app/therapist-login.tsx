import { Ionicons } from '@/web/Icon';
import { useRouter } from '@/web/router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from '@/web/ui';

import { AppButton } from '@/components/AppButton';
import { Card } from '@/components/Card';
import { LabeledInput } from '@/components/LabeledInput';
import { LangSwitch } from '@/components/LangSwitch';
import { Screen } from '@/components/Screen';
import { useT } from '@/i18n';
import { colors, radius, spacing, typography } from '@/theme';

/** Экран входа логопеда. Без сети: кнопка «Войти» ведёт в кабинет. */
export default function TherapistLoginScreen() {
  const t = useT();
  const router = useRouter();
  const [email, setEmail] = useState('amiralialtai07@gmail.com');
  const [password, setPassword] = useState('demo12345');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const signIn = () => {
    setLoading(true);
    // Имитация авторизации — просто короткая задержка.
    setTimeout(() => {
      setLoading(false);
      router.replace('/(tabs)');
    }, 700);
  };

  const stub = () => Alert.alert(t('appName'), t('login.stub'));

  return (
    <Screen>
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color={colors.navy} />
        </Pressable>
        <View style={styles.badge}>
          <Ionicons name="medkit-outline" size={14} color={colors.purple} />
          <Text style={styles.badgeText}>{t('login.badge')}</Text>
        </View>
        <LangSwitch />
      </View>

      <Card style={styles.card}>
        <Text style={typography.h1}>{t('login.title')}</Text>
        <Text style={styles.subtitle}>{t('login.subtitle')}</Text>

        <LabeledInput
          label={t('login.email')}
          required
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <View>
          <LabeledInput
            label={t('login.password')}
            required
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={colors.textMuted}
            style={styles.eye}
            onPress={() => setShowPassword((v) => !v)}
          />
        </View>

        <AppButton
          title={loading ? t('login.signingIn') : t('login.signIn')}
          onPress={signIn}
          loading={loading}
        />

        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>{t('login.or')}</Text>
          <View style={styles.orLine} />
        </View>

        <AppButton title={t('login.google')} onPress={stub} variant="outline" icon="logo-google" />

        <Text style={styles.link} onPress={stub}>
          {t('login.forgot')}
        </Text>
        <Text style={styles.footer}>
          {t('login.noAccount')}{' '}
          <Text style={styles.footerLink} onPress={stub}>
            {t('login.create')}
          </Text>
        </Text>
      </Card>

      <Text style={styles.demoHint}>{t('login.demoHint')}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.purpleSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    flex: 1,
    justifyContent: 'center',
  },
  badgeText: { fontSize: 12.5, fontWeight: '700', color: colors.purple },
  card: { gap: spacing.lg, marginTop: spacing.md },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: -spacing.sm },
  eye: { position: 'absolute', right: 14, top: 38 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  link: { textAlign: 'center', color: colors.orange, fontWeight: '600', fontSize: 14 },
  footer: { textAlign: 'center', color: colors.textSecondary, fontSize: 14 },
  footerLink: { color: colors.purple, fontWeight: '700' },
  demoHint: { textAlign: 'center', fontSize: 12, color: colors.textMuted },
});
