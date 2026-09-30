import { TranslationKey } from '@/i18n/ru';

/**
 * Геймификация — перенос механик веб-версии:
 * XP/уровни, достижения, лиги, задания дня. Всё на мок-данных.
 */

// ── Уровни ────────────────────────────────────────────────────────────
/**
 * Формула веб-версии: до 2 уровня — 50 XP, каждый следующий
 * уровень дороже на 25 XP (75, 100, 125…).
 */
export function levelInfo(xp: number): {
  level: number;
  current: number;
  needed: number;
  progress: number; // 0–100
} {
  let level = 1;
  let threshold = 0;
  let increment = 50;
  while (xp >= threshold + increment) {
    threshold += increment;
    increment += 25;
    level++;
  }
  const current = xp - threshold;
  return { level, current, needed: increment, progress: (current / increment) * 100 };
}

// ── Достижения ────────────────────────────────────────────────────────
export interface AchievementDef {
  id: string;
  emoji: string;
  titleKey: TranslationKey;
  type: 'streak' | 'xp' | 'level' | 'lessons';
  threshold: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'streak_3', emoji: '🔥', titleKey: 'ach.streak3', type: 'streak', threshold: 3 },
  { id: 'streak_7', emoji: '💪', titleKey: 'ach.streak7', type: 'streak', threshold: 7 },
  { id: 'streak_14', emoji: '⚡', titleKey: 'ach.streak14', type: 'streak', threshold: 14 },
  { id: 'streak_30', emoji: '👑', titleKey: 'ach.streak30', type: 'streak', threshold: 30 },
  { id: 'first_lesson', emoji: '🌟', titleKey: 'ach.firstLesson', type: 'lessons', threshold: 1 },
  { id: 'xp_100', emoji: '⭐', titleKey: 'ach.xp100', type: 'xp', threshold: 100 },
  { id: 'xp_500', emoji: '✨', titleKey: 'ach.xp500', type: 'xp', threshold: 500 },
  { id: 'level_5', emoji: '🚀', titleKey: 'ach.level5', type: 'level', threshold: 5 },
];

export interface GamStats {
  streak: number;
  xp: number;
  level: number;
  lessonsDone: number;
}

export function isUnlocked(a: AchievementDef, stats: GamStats): boolean {
  switch (a.type) {
    case 'streak':
      return stats.streak >= a.threshold;
    case 'xp':
      return stats.xp >= a.threshold;
    case 'level':
      return stats.level >= a.threshold;
    case 'lessons':
      return stats.lessonsDone >= a.threshold;
  }
}

// ── Лиги ──────────────────────────────────────────────────────────────
export interface LeagueDef {
  id: string;
  emoji: string;
  nameKey: TranslationKey;
  minXp: number;
}

export const LEAGUES: LeagueDef[] = [
  { id: 'brown', emoji: '🟤', nameKey: 'league.brown', minXp: 0 },
  { id: 'bronze', emoji: '🥉', nameKey: 'league.bronze', minXp: 500 },
  { id: 'silver', emoji: '🥈', nameKey: 'league.silver', minXp: 2000 },
  { id: 'gold', emoji: '🥇', nameKey: 'league.gold', minXp: 5000 },
  { id: 'platinum', emoji: '🔷', nameKey: 'league.platinum', minXp: 10000 },
  { id: 'diamond', emoji: '💎', nameKey: 'league.diamond', minXp: 20000 },
];

export function leagueFor(xp: number): { league: LeagueDef; next: LeagueDef | null } {
  let league = LEAGUES[0];
  for (const l of LEAGUES) {
    if (xp >= l.minXp) league = l;
  }
  const idx = LEAGUES.indexOf(league);
  return { league, next: LEAGUES[idx + 1] ?? null };
}

/** Мок-рейтинг недели (имена из веб-версии). */
export const LEADERBOARD: { name: string; xp: number }[] = [
  { name: 'Аружан Жунусова', xp: 1480 },
  { name: 'Нурсултан Беков', xp: 1120 },
  { name: 'Тимур Ахметов', xp: 870 },
  { name: 'Амина Сулейменова', xp: 640 },
  { name: 'Дана Нурланова', xp: 510 },
  { name: 'Алуа Сапарова', xp: 420 },
  { name: 'Ерасыл Канатов', xp: 290 },
  { name: 'Камила Ескендир', xp: 180 },
];

// ── Задания дня ───────────────────────────────────────────────────────
export interface QuestDef {
  id: string;
  emoji: string;
  titleKey: TranslationKey;
  target: number;
  xpReward: number;
}

export const QUEST_POOL: QuestDef[] = [
  { id: 'earn_25xp', emoji: '🌟', titleKey: 'quest.earn25xp', target: 25, xpReward: 10 },
  { id: 'complete_1lesson', emoji: '📖', titleKey: 'quest.complete1lesson', target: 1, xpReward: 10 },
  { id: 'do_5exercises', emoji: '💪', titleKey: 'quest.do5exercises', target: 5, xpReward: 10 },
  { id: 'keep_streak', emoji: '🔥', titleKey: 'quest.keepStreak', target: 1, xpReward: 10 },
  { id: 'practice_10min', emoji: '⏰', titleKey: 'quest.practice10min', target: 10, xpReward: 10 },
  { id: 'accuracy_70', emoji: '🎯', titleKey: 'quest.accuracy70', target: 70, xpReward: 10 },
  { id: 'articulation', emoji: '👅', titleKey: 'quest.tryArticulation', target: 1, xpReward: 10 },
  { id: 'homework', emoji: '📝', titleKey: 'quest.completeHomework', target: 1, xpReward: 15 },
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export interface DailyQuest {
  def: QuestDef;
  progress: number;
  done: boolean;
}

/**
 * 3 задания дня: детерминированный «случайный» выбор по childId + дате
 * (как seeded random в веб-версии). Прогресс — тоже мок от сида.
 */
export function dailyQuests(childId: string, dateIso: string): DailyQuest[] {
  const seed = hash(`${childId}_${dateIso}`);
  const picked: QuestDef[] = [];
  let i = seed;
  while (picked.length < 3) {
    const q = QUEST_POOL[i % QUEST_POOL.length];
    if (!picked.includes(q)) picked.push(q);
    i = (i * 7 + 13) % 1_000_003;
  }
  return picked.map((def, idx) => {
    const progress = Math.min(def.target, hash(`${childId}_${dateIso}_${def.id}`) % (def.target + 2));
    return { def, progress, done: progress >= def.target };
  });
}
