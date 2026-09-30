import { Ionicons } from '@/web/Icon';
import { useRouter } from '@/web/router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from '@/web/ui';

import { Card } from '@/components/Card';
import { LangSwitch } from '@/components/LangSwitch';
import { Screen } from '@/components/Screen';
import { useT } from '@/i18n';
import { colors, radius, spacing, typography } from '@/theme';

/** Стартовый экран выбора роли: Логопед / Родитель. */
export default function RoleSelectScreen() {
  const t = useT();
  const router = useRouter();

  return (
    <Screen>
      <View style={styles.top}>
        <View style={styles.badge}>
          <Ionicons name="sparkles" size={13} color={colors.teal} />
          <Text style={styles.badgeText}>{t('appName')}</Text>
        </View>
        <LangSwitch />
      </View>

      <View style={styles.titles}>
        <Text style={[typography.h1, styles.title]}>{t('role.title')}</Text>
        <Text style={styles.subtitle}>{t('role.subtitle')}</Text>
      </View>

      <RoleCard
        icon="medkit-outline"
        color={colors.purple}
        bg={colors.purpleSoft}
        title={t('role.therapist')}
        description={t('role.therapistDesc')}
        cta={t('role.enter')}
        onPress={() => router.push('/therapist-login')}
      />

      <RoleCard
        icon="heart-outline"
        color={colors.peach}
        bg={colors.peachSoft}
        title={t('role.parent')}
        description={t('role.parentDesc')}
        cta={t('role.enter')}
        onPress={() => router.replace('/(parent)')}
      />

      <RoleCard
        icon="business-outline"
        color={colors.navy}
        bg={colors.navySoft}
        title={t('role.clinic')}
        description={t('role.clinicDesc')}
        cta={t('role.enter')}
        onPress={() => router.replace('/(clinic)')}
      />

      {/* Отдельный вход для ребёнка: сразу в игру «Остров Эха», без настройки. */}
      <RoleCard
        icon="game-controller-outline"
        color={colors.teal}
        bg={colors.tealSoft}
        title={t('role.child')}
        description={t('role.childDesc')}
        cta={t('role.play')}
        onPress={() => router.push('/play-world')}
      />

      {/* Вертикальный срез «Шахта звуков»: звук Р, уровень «слово», 10 слов. */}
      <RoleCard
        icon="diamond-outline"
        color={colors.purple}
        bg={colors.purpleSoft}
        title="Шахта звуков"
        description="Добывай кристаллы голосом: звук Р, уровень «слово»"
        cta={t('role.play')}
        onPress={() => router.push('/play-soundmine')}
      />
    </Screen>
  );
}

function RoleCard({
  icon,
  color,
  bg,
  title,
  description,
  cta,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  title: string;
  description: string;
  cta: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.9 }}>
      <Card style={styles.roleCard}>
        <View style={[styles.iconBox, { backgroundColor: bg }]}>
          <Ionicons name={icon} size={28} color={color} />
        </View>
        <Text style={typography.h2}>{title}</Text>
        <Text style={styles.roleDesc}>{description}</Text>
        <View style={[styles.cta, { backgroundColor: color }]}>
          <Text style={styles.ctaText}>{cta}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.white} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.tealSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  badgeText: { fontSize: 12.5, fontWeight: '700', color: colors.teal },
  titles: { alignItems: 'center', gap: spacing.sm, marginVertical: spacing.lg },
  title: { textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  roleCard: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleDesc: {
    fontSize: 13.5,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: spacing.lg,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.xl,
    paddingVertical: 10,
    borderRadius: radius.full,
  },
  ctaText: { color: colors.white, fontWeight: '700', fontSize: 14 },
});
