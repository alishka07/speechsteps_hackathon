import React from 'react';
import { StyleSheet, Text, View } from '@/web/ui';

import { radius, scoreColor } from '@/theme';

/** Оценка произношения в %, цвет: зелёный / жёлтый / красный. */
export function ScoreBadge({ score }: { score: number }) {
  const { fg, bg } = scoreColor(score);
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{score}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'center',
  },
  text: { fontSize: 12, fontWeight: '800' },
});
