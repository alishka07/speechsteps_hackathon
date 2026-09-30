import { Ionicons } from '@/web/Icon';
import { useRouter } from '@/web/router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from '@/web/ui';

import { ai } from '@/ai';
import { AppButton } from '@/components/AppButton';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { LabeledInput } from '@/components/LabeledInput';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { CATEGORIES } from '@/data/exercises';
import { Category } from '@/data/types';
import { useT } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { newId, useAppStore } from '@/store/useAppStore';
import { colors, radius, spacing } from '@/theme';
import { CATEGORY_META } from '@/theme/categories';

/** Экран 4: конструктор упражнения вручную. */
export default function NewExerciseScreen() {
  const t = useT();
  const router = useRouter();
  const addCustomExercise = useAppStore((s) => s.addCustomExercise);

  const [title, setTitle] = useState('');
  const [focusSound, setFocusSound] = useState('');
  const [category, setCategory] = useState<Category>('articulation');
  const [instruction, setInstruction] = useState('');
  const [parentNotes, setParentNotes] = useState('');
  // Заглушки выбора файлов: реальные пикеры подключим вместе с бэкендом.
  const [audioPicked, setAudioPicked] = useState(false);
  const [imagePicked, setImagePicked] = useState(false);

  // ИИ-генерация черновика.
  const [goal, setGoal] = useState('');
  const [generating, setGenerating] = useState(false);
  const [emoji, setEmoji] = useState('⭐');
  const [durationMin, setDurationMin] = useState(4);

  const generate = async () => {
    setGenerating(true);
    const draft = await ai.generateExercise({
      goal: goal.trim() || undefined,
      category,
      focusSound: focusSound.trim() || undefined,
    });
    setTitle(draft.title);
    setCategory(draft.category);
    if (draft.focusSound) setFocusSound(draft.focusSound);
    setInstruction(draft.instruction);
    setParentNotes(draft.parentNotes);
    setEmoji(draft.emoji);
    setDurationMin(draft.durationMin);
    setGenerating(false);
    haptics.success();
  };

  const save = () => {
    if (!title.trim()) {
      Alert.alert(t('exercise.title'), t('exercise.nameRequired'));
      return;
    }
    addCustomExercise({
      id: newId('ex-custom'),
      title: title.trim(),
      category,
      focusSound: focusSound.trim() ? focusSound.trim().toUpperCase() : undefined,
      emoji,
      durationMin,
      description: instruction.trim() || title.trim(),
      instruction: instruction.trim(),
      parentNotes: parentNotes.trim() || undefined,
      custom: true,
    });
    Alert.alert(t('exercise.savedTitle'), t('exercise.savedBody'), [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  return (
    <Screen>
      <ScreenHeader title={t('exercise.title')} subtitle={t('exercise.subtitle')} back />

      {/* ИИ-помощник: цель → черновик упражнения */}
      <Card style={styles.aiCard}>
        <View style={styles.aiBadge}>
          <Ionicons name="sparkles" size={13} color={colors.purple} />
          <Text style={styles.aiBadgeText}>{t('exercise.aiTitle')}</Text>
        </View>
        <Text style={styles.aiHint}>{t('exercise.aiHint')}</Text>
        <TextInput
          style={styles.aiInput}
          value={goal}
          onChangeText={setGoal}
          placeholder={t('exercise.aiPlaceholder')}
          placeholderTextColor={colors.textMuted}
          multiline
        />
        <AppButton
          title={generating ? t('exercise.aiGenerating') : t('exercise.aiGenerate')}
          icon="sparkles"
          variant="ai"
          onPress={generate}
          loading={generating}
        />
      </Card>

      <Card style={styles.form}>
        <LabeledInput
          label={t('exercise.name')}
          required
          value={title}
          onChangeText={setTitle}
          placeholder={t('exercise.namePlaceholder')}
        />

        <LabeledInput
          label={t('exercise.focusSound')}
          value={focusSound}
          onChangeText={setFocusSound}
          placeholder={t('exercise.focusPlaceholder')}
          maxLength={2}
          autoCapitalize="characters"
        />

        <View style={styles.block}>
          <Text style={styles.label}>{t('exercise.category')}</Text>
          <View style={styles.chips}>
            {CATEGORIES.map((c) => (
              <Chip
                key={c}
                label={t(`category.${c}`)}
                color={CATEGORY_META[c].color}
                selected={category === c}
                onPress={() => setCategory(c)}
              />
            ))}
          </View>
        </View>

        <FilePickerStub
          label={t('exercise.audio')}
          buttonText={t('exercise.uploadAudio')}
          fileName={t('exercise.audioSelected')}
          icon="musical-notes-outline"
          picked={audioPicked}
          onPick={() => setAudioPicked(true)}
        />

        <FilePickerStub
          label={t('exercise.image')}
          buttonText={t('exercise.pickImage')}
          fileName={t('exercise.imageSelected')}
          icon="image-outline"
          picked={imagePicked}
          onPick={() => setImagePicked(true)}
        />

        <LabeledInput
          label={t('exercise.instruction')}
          value={instruction}
          onChangeText={setInstruction}
          placeholder={t('exercise.instructionPlaceholder')}
          multiline
        />

        <LabeledInput
          label={t('exercise.parentNotes')}
          value={parentNotes}
          onChangeText={setParentNotes}
          placeholder={t('exercise.parentNotesPlaceholder')}
          multiline
        />

        <AppButton title={t('common.save')} icon="save-outline" onPress={save} />
      </Card>
    </Screen>
  );
}

function FilePickerStub({
  label,
  buttonText,
  fileName,
  icon,
  picked,
  onPick,
}: {
  label: string;
  buttonText: string;
  fileName: string;
  icon: keyof typeof Ionicons.glyphMap;
  picked: boolean;
  onPick: () => void;
}) {
  return (
    <View style={styles.block}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={onPick}
        style={({ pressed }) => [styles.picker, picked && styles.pickerDone, pressed && { opacity: 0.85 }]}
      >
        <Ionicons
          name={picked ? 'checkmark-circle' : icon}
          size={20}
          color={picked ? colors.success : colors.textSecondary}
        />
        <Text style={[styles.pickerText, picked && styles.pickerTextDone]}>
          {picked ? fileName : buttonText}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  aiCard: { gap: spacing.md, backgroundColor: colors.purpleSoft },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.white,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  aiBadgeText: { fontSize: 12, fontWeight: '800', color: colors.purple },
  aiHint: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  aiInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    minHeight: 70,
    textAlignVertical: 'top',
    fontSize: 15,
    color: colors.navy,
  },
  form: { gap: spacing.lg },
  block: { gap: spacing.sm },
  label: { fontSize: 14, fontWeight: '700', color: colors.navy },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: spacing.lg,
    backgroundColor: colors.inputBg,
  },
  pickerDone: { borderStyle: 'solid', borderColor: colors.success, backgroundColor: colors.successSoft },
  pickerText: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  pickerTextDone: { color: colors.success },
});
