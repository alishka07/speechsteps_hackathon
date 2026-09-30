import { DiagnosisKey } from './types';

/** CRM клиники: специалисты разных профилей, клиенты по этапам, приёмы. */

export const CLINIC = {
  name: 'Клиника «Балапан»',
  code: 'CL-7Q2F4D',
};

// ── Специалисты ───────────────────────────────────────────────────────
export type SpecialistRole =
  | 'speechTherapist'
  | 'psychologist'
  | 'defectologist'
  | 'neuropsychologist'
  | 'abaTherapist'
  | 'massageTherapist';

export const SPECIALIST_ROLES: SpecialistRole[] = [
  'speechTherapist',
  'psychologist',
  'defectologist',
  'neuropsychologist',
  'abaTherapist',
  'massageTherapist',
];

export type SpecialistStatus = 'active' | 'invited' | 'vacation';

export interface Specialist {
  id: string;
  name: string;
  role: SpecialistRole;
  status: SpecialistStatus;
  clients: number;
  /** Загрузка расписания, 0–100. */
  loadPercent: number;
  /** Средняя оценка родителей, 0 — ещё нет оценок. */
  rating: number;
}

export const SPECIALISTS: Specialist[] = [
  { id: 'sp-1', name: 'Амирали Алтай', role: 'speechTherapist', status: 'active', clients: 4, loadPercent: 85, rating: 4.9 },
  { id: 'sp-2', name: 'Гульнара Бекова', role: 'speechTherapist', status: 'active', clients: 7, loadPercent: 70, rating: 4.8 },
  { id: 'sp-3', name: 'Айжан Мукашева', role: 'psychologist', status: 'active', clients: 5, loadPercent: 60, rating: 4.7 },
  { id: 'sp-4', name: 'Самал Ержанова', role: 'defectologist', status: 'active', clients: 6, loadPercent: 75, rating: 4.9 },
  { id: 'sp-5', name: 'Динара Калиева', role: 'abaTherapist', status: 'active', clients: 3, loadPercent: 45, rating: 4.6 },
  { id: 'sp-6', name: 'Бахыт Оспанов', role: 'massageTherapist', status: 'vacation', clients: 4, loadPercent: 0, rating: 4.8 },
  { id: 'sp-7', name: 'Ерлан Жунусов', role: 'neuropsychologist', status: 'invited', clients: 0, loadPercent: 0, rating: 0 },
];

// ── Клиенты (воронка CRM) ─────────────────────────────────────────────
export type ClientStage = 'lead' | 'diagnostics' | 'active' | 'paused' | 'finished';

export const CLIENT_STAGES: ClientStage[] = [
  'lead',
  'diagnostics',
  'active',
  'paused',
  'finished',
];

/** Абонемент клиента: оплаченные и использованные занятия. */
export interface Subscription {
  plan: string;
  sessionsPaid: number;
  sessionsUsed: number;
  pricePerSession: number; // ₸
}

export interface ClinicClient {
  id: string;
  childName: string;
  age: number;
  parentName: string;
  phone: string;
  diagnoses: DiagnosisKey[];
  stage: ClientStage;
  specialistIds: string[];
  source?: string;
  lastVisit?: string; // ISO
  nextVisit?: string; // ISO
  subscription?: Subscription;
}

/** Слоты времени для записи на приём. */
export const TIME_SLOTS = ['09:00', '09:30', '10:00', '11:00', '11:30', '14:00', '15:00', '16:00', '17:00'];

/** ISO-дата со сдвигом от сегодня (для живого мок-расписания). */
export function relDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export const CLINIC_CLIENTS: ClinicClient[] = [
  {
    id: 'cc-1',
    childName: 'Алия Серикова',
    age: 5,
    parentName: 'Айгуль Серикова',
    phone: '+7 701 234 56 78',
    diagnoses: ['dysarthria'],
    stage: 'active',
    specialistIds: ['sp-1'],
    source: 'Instagram',
    lastVisit: relDate(-1),
    nextVisit: relDate(1),
    subscription: { plan: 'Абонемент 8 занятий', sessionsPaid: 8, sessionsUsed: 5, pricePerSession: 9000 },
  },
  {
    id: 'cc-2',
    childName: 'Тимур Ахметов',
    age: 4,
    parentName: 'Марат Ахметов',
    phone: '+7 702 345 67 89',
    diagnoses: ['speechDelay', 'onr'],
    stage: 'active',
    specialistIds: ['sp-1', 'sp-3'],
    source: 'Рекомендация',
    lastVisit: relDate(-3),
    nextVisit: relDate(2),
    subscription: { plan: 'Абонемент 12 занятий', sessionsPaid: 12, sessionsUsed: 9, pricePerSession: 8500 },
  },
  {
    id: 'cc-3',
    childName: 'Дана Жумабаева',
    age: 7,
    parentName: 'Сауле Жумабаева',
    phone: '+7 705 111 22 33',
    diagnoses: ['dyslalia'],
    stage: 'active',
    specialistIds: ['sp-2'],
    source: '2GIS',
    lastVisit: relDate(-2),
    nextVisit: relDate(0),
    subscription: { plan: 'Абонемент 8 занятий', sessionsPaid: 8, sessionsUsed: 7, pricePerSession: 9000 },
  },
  {
    id: 'cc-4',
    childName: 'Алихан Бекетов',
    age: 6,
    parentName: 'Айгерим Бекетова',
    phone: '+7 707 555 44 33',
    diagnoses: ['ffn'],
    stage: 'active',
    specialistIds: ['sp-1', 'sp-4'],
    source: 'Сайт',
    lastVisit: relDate(-1),
    nextVisit: relDate(0),
    subscription: { plan: 'Абонемент 12 занятий', sessionsPaid: 12, sessionsUsed: 6, pricePerSession: 8500 },
  },
  {
    id: 'cc-5',
    childName: 'Амина Сулейменова',
    age: 4,
    parentName: 'Динара Ахметова',
    phone: '+7 700 987 65 43',
    diagnoses: ['speechDelay'],
    stage: 'diagnostics',
    specialistIds: ['sp-3'],
    source: 'Instagram',
    nextVisit: relDate(1),
  },
  {
    id: 'cc-6',
    childName: 'Дана Нурланова',
    age: 3,
    parentName: 'Марат Нурланов',
    phone: '+7 747 222 33 44',
    diagnoses: ['onr'],
    stage: 'lead',
    specialistIds: [],
    source: 'Звонок',
  },
  {
    id: 'cc-7',
    childName: 'Ерасыл Канатов',
    age: 5,
    parentName: 'Жанар Канатова',
    phone: '+7 778 333 22 11',
    diagnoses: ['stuttering'],
    stage: 'paused',
    specialistIds: ['sp-2'],
    source: 'Рекомендация',
    lastVisit: relDate(-14),
  },
  {
    id: 'cc-8',
    childName: 'Аружан Жунусова',
    age: 8,
    parentName: 'Гульмира Жунусова',
    phone: '+7 701 444 55 66',
    diagnoses: ['dyslalia'],
    stage: 'finished',
    specialistIds: ['sp-1'],
    source: 'Сайт',
    lastVisit: relDate(-30),
  },
];

// ── Приёмы ────────────────────────────────────────────────────────────
export type AppointmentType = 'session' | 'diagnostics' | 'consultation';
export type AppointmentStatus = 'scheduled' | 'completed' | 'missed';

export interface Appointment {
  id: string;
  clientId: string;
  specialistId: string;
  date: string; // ISO
  time: string; // HH:MM
  durationMin: number;
  type: AppointmentType;
  status: AppointmentStatus;
}

export const APPOINTMENTS: Appointment[] = [
  // Вчера
  { id: 'ap-1', clientId: 'cc-1', specialistId: 'sp-1', date: relDate(-1), time: '10:00', durationMin: 45, type: 'session', status: 'completed' },
  { id: 'ap-2', clientId: 'cc-4', specialistId: 'sp-4', date: relDate(-1), time: '12:00', durationMin: 45, type: 'session', status: 'missed' },
  // Сегодня
  { id: 'ap-3', clientId: 'cc-3', specialistId: 'sp-2', date: relDate(0), time: '10:00', durationMin: 45, type: 'session', status: 'scheduled' },
  { id: 'ap-4', clientId: 'cc-4', specialistId: 'sp-1', date: relDate(0), time: '11:30', durationMin: 45, type: 'session', status: 'scheduled' },
  { id: 'ap-5', clientId: 'cc-4', specialistId: 'sp-4', date: relDate(0), time: '14:00', durationMin: 30, type: 'consultation', status: 'scheduled' },
  { id: 'ap-6', clientId: 'cc-5', specialistId: 'sp-3', date: relDate(0), time: '16:00', durationMin: 60, type: 'diagnostics', status: 'scheduled' },
  // Завтра
  { id: 'ap-7', clientId: 'cc-1', specialistId: 'sp-1', date: relDate(1), time: '10:00', durationMin: 45, type: 'session', status: 'scheduled' },
  { id: 'ap-8', clientId: 'cc-5', specialistId: 'sp-3', date: relDate(1), time: '11:00', durationMin: 60, type: 'diagnostics', status: 'scheduled' },
  // Послезавтра
  { id: 'ap-9', clientId: 'cc-2', specialistId: 'sp-1', date: relDate(2), time: '09:30', durationMin: 45, type: 'session', status: 'scheduled' },
  { id: 'ap-10', clientId: 'cc-2', specialistId: 'sp-3', date: relDate(2), time: '15:00', durationMin: 30, type: 'consultation', status: 'scheduled' },
];
