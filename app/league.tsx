import { Ionicons } from '@/web/Icon';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from '@/web/ui';

import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { LEADERBOARD, LEAGUES, leagueFor } from '@/data/gamification';
import { XP_BY_CHILD } from '@/data/parent';
import { useT } from '@/i18n';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, spacing, typography } from '@/theme';

/** Лига и рейтинг недели (механика веб-версии, мок-данные). */
export default function LeagueScreen() {
  const t = useT();
  const parentChildId = useAppStore((s) => s.parentChildId);
  const child = useAppStore((s) => s.children.find((c) => c.id === parentChildId));

  const xp = XP_BY_CHILD[parentChildId] ?? 0;
  const { league, next } = leagueFor(xp);
  const toNext = next ? next.minXp - xp : 0;
  const progress = next
    ? ((xp - league.minXp) / (next.minXp - league.minXp)) * 100
    : 100;

  const board = useMemo(() => {
    const youName = child ? child.name.split(' ')[0] : t('gam.you');
    const rows = [...LEADERBOARD, { name: youName, xp }]
      .sort((a, b) => b.xp - a.xp)
      .map((row, i) => ({ ...row, rank: i + 1, you: row.name === youName }));
    return rows;
  }, [child, xp, t]);

  return (
    <Screen>
      <ScreenHeader title={t('gam.leagueRow')} back />

      {/* Текущая лига */}
      <Card style={styles.leagueCard}>
        <Text style={styles.bigEmoji}>{league.emoji}</Text>
        <Text style={typography.h2}>
          {t(league.nameKey)} {t('gam.league').toLowerCase()}
        </Text>
        <Text style={styles.xpText}>
          {xp} {t('gam.xp')}
        </Text>
        <ProgressBar value={progress} color={colors.purple} height={10} />
        <Text style={styles.toNext}>
          {next
            ? `${t('gam.toNextLeague')}: +${toNext} ${t('gam.xp')} (${t(next.nameKey)} ${next.emoji})`
            : t('gam.maxLeague')}
        </Text>
      </Card>

      {/* Все лиги */}
      <Card style={styles.allLeagues}>
        {LEAGUES.map((l) => {
          const active = l.id === league.id;
          return (
            <View key={l.id} style={[styles.leagueRow, active && styles.leagueRowActive]}>
              <Text style={styles.leagueRowEmoji}>{l.emoji}</Text>
              <Text style={[styles.leagueRowName, active && styles.leagueRowNameActive]}>
                {t(l.nameKey)}
              </Text>
              <Text style={styles.leagueRowXp}>{l.minXp}+ XP</Text>
              {active ? <Ionicons name="checkmark-circle" size={18} color={colors.purple} /> : null}
            </View>
          );
        })}
      </Card>

      {/* Рейтинг недели */}
      <Text style={typography.h2}>{t('gam.leaderboard')}</Text>
      <Card style={styles.board}>
        {board.map((row) => (
          <View key={`${row.rank}-${row.name}`} style={[styles.boardRow, row.you && styles.boardRowYou]}>
            <Text style={styles.rank}>{row.rank === 1 ? '👑' : row.rank}</Text>
            <Avatar name={row.name} size={36} />
            <Text style={[styles.boardName, row.you && styles.boardNameYou]} numberOfLines={1}>
              {row.name}
              {row.you ? ` (${t('gam.you')})` : ''}
            </Text>
            <Text style={styles.boardXp}>
              {row.xp} {t('gam.xp')}
            </Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  leagueCard: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  bigEmoji: { fontSize: 56 },
  xpText: { fontSize: 15, fontWeight: '700', color: colors.textSecondary },
  toNext: { fontSize: 12.5, color: colors.textSecondary, textAlign: 'center' },
  allLeagues: { gap: 4 },
  leagueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  leagueRowActive: { backgroundColor: colors.purpleSoft },
  leagueRowEmoji: { fontSize: 20 },
  leagueRowName: { flex: 1, fontSize: 14.5, fontWeight: '600', color: colors.textSecondary },
  leagueRowNameActive: { color: colors.navy, fontWeight: '800' },
  leagueRowXp: { fontSize: 12.5, color: colors.textMuted, fontWeight: '600' },
  board: { gap: spacing.sm },
  boardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  boardRowYou: { backgroundColor: colors.tealSoft },
  rank: { width: 26, fontSize: 14, fontWeight: '800', color: colors.textSecondary, textAlign: 'center' },
  boardName: { flex: 1, fontSize: 14.5, fontWeight: '600', color: colors.navy },
  boardNameYou: { fontWeight: '800' },
  boardXp: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
});
