import { Ionicons } from '@/web/Icon';
import { useRouter } from '@/web/router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from '@/web/ui';
import { LineChart } from '@/web/charts';

import { ai } from '@/ai';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { ChildSwitcher } from '@/components/ChildSwitcher';
import { LangSwitch } from '@/components/LangSwitch';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { StatTile } from '@/components/StatTile';
import { WorldProgressCard } from '@/components/WorldProgressCard';
import {
  ACHIEVEMENTS,
  dailyQuests,
  isUnlocked,
  leagueFor,
  levelInfo,
} from '@/data/gamification';
import {
  LESSON_TOTALS,
  MONTHLY_ACCURACY,
  SOUND_STATS,
  STREAKS,
  WEEKLY_ACCURACY,
  XP_BY_CHILD,
  monthShort,
  weekLabel,
} from '@/data/parent';
import { formatAge, useT } from '@/i18n';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, scoreColor, spacing, typography } from '@/theme';

/** Родитель, экран 1: дашборд прогресса с геймификацией. */
export default function ParentDashboardScreen() {
  const t = useT();
  const router = useRouter();
  const lang = useAppStore((s) => s.lang);
  const parent = useAppStore((s) => s.parent);
  const therapist = useAppStore((s) => s.therapist);
  const parentChildId = useAppStore((s) => s.parentChildId);
  const child = useAppStore((s) => s.children.find((c) => c.id === parentChildId));

  const soundStats = SOUND_STATS[parentChildId] ?? [];
  const streak = STREAKS[parentChildId] ?? 0;
  const xp = XP_BY_CHILD[parentChildId] ?? 0;
  const lessonTotals = LESSON_TOTALS[parentChildId] ?? { done: 0, total: 0 };
  const weekly = WEEKLY_ACCURACY[parentChildId] ?? [];
  const accuracy = weekly[weekly.length - 1] ?? 0;
  const accuracyDelta = weekly.length > 1 ? accuracy - weekly[weekly.length - 2] : 0;

  const level = levelInfo(xp);
  const { league } = leagueFor(xp);
  const todayIso = new Date().toISOString().slice(0, 10);
  const quests = useMemo(() => dailyQuests(parentChildId, todayIso), [parentChildId, todayIso]);

  const gamStats = { streak, xp, level: level.level, lessonsDone: lessonTotals.done };

  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const accuracyData = useMemo(() => {
    if (period === 'month') {
      const m = MONTHLY_ACCURACY[parentChildId] ?? [];
      return m.map((value, i) => ({ value, label: monthShort(i, lang) }));
    }
    return weekly.map((value, i) => ({ value, label: weekLabel(i, lang) }));
  }, [period, weekly, parentChildId, lang]);

  // Рекомендации от ИИ-заглушки на основе слабых звуков ребёнка.
  const [tips, setTips] = useState<string[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    setTips(null);
    ai.generateRecommendations(soundStats.map((s) => ({ sound: s.sound, accuracy: s.accuracy })))
      .then((result) => {
        if (!cancelled) setTips(result);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentChildId]);

  if (!child) return <Screen>{null}</Screen>;

  const today = child.daily[child.daily.length - 1];

  return (
    <Screen>
      {/* Персиковая шапка */}
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <Text style={styles.heroHello}>
            {t('parent.hello')}, {parent.name.split(' ')[0]}!
          </Text>
          <LangSwitch />
        </View>
        <View style={styles.heroChild}>
          <Avatar name={child.name} size={52} />
          <View style={styles.heroChildInfo}>
            <Text style={styles.heroChildLabel}>{t('parent.yourChild')}</Text>
            <Text style={styles.heroChildName}>
              {child.name.split(' ')[0]}, {formatAge(child.age, lang)}
            </Text>
          </View>
        </View>
        <ChildSwitcher onLight />
      </View>

      {/* Вход в детский режим «Остров Эха» — после подтверждения присутствия */}
      <Pressable
        onPress={() =>
          Alert.alert(t('childMode.presenceTitle'), t('childMode.presenceBody'), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('childMode.presenceConfirm'), onPress: () => router.push('/play-world') },
          ])
        }
        style={({ pressed }) => pressed && { opacity: 0.9 }}
      >
        <Card style={styles.gameCard}>
          <View style={styles.gameIcon}>
            <Text style={styles.gameEmoji}>🏝️</Text>
          </View>
          <View style={styles.rowCardInfo}>
            <Text style={styles.rowCardTitle}>{t('childMode.card')}</Text>
            <Text style={styles.rowCardMeta}>{t('childMode.cardHint')}</Text>
          </View>
          <View style={styles.gamePlay}>
            <Ionicons name="play" size={18} color={colors.white} />
          </View>
        </Card>
      </Pressable>

      {/* Результаты 3D-мира */}
      <WorldProgressCard childId={parentChildId} style={styles.section} allowReset />

      {/* Домашняя практика — простые упражнения без оценки */}
      <Pressable
        onPress={() => router.push('/home-practice')}
        style={({ pressed }) => pressed && { opacity: 0.9 }}
      >
        <Card style={styles.homeCard}>
          <View style={styles.homeIcon}>
            <Text style={styles.gameEmoji}>🏠</Text>
          </View>
          <View style={styles.rowCardInfo}>
            <Text style={styles.rowCardTitle}>{t('home.card')}</Text>
            <Text style={styles.rowCardMeta}>{t('home.cardHint')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Card>
      </Pressable>

      {/* Уровень и XP */}
      <Card style={styles.levelCard}>
        <View style={styles.levelHead}>
          <View style={styles.levelBadge}>
            <Ionicons name="trophy" size={16} color={colors.gold} />
            <Text style={styles.levelBadgeText}>
              {t('gam.level')} {level.level}
            </Text>
          </View>
          <Text style={styles.levelXp}>
            {level.current} / {level.needed} {t('gam.xp')}
          </Text>
        </View>
        <ProgressBar value={level.progress} color={colors.teal} height={10} />
        <Text style={styles.levelHint}>
          {t('gam.toLevel')} {level.level + 1}: +{level.needed - level.current} {t('gam.xp')}
        </Text>
      </Card>

      {/* Плитки статистики 2×2 */}
      <View style={styles.statsRow}>
        <StatTile
          icon="flame"
          value={`${streak} ${t('gam.daysShort')}`}
          label={t('gam.streak')}
          color={colors.orange}
          bg={colors.orangeSoft}
        />
        <StatTile
          icon="star"
          value={String(xp)}
          label={t('gam.xp')}
          color={colors.gold}
          bg={colors.goldSoft}
        />
      </View>
      <View style={styles.statsRow}>
        <StatTile
          icon="book"
          value={`${lessonTotals.done}/${lessonTotals.total}`}
          label={t('gam.lessons')}
          color={colors.teal}
          bg={colors.tealSoft}
        />
        <StatTile
          icon="pulse"
          value={`${accuracy}%`}
          label={`${t('gam.accuracy')} ↗ +${accuracyDelta}%`}
          color={colors.success}
          bg={colors.successSoft}
        />
      </View>

      {/* Сводка за сегодня */}
      <Card style={styles.section}>
        <SectionTitle icon="sunny-outline" color={colors.orange} title={t('parent.todaySummary')} />
        <View style={styles.statsRow}>
          <StatTile
            icon="time-outline"
            value={`${today?.minutes ?? 0}${t('common.minShort')}`}
            label={t('child.timeToday')}
            color={colors.teal}
            bg={colors.tealSoft}
          />
          <StatTile
            icon="checkmark-circle-outline"
            value={String(today?.tasks ?? 0)}
            label={t('child.tasksToday')}
            color={colors.success}
            bg={colors.successSoft}
          />
        </View>
      </Card>

      {/* Задания дня */}
      <Card style={styles.section}>
        <View style={styles.questsHead}>
          <SectionTitle icon="flag-outline" color={colors.purple} title={t('gam.dailyQuests')} />
          <Text style={styles.questsHint}>{t('gam.questsHint')}</Text>
        </View>
        {quests.map(({ def, progress, done }) => (
          <View key={def.id} style={styles.questRow}>
            <Text style={styles.questEmoji}>{def.emoji}</Text>
            <View style={styles.questBody}>
              <View style={styles.questHead}>
                <Text style={[styles.questTitle, done && styles.questDone]} numberOfLines={1}>
                  {t(def.titleKey)}
                </Text>
                <View style={styles.xpPill}>
                  <Text style={styles.xpPillText}>+{def.xpReward} XP</Text>
                </View>
              </View>
              <View style={styles.questProgressRow}>
                <ProgressBar
                  value={(progress / def.target) * 100}
                  color={done ? colors.success : colors.purple}
                  height={7}
                />
                <Text style={styles.questCount}>
                  {progress}/{def.target}
                </Text>
              </View>
            </View>
            {done ? <Ionicons name="checkmark-circle" size={22} color={colors.success} /> : null}
          </View>
        ))}
      </Card>

      {/* Точность произношения: неделя / месяц */}
      <Card style={styles.section}>
        <View style={styles.accuracyHead}>
          <SectionTitle
            icon="trending-up-outline"
            color={colors.teal}
            title={t('parent.accuracyTitle')}
          />
          <View style={styles.periodToggle}>
            {(['week', 'month'] as const).map((p) => (
              <Pressable
                key={p}
                onPress={() => setPeriod(p)}
                style={[styles.periodPill, period === p && styles.periodPillActive]}
              >
                <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                  {t(p === 'week' ? 'parent.periodWeek' : 'parent.periodMonth')}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <LineChart
          data={accuracyData}
          color={colors.teal}
          thickness={3}
          dataPointsColor={colors.teal}
          maxValue={100}
          noOfSections={4}
          height={150}
          spacing={48}
          initialSpacing={18}
          yAxisThickness={0}
          xAxisThickness={0}
          yAxisTextStyle={styles.axisText}
          xAxisLabelTextStyle={styles.axisText}
          areaChart
          startFillColor={colors.teal}
          startOpacity={0.22}
          endFillColor={colors.teal}
          endOpacity={0.02}
          curved
          isAnimated
        />
      </Card>

      {/* По каждому звуку */}
      <Card style={styles.section}>
        <SectionTitle icon="mic-outline" color={colors.purple} title={t('parent.bySound')} />
        {soundStats.map((s) => {
          const palette = scoreColor(s.accuracy);
          return (
            <View key={s.sound} style={styles.soundRow}>
              <View style={[styles.soundBadge, { backgroundColor: palette.bg }]}>
                <Text style={[styles.soundLetter, { color: palette.fg }]}>{s.sound}</Text>
              </View>
              <View style={styles.soundBody}>
                <View style={styles.soundHead}>
                  <Text style={styles.soundPercent}>{s.accuracy}%</Text>
                  <Text style={styles.soundMeta}>
                    <Ionicons name="trending-up" size={11} color={colors.success} />{' '}
                    <Text style={styles.soundDelta}>+{s.delta}%</Text> · {s.attempts}{' '}
                    {t('parent.attemptsShort')}
                  </Text>
                </View>
                <ProgressBar value={s.accuracy} color={palette.fg} height={9} />
              </View>
            </View>
          );
        })}
      </Card>

      {/* Достижения */}
      <Card style={styles.section}>
        <SectionTitle icon="trophy-outline" color={colors.gold} title={t('gam.achievements')} />
        <View style={styles.achGrid}>
          {ACHIEVEMENTS.map((a) => {
            const unlocked = isUnlocked(a, gamStats);
            return (
              <View key={a.id} style={[styles.achItem, !unlocked && styles.achLocked]}>
                <View style={[styles.achEmoji, !unlocked && styles.achEmojiLocked]}>
                  <Text style={styles.achEmojiText}>{unlocked ? a.emoji : '🔒'}</Text>
                </View>
                <Text
                  style={[styles.achTitle, !unlocked && styles.achTitleLocked]}
                  numberOfLines={2}
                >
                  {t(a.titleKey)}
                </Text>
                {!unlocked ? <Text style={styles.achLockedHint}>{t('gam.locked')}</Text> : null}
              </View>
            );
          })}
        </View>
      </Card>

      {/* Лига */}
      <Pressable onPress={() => router.push('/league')} style={({ pressed }) => pressed && { opacity: 0.9 }}>
        <Card style={styles.rowCard}>
          <Text style={styles.leagueEmoji}>{league.emoji}</Text>
          <View style={styles.rowCardInfo}>
            <Text style={styles.rowCardTitle}>{t('gam.leagueRow')}</Text>
            <Text style={styles.rowCardMeta}>
              {t(league.nameKey)} {t('gam.league').toLowerCase()} · {xp} {t('gam.xp')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Card>
      </Pressable>

      {/* Написать логопеду */}
      <Pressable
        onPress={() => router.push('/parent-chat')}
        style={({ pressed }) => pressed && { opacity: 0.9 }}
      >
        <Card style={styles.rowCard}>
          <View style={styles.chatIcon}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.teal} />
          </View>
          <View style={styles.rowCardInfo}>
            <Text style={styles.rowCardTitle}>{t('parent.messageTherapist')}</Text>
            <Text style={styles.rowCardMeta}>{therapist.name}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Card>
      </Pressable>

      {/* Рекомендации (ИИ-заглушка) */}
      <Card style={[styles.section, styles.recoCard]}>
        <View style={styles.recoHeader}>
          <View style={styles.recoTitleRow}>
            <Ionicons name="sparkles" size={16} color={colors.purple} />
            <Text style={[typography.h3, { color: colors.purple }]}>
              {t('parent.recommendations')}
            </Text>
          </View>
          <Text style={styles.recoHint}>{t('parent.recommendationsHint')}</Text>
        </View>
        {tips === null ? (
          <View style={styles.recoLoading}>
            <ActivityIndicator color={colors.purple} />
            <Text style={styles.recoLoadingText}>{t('parent.recoLoading')}</Text>
          </View>
        ) : (
          tips.map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Ionicons name="bulb-outline" size={16} color={colors.purple} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}

function SectionTitle({
  icon,
  color,
  title,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
}) {
  return (
    <View style={styles.sectionTitle}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={typography.h3}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.peach,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroHello: { fontSize: 16, fontWeight: '800', color: colors.white },
  heroChild: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroChildInfo: { gap: 2 },
  heroChildLabel: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  heroChildName: { fontSize: 19, fontWeight: '800', color: colors.white },

  levelCard: { gap: spacing.sm, backgroundColor: colors.goldSoft },
  levelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  levelBadgeText: { fontSize: 16, fontWeight: '800', color: colors.navy },
  levelXp: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  levelHint: { fontSize: 12, color: colors.textSecondary },

  section: { gap: spacing.md },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  axisText: { fontSize: 12, color: colors.textMuted },
  accuracyHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  periodToggle: {
    flexDirection: 'row',
    backgroundColor: colors.inputBg,
    borderRadius: radius.full,
    padding: 3,
  },
  periodPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.full },
  periodPillActive: { backgroundColor: colors.teal },
  periodText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  periodTextActive: { color: colors.white },

  questsHead: { gap: 4 },
  questsHint: { fontSize: 12, color: colors.textMuted },
  questRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  questEmoji: { fontSize: 22 },
  questBody: { flex: 1, gap: 6 },
  questHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  questTitle: { flex: 1, fontSize: 13.5, fontWeight: '700', color: colors.navy },
  questDone: { textDecorationLine: 'line-through', color: colors.textMuted },
  xpPill: {
    backgroundColor: colors.goldSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  xpPillText: { fontSize: 12, fontWeight: '800', color: colors.gold },
  questProgressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  questCount: { fontSize: 12, fontWeight: '700', color: colors.textMuted, width: 38 },

  soundRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  soundBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundLetter: { fontSize: 18, fontWeight: '800' },
  soundBody: { flex: 1, gap: 6 },
  soundHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  soundPercent: { fontSize: 15, fontWeight: '800', color: colors.navy },
  soundMeta: { fontSize: 12, color: colors.textMuted },
  soundDelta: { color: colors.success, fontWeight: '700' },

  achGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  achItem: {
    width: '30%',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
  },
  achLocked: { opacity: 0.75 },
  achEmoji: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achEmojiLocked: { backgroundColor: colors.border },
  achEmojiText: { fontSize: 24 },
  achTitle: { fontSize: 12, fontWeight: '700', color: colors.navy, textAlign: 'center' },
  achTitleLocked: { color: colors.textMuted },
  achLockedHint: { fontSize: 12, color: colors.textMuted },

  rowCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowCardInfo: { flex: 1, gap: 2 },
  rowCardTitle: { fontSize: 15, fontWeight: '700', color: colors.navy },
  rowCardMeta: { fontSize: 12.5, color: colors.textSecondary },
  leagueEmoji: { fontSize: 28 },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.tealSoft,
    borderWidth: 1.5,
    borderColor: colors.teal,
  },
  gameIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameEmoji: { fontSize: 26 },
  homeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.peachSoft,
  },
  homeIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gamePlay: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  recoCard: { backgroundColor: colors.purpleSoft },
  recoHeader: { gap: 4 },
  recoTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  recoHint: { fontSize: 12, color: colors.textSecondary },
  recoLoading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  recoLoadingText: { fontSize: 13.5, color: colors.purple, fontWeight: '600' },
  tipRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  tipText: { flex: 1, fontSize: 13.5, color: colors.navy, lineHeight: 20 },
});
