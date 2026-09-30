import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from '@/web/ui';

import { colors, radius, spacing } from '@/theme';

interface Props extends TextInputProps {
  label: string;
  required?: boolean;
}

export function LabeledInput({ label, required, style, multiline, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.star}> *</Text> : null}
      </Text>
      <TextInput
        style={[styles.input, multiline && styles.multiline, style]}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 14, fontWeight: '700', color: colors.navy },
  star: { color: colors.orange },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.navy,
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
});
