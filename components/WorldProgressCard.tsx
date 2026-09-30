import { Ionicons } from '@/web/Icon';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from '@/web/ui';

import { Card } from '@/components/Card';
import { parseWorldProgress } from '@/data/worldProgress';
import { deleteWorldProgress, pullWorldProgress, worldSyncEnabled } from '@/lib/worldSync';
import { useAppStore } from '@/store/useAppStore';
import { colors, display, radius, spacing, typography } from '@/theme';

const STAGES: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: 'megaphone-outline', label: 'Крик' },
  { icon: 'swap-horizontal-outline', label: 'Мост' },
  { icon: 'cloudy-outline', label: 'Полёт' },
  { icon: 'gift-outline', label: 'Сундук' },
];

/** Метка времени обновления: «14.06 в 12:30». */
function formatUpdated(ts: number): string {
  const d = new Date(ts);
  const p2 = (n: number) => String(n).padStart(2, '0');
  return `${p2(d.getDate())}.${p2(d.getMonth() + 1)} в ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

/**
 * Сводка прогресса 3D-мира «Остров Эха» для ребёнка — для экранов
 * логопеда (карточка клиента) и родителя. Читает worldStateByChild,
 * подтягивает облако и (опц.) даёт кнопку сброса прогресса.
 */
export function WorldProgressCard({
  childId,
  style,
  allowReset,
}: {
  childId: string;
  style?: ViewStyle;
  allowReset?: boolean;
}) {
  const json = useAppStore((s) => s.worldStateByChild[childId]);
  const updatedAt = useAppStore((s) => s.worldUpdatedAt[childId]);
  const mergeRemoteWorldState = useAppStore((s) => s.mergeRemoteWorldState);
  const clearWorldState = useAppStore((s) => s.clearWorldState);
  const p = parseWorldProgress(json);
  const [confirming, setConfirming] = useState(false);

  const handleReset = () => {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3500);
      return;
    }
    setConfirming(false);
    clearWorldState(childId);
    deleteWorldProgress(childId); // офлайн-safe
  };

  // Подтягиваем прогресс из облака (если синк включён): логопед/родитель
  // видят то, что ребёнок наиграл на своём устройстве. Берём только если новее.
  useEffect(() => {
    let active = true;
    pullWorldProgress(childId).then((res) => {
      if (active && res) mergeRemoteWorldState(childId, res.state, res.updatedAt);
    });
    return () => {
      active = false;
    };
  }, [childId, mergeRemoteWorldState]);

  return (
    <Card style={StyleSheet.flatten([styles.card, style])}>
      <View style={styles.head}>
        <View style={styles.titleRow}>
          <View style={styles.iconBox}>
            <Ionicons name="game-controller" size={16} color={colors.purple} />
          </View>
          <Text style={typography.h3}>Остров Эха · 3D</Text>
        </View>
        {p.completed ? (
          <View style={[styles.badge, { backgroundColor: colors.successSoft }]}>
            <Ionicons name="trophy" size={13} color={colors.success} />
            <Text style={[styles.badgeText, { color: colors.success }]}>100%</Text>
          </View>
        ) : p.started ? (
          <View style={[styles.badge, { backgroundColor: colors.tealSoft }]}>
            <Text style={[styles.badgeText, { color: colors.teal }]}>В игре</Text>
          </View>
        ) : null}
      </View>

      {p.started ? (
        <>
          <View style={styles.stages}>
            {STAGES.map((s, i) => {
              const done = i < p.stages;
              return (
                <View key={s.label} style={styles.stage}>
                  <View
                    style={[
                      styles.stageDot,
                      { backgroundColor: done ? colors.teal : colors.inputBg },
                    ]}
                  >
                    <Ionicons
                      name={done ? 'checkmark' : s.icon}
                      size={16}
                      color={done ? colors.white : colors.textMuted}
                    />
                  </View>
                  <Text style={[styles.stageLabel, done && { color: colors.navy, fontWeight: '700' }]}>
                    {s.label}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.tile, { backgroundColor: colors.goldSoft }]}>
              <Ionicons name="star" size={18} color={colors.gold} />
              <Text style={styles.tileValue}>
                {p.stars}
                <Text style={styles.tileTotal}>/{p.starsTotal}</Text>
              </Text>
              <Text style={styles.tileLabel}>Звёзды</Text>
            </View>
            <View style={[styles.tile, { backgroundColor: colors.tealSoft }]}>
              <Ionicons name="flag" size={18} color={colors.teal} />
              <Text style={styles.tileValue}>
                {p.stages}
                <Text style={styles.tileTotal}>/{p.stagesTotal}</Text>
              </Text>
              <Text style={styles.tileLabel}>Этапы</Text>
            </View>
            <View
              style={[
                styles.tile,
                { backgroundColor: p.rhythmDone ? colors.purpleSoft : colors.inputBg },
              ]}
            >
              <Ionicons
                name="musical-notes"
                size={18}
                color={p.rhythmDone ? colors.purple : colors.textMuted}
              />
              <Text style={styles.tileValue}>{p.rhythmDone ? 'Да' : '—'}</Text>
              <Text style={styles.tileLabel}>Ритм</Text>
            </View>
          </View>
        </>
      ) : (
        <View style={styles.empty}>
          <Ionicons name="sparkles-outline" size={18} color={colors.textMuted} />
          <Text style={styles.emptyText}>Ребёнок ещё не играл в 3D-мир.</Text>
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.syncRow}>
          <Ionicons
            name={worldSyncEnabled ? 'cloud-done-outline' : 'phone-portrait-outline'}
            size={13}
            color={colors.textMuted}
          />
          <Text style={styles.syncText} numberOfLines={1}>
            {worldSyncEnabled ? 'Синхронизация онлайн' : 'Локально на устройстве'}
            {updatedAt ? ` · ${formatUpdated(updatedAt)}` : ''}
          </Text>
        </View>
        {allowReset && p.started ? (
          <Pressable onPress={handleReset} hitSlop={6} style={styles.reset}>
            <Ionicons
              name={confirming ? 'alert-circle' : 'refresh'}
              size={14}
              color={confirming ? colors.danger : colors.textSecondary}
            />
            <Text style={[styles.resetText, confirming && { color: colors.danger }]}>
              {confirming ? 'Точно сбросить?' : 'Сбросить'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  badgeText: { fontSize: 12, fontWeight: '800' },
  stages: { flexDirection: 'row', justifyContent: 'space-between' },
  stage: { alignItems: 'center', gap: 5, flex: 1 },
  stageDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageLabel: { fontSize: 11.5, color: colors.textMuted },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  tile: { flex: 1, borderRadius: radius.lg, padding: spacing.md, gap: 3, alignItems: 'flex-start' },
  tileValue: { fontSize: 19, fontWeight: '800', fontFamily: display('800'), color: colors.navy },
  tileTotal: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  tileLabel: { fontSize: 12, color: colors.textSecondary },
  empty: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  emptyText: { fontSize: 13, color: colors.textMuted },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  syncText: { fontSize: 11.5, color: colors.textMuted, flexShrink: 1 },
  reset: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2 },
  resetText: { fontSize: 12.5, fontWeight: '700', color: colors.textSecondary },
});
