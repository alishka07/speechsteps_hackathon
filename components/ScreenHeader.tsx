import { Ionicons } from '@/web/Icon';
import { useRouter } from '@/web/router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from '@/web/ui';

import { colors, spacing, typography } from '@/theme';

interface Props {
  title: string;
  subtitle?: string;
  /** Показать стрелку «назад». */
  back?: boolean;
  right?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, back, right }: Props) {
  const router = useRouter();
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {back ? (
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={colors.navy} />
          </Pressable>
        ) : null}
        <View style={styles.titles}>
          <Text style={typography.h1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: { flex: 1, gap: 4 },
  subtitle: { fontSize: 13.5, color: colors.textSecondary },
});
