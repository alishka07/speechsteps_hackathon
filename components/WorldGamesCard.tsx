import { Ionicons } from '@/web/Icon';
import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View, ViewStyle } from '@/web/ui';

import { Card } from '@/components/Card';
import {
  defaultWorldConfig,
  GRIMACE_GAMES,
  normalizeWorldConfig,
  WORLD_DIFFICULTIES,
  WORLD_GAME_SOUNDS,
  WORLD_GAMES,
  WorldDifficulty,
} from '@/data/worldConfig';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * Карточка управления 3D-миром для логопеда: сложность + вкл/выкл
 * дополнительных мини-игр конкретному ребёнку. Сохраняется в стор
 * (worldConfigByChild) и применяется в игре через мост getConfig().
 */
export function WorldGamesCard({ childId, style }: { childId: string; style?: ViewStyle }) {
  const saved = useAppStore((s) => s.worldConfigByChild[childId]);
  const setWorldConfig = useAppStore((s) => s.setWorldConfig);
  const cfg = normalizeWorldConfig(saved ?? defaultWorldConfig());

  const setDifficulty = (difficulty: WorldDifficulty) =>
    setWorldConfig(childId, { ...cfg, difficulty });

  const toggleGame = (key: string) =>
    setWorldConfig(childId, { ...cfg, games: { ...cfg.games, [key]: !cfg.games[key] } });

  const setSound = (key: string, sound: string) =>
    setWorldConfig(childId, { ...cfg, sounds: { ...cfg.sounds, [key]: sound } });

  return (
    <Card style={StyleSheet.flatten([styles.card, style])}>
      <View style={styles.titleRow}>
        <View style={styles.iconBox}>
          <Ionicons name="game-controller-outline" size={16} color={colors.teal} />
        </View>
        <Text style={typography.h3}>Управление игрой</Text>
      </View>

      {/* Сложность */}
      <View>
        <Text style={styles.label}>Сложность</Text>
        <View style={styles.segment}>
          {WORLD_DIFFICULTIES.map((d) => {
            const active = cfg.difficulty === d.key;
            return (
              <Pressable
                key={d.key}
                onPress={() => setDifficulty(d.key)}
                style={[styles.segBtn, active && styles.segBtnActive]}
              >
                <Text style={[styles.segText, active && styles.segTextActive]}>{d.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Мини-игры */}
      <View style={styles.gamesList}>
        <Text style={styles.label}>Мини-игры</Text>
        {WORLD_GAMES.map((g) => {
          const on = cfg.games[g.key] !== false;
          const soundOpts = WORLD_GAME_SOUNDS[g.key];
          const current = cfg.sounds[g.key];
          return (
            <View key={g.key} style={styles.gameBlock}>
              <View style={styles.gameRow}>
                <Text style={styles.gameEmoji}>{g.emoji}</Text>
                <View style={styles.gameInfo}>
                  <Text style={styles.gameTitle}>{g.title}</Text>
                  <Text style={styles.gameHint}>{g.hint}</Text>
                </View>
                <Switch
                  value={on}
                  onValueChange={() => toggleGame(g.key)}
                  trackColor={{ false: colors.border, true: colors.teal }}
                  thumbColor={colors.white}
                />
              </View>
              {on && soundOpts ? (
                <View style={styles.soundRow}>
                  <Text style={styles.soundLabel}>{GRIMACE_GAMES.includes(g.key) ? 'Гримаса:' : 'Звук:'}</Text>
                  {soundOpts.map((snd) => {
                    const active = current === snd;
                    return (
                      <Pressable
                        key={snd}
                        onPress={() => setSound(g.key, snd)}
                        style={[styles.soundChip, active && styles.soundChipActive]}
                      >
                        <Text style={[styles.soundChipText, active && styles.soundChipTextActive]}>
                          {snd}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      <Text style={styles.note}>
        Базовые задания (ворота, мост, шар, сундук) всегда включены. Изменения применятся при
        следующем входе ребёнка в игру.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 12.5, fontWeight: '700', color: colors.textSecondary, marginBottom: 6 },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.inputBg,
    borderRadius: radius.full,
    padding: 3,
  },
  segBtn: { flex: 1, paddingVertical: 8, borderRadius: radius.full, alignItems: 'center' },
  segBtnActive: { backgroundColor: colors.teal },
  segText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  segTextActive: { color: colors.white },
  gamesList: { gap: spacing.sm },
  gameBlock: {
    backgroundColor: colors.inputBg,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: spacing.sm,
  },
  gameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  gameEmoji: { fontSize: 24 },
  gameInfo: { flex: 1, gap: 1 },
  gameTitle: { fontSize: 14, fontWeight: '700', color: colors.navy },
  gameHint: { fontSize: 12, color: colors.textSecondary },
  soundRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  soundLabel: { fontSize: 12, color: colors.textSecondary, marginRight: 2 },
  soundChip: {
    minWidth: 34,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  soundChipActive: { backgroundColor: colors.purple, borderColor: colors.purple },
  soundChipText: { fontSize: 13, fontWeight: '800', color: colors.navy },
  soundChipTextActive: { color: colors.white },
  note: { fontSize: 11.5, color: colors.textMuted, lineHeight: 16 },
});
