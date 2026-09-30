import React from 'react';
import { StyleSheet, Text, View } from '@/web/ui';

import { colors, display } from '@/theme';

const PALETTE = [
  { fg: colors.teal, bg: colors.tealSoft },
  { fg: colors.orange, bg: colors.orangeSoft },
  { fg: colors.purple, bg: colors.purpleSoft },
  { fg: colors.navy, bg: colors.navySoft },
];

interface Props {
  name: string;
  size?: number;
}

/** Круглый аватар с инициалами; цвет стабильно зависит от имени. */
export function Avatar({ name, size = 48 }: Props) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
  const palette = PALETTE[hash(name) % PALETTE.length];

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: palette.bg },
      ]}
    >
      <Text style={[styles.initials, { color: palette.fg, fontSize: size * 0.36 }]}>
        {initials}
      </Text>
    </View>
  );
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontWeight: '800', fontFamily: display('800') },
});
