import { useRouter } from '@/web/router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from '@/web/ui';

import { AppButton } from '@/components/AppButton';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { LabeledInput } from '@/components/LabeledInput';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { DiagnosisKey } from '@/data/types';
import { useT } from '@/i18n';
import { newId, useAppStore } from '@/store/useAppStore';
import { colors, spacing } from '@/theme';

const DIAGNOSES: DiagnosisKey[] = [
  'speechDelay',
  'dysarthria',
  'dyslalia',
  'ffn',
  'stuttering',
  'onr',
];

/** Модальный экран добавления ребёнка. */
export default function AddChildScreen() {
  const t = useT();
  const router = useRouter();
  const addChild = useAppStore((s) => s.addChild);

  const [name, setName] = useState('');
  const [age, setAge] = useState('5');
  const [selected, setSelected] = useState<DiagnosisKey[]>([]);

  const toggle = (d: DiagnosisKey) => {
    setSelected((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const create = () => {
    if (!name.trim()) return;
    const todayIso = new Date().toISOString().slice(0, 10);
    addChild({
      id: newId('child'),
      name: name.trim(),
      age: Math.max(3, Math.min(12, parseInt(age, 10) || 5)),
      diagnoses: selected.length > 0 ? selected : ['speechDelay'],
      progress: 0,
      connectedAt: todayIso,
      // Новый ребёнок: пустая статистика за последние 7 дней.
      daily: Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return { date: d.toISOString().slice(0, 10), minutes: 0, tasks: 0, avgScore: null };
      }),
    });
    router.back();
  };

  return (
    <Screen>
      <ScreenHeader title={t('addChild.title')} subtitle={t('addChild.subtitle')} back />

      <Card style={styles.form}>
        <LabeledInput
          label={t('addChild.name')}
          required
          value={name}
          onChangeText={setName}
          placeholder={t('addChild.namePlaceholder')}
        />
        <LabeledInput
          label={t('addChild.age')}
          required
          value={age}
          onChangeText={setAge}
          keyboardType="number-pad"
          maxLength={2}
        />
        <View style={styles.diagnosisBlock}>
          <Text style={styles.label}>{t('addChild.diagnosis')}</Text>
          <View style={styles.chips}>
            {DIAGNOSES.map((d) => (
              <Chip
                key={d}
                label={t(`diagnosis.${d}`)}
                color={colors.orange}
                selected={selected.includes(d)}
                onPress={() => toggle(d)}
              />
            ))}
          </View>
        </View>
        <AppButton title={t('addChild.create')} icon="add" onPress={create} disabled={!name.trim()} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  diagnosisBlock: { gap: spacing.sm },
  label: { fontSize: 14, fontWeight: '700', color: colors.navy },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
