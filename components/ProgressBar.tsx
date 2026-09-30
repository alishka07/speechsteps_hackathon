import React from 'react';
import { StyleSheet, View } from '@/web/ui';

import { colors, radius } from '@/theme';

interface Props {
  /** 0–100 */
  value: number;
  color?: string;
  height?: number;
}

export function ProgressBar({ value, color = colors.teal, height = 8 }: Props) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View
        style={[
          styles.fill,
          { width: `${clamped}%`, backgroundColor: color, borderRadius: height / 2 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
    flex: 1,
  },
  fill: { height: '100%' },
});
