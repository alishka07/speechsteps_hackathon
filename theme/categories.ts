import { Ionicons } from '@/web/Icon';

import { ClientStage, SpecialistRole } from '@/data/clinic';
import { Category } from '@/data/types';
import { colors } from './index';

interface CategoryMeta {
  color: string;
  bg: string;
  icon: keyof typeof Ionicons.glyphMap;
}

/** Цвет и иконка каждой категории упражнений. */
export const CATEGORY_META: Record<Category, CategoryMeta> = {
  articulation: { color: colors.orange, bg: colors.orangeSoft, icon: 'happy-outline' },
  phonemic: { color: colors.purple, bg: colors.purpleSoft, icon: 'ear-outline' },
  automation: { color: colors.teal, bg: colors.tealSoft, icon: 'repeat-outline' },
  breathing: { color: colors.navy, bg: colors.navySoft, icon: 'cloud-outline' },
  connected: { color: colors.success, bg: colors.successSoft, icon: 'chatbubbles-outline' },
  motor: { color: colors.peachDark, bg: colors.peachSoft, icon: 'hand-left-outline' },
};

/** Цвет этапа воронки CRM клиники. */
export const STAGE_META: Record<ClientStage, { color: string; bg: string }> = {
  lead: { color: colors.purple, bg: colors.purpleSoft },
  diagnostics: { color: colors.warning, bg: colors.warningSoft },
  active: { color: colors.success, bg: colors.successSoft },
  paused: { color: colors.orange, bg: colors.orangeSoft },
  finished: { color: colors.textMuted, bg: colors.border },
};

/** Цвет и иконка специализации в команде клиники. */
export const ROLE_META: Record<SpecialistRole, CategoryMeta> = {
  speechTherapist: { color: colors.teal, bg: colors.tealSoft, icon: 'mic-outline' },
  psychologist: { color: colors.purple, bg: colors.purpleSoft, icon: 'happy-outline' },
  defectologist: { color: colors.orange, bg: colors.orangeSoft, icon: 'school-outline' },
  neuropsychologist: { color: colors.navy, bg: colors.navySoft, icon: 'extension-puzzle-outline' },
  abaTherapist: { color: colors.success, bg: colors.successSoft, icon: 'grid-outline' },
  massageTherapist: { color: colors.peachDark, bg: colors.peachSoft, icon: 'hand-left-outline' },
};
