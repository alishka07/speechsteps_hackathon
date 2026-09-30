import { Ionicons } from '@/web/Icon';
import { useRouter } from '@/web/router';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from '@/web/ui';

import { AppButton } from '@/components/AppButton';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { LabeledInput } from '@/components/LabeledInput';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { CLIENT_STAGES, ClientStage } from '@/data/clinic';
import { formatAge, formatDateShort, useT } from '@/i18n';
import { newId, useAppStore } from '@/store/useAppStore';
import { colors, radius, spacing, typography } from '@/theme';
import { STAGE_META } from '@/theme/categories';

/** CRM клиники, экран 3: воронка клиентов с поиском и фильтром по этапам. */
export default function ClinicClientsScreen() {
  const t = useT();
  const router = useRouter();
  const lang = useAppStore((s) => s.lang);
  const clients = useAppStore((s) => s.clinicClients);
  const specialists = useAppStore((s) => s.specialists);
  const addClinicClient = useAppStore((s) => s.addClinicClient);

  const [query, setQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<ClientStage | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [childName, setChildName] = useState('');
  const [age, setAge] = useState('4');
  const [parentName, setParentName] = useState('');
  const [phone, setPhone] = useState('+7 ');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => {
      if (stageFilter && c.stage !== stageFilter) return false;
      if (q && !c.childName.toLowerCase().includes(q) && !c.parentName.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [clients, query, stageFilter]);

  const stageCount = (stage: ClientStage) => clients.filter((c) => c.stage === stage).length;
  const specialistName = (id: string) =>
    specialists.find((s) => s.id === id)?.name.split(' ')[0] ?? '';

  const createClient = () => {
    if (!childName.trim() || !parentName.trim()) return;
    addClinicClient({
      id: newId('cc'),
      childName: childName.trim(),
      age: Math.max(2, Math.min(14, parseInt(age, 10) || 4)),
      parentName: parentName.trim(),
      phone: phone.trim(),
      diagnoses: [],
      stage: 'lead',
      specialistIds: [],
      source: 'Вручную',
    });
    setChildName('');
    setParentName('');
    setPhone('+7 ');
    setAddOpen(false);
  };

  return (
    <Screen>
      <ScreenHeader title={t('ctabs.clients')} subtitle={t('crm.clientsSubtitle')} />

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={t('crm.searchClients')}
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        <Chip
          label={`${t('library.all')} (${clients.length})`}
          color={colors.navy}
          selected={stageFilter === null}
          onPress={() => setStageFilter(null)}
        />
        {CLIENT_STAGES.map((stage) => (
          <Chip
            key={stage}
            label={`${t(`stage.${stage}`)} (${stageCount(stage)})`}
            color={STAGE_META[stage].color}
            selected={stageFilter === stage}
            onPress={() => setStageFilter(stageFilter === stage ? null : stage)}
          />
        ))}
      </ScrollView>

      <AppButton title={t('crm.addClient')} icon="add" onPress={() => setAddOpen(true)} />

      {filtered.length === 0 ? (
        <EmptyState icon="folder-open-outline" text={t('crm.noClients')} />
      ) : (
        filtered.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => router.push({ pathname: '/clinic-client/[id]', params: { id: c.id } })}
            style={({ pressed }) => pressed && { opacity: 0.9 }}
          >
            <Card style={styles.card}>
              <View style={styles.head}>
                <Avatar name={c.childName} size={46} />
                <View style={styles.info}>
                  <Text style={styles.name}>
                    {c.childName}, {formatAge(c.age, lang)}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {c.parentName} · {c.phone}
                  </Text>
                </View>
                <Chip label={t(`stage.${c.stage}`)} color={STAGE_META[c.stage].color} />
              </View>
              <View style={styles.bottom}>
                <Text style={styles.specialists} numberOfLines={1}>
                  {c.specialistIds.length > 0
                    ? c.specialistIds.map(specialistName).join(', ')
                    : t('crm.noSpecialists')}
                </Text>
                {c.nextVisit ? (
                  <Text style={styles.nextVisit}>
                    <Ionicons name="calendar-outline" size={11} color={colors.teal} />{' '}
                    {t('crm.nextVisit')}: {formatDateShort(c.nextVisit)}
                  </Text>
                ) : null}
              </View>
            </Card>
          </Pressable>
        ))
      )}

      {/* Добавление клиента */}
      <Modal visible={addOpen} transparent animationType="fade" onRequestClose={() => setAddOpen(false)}>
        <View style={styles.overlay}>
          <Card style={styles.modal}>
            <Text style={typography.h2}>{t('crm.addClient')}</Text>
            <LabeledInput
              label={t('crm.childName')}
              required
              value={childName}
              onChangeText={setChildName}
              placeholder={t('addChild.namePlaceholder')}
            />
            <LabeledInput
              label={t('addChild.age')}
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
              maxLength={2}
            />
            <LabeledInput
              label={t('crm.parent')}
              required
              value={parentName}
              onChangeText={setParentName}
              placeholder="Айгуль Серикова"
            />
            <LabeledInput
              label={t('crm.phone')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <AppButton
              title={t('common.save')}
              onPress={createClient}
              disabled={!childName.trim() || !parentName.trim()}
            />
            <AppButton title={t('common.cancel')} variant="ghost" onPress={() => setAddOpen(false)} />
          </Card>
        </View>
      </Modal>
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
  card: { gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '700', color: colors.navy },
  meta: { fontSize: 12, color: colors.textSecondary },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  specialists: { flex: 1, fontSize: 12.5, color: colors.textSecondary, fontStyle: 'italic' },
  nextVisit: { fontSize: 12, fontWeight: '700', color: colors.teal },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 42, 110, 0.45)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modal: { gap: spacing.md },
});
