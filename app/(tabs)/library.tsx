import { Ionicons } from '@/web/Icon';
import { useRouter } from '@/web/router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from '@/web/ui';

import { AppButton } from '@/components/AppButton';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { ExerciseListItem } from '@/components/ExerciseListItem';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { CATEGORIES, EXERCISES } from '@/data/exercises';
import { Category } from '@/data/types';
import { useT } from '@/i18n';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, spacing } from '@/theme';
import { CATEGORY_META } from '@/theme/categories';

/** Экран 5: библиотека упражнений с поиском и фильтрами. */
export default function LibraryScreen() {
  const t = useT();
  const router = useRouter();
  const customExercises = useAppStore((s) => s.customExercises);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [visionOnly, setVisionOnly] = useState(false);

  const exercises = useMemo(() => {
    const all = [...customExercises, ...EXERCISES];
    const q = query.trim().toLowerCase();
    return all.filter((e) => {
      if (visionOnly && !e.vision) return false;
      if (category && e.category !== category) return false;
      if (q && !e.title.toLowerCase().includes(q) && !e.description.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [customExercises, query, category, visionOnly]);

  return (
    <Screen>
      <ScreenHeader title={t('library.title')} subtitle={t('library.subtitle')} />

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={t('library.search')}
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        <Chip
          label={t('library.all')}
          color={colors.navy}
          selected={category === null && !visionOnly}
          onPress={() => {
            setCategory(null);
            setVisionOnly(false);
          }}
        />
        <Chip
          label={`📷 ${t('library.cv')}`}
          color={colors.purple}
          selected={visionOnly}
          onPress={() => setVisionOnly((v) => !v)}
        />
        {CATEGORIES.map((c) => (
          <Chip
            key={c}
            label={t(`category.${c}`)}
            color={CATEGORY_META[c].color}
            selected={category === c}
            onPress={() => setCategory(category === c ? null : c)}
          />
        ))}
      </ScrollView>

      <AppButton
        title={t('library.create')}
        icon="add"
        variant="outline"
        onPress={() => router.push('/exercise/new')}
      />

      {exercises.length === 0 ? (
        <EmptyState icon="search-outline" text={t('library.empty')} />
      ) : (
        exercises.map((e) => (
          <ExerciseListItem
            key={e.id}
            exercise={e}
            onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: e.id } })}
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: 2,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: colors.navy },
  filters: { gap: spacing.sm, paddingVertical: 2 },
});
