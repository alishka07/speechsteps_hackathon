import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { ATTEMPTS, CHILDREN, NOTES } from '@/data/children';
import {
  APPOINTMENTS,
  Appointment,
  AppointmentStatus,
  CLINIC_CLIENTS,
  ClientStage,
  ClinicClient,
  SPECIALISTS,
  Specialist,
  SpecialistRole,
} from '@/data/clinic';
import { LESSONS } from '@/data/lessons';
import {
  Attempt,
  Child,
  DiagnosisKey,
  Exercise,
  Lesson,
  Note,
  SoundMineAttemptInput,
} from '@/data/types';
import { WorldGameConfig } from '@/data/worldConfig';
import type { Lang } from '@/i18n';

interface Therapist {
  name: string;
  shortName: string;
  id: string;
}

interface Parent {
  name: string;
  relation: string;
}

/** Заявка родителя на подключение к логопеду. */
export interface LinkRequest {
  id: string;
  parentName: string;
  childName: string;
  age: number;
  diagnoses: DiagnosisKey[];
  date: string; // ISO
}

export interface ChatMessage {
  id: string;
  from: 'parent' | 'therapist';
  text: string;
  time: string; // ISO datetime
}

interface AppState {
  lang: Lang;
  therapist: Therapist;
  /** Аккаунт родителя (мок). */
  parent: Parent;
  /** Ребёнок, выбранный в родительском кабинете. */
  parentChildId: string;
  children: Child[];
  attempts: Attempt[];
  notes: Note[];
  lessons: Lesson[];
  /** Упражнения, созданные логопедом вручную (дополняют каталог). */
  customExercises: Exercise[];
  /** Прогресс по урокам у родителя: lessonId → выполненные exerciseId. */
  lessonProgress: Record<string, string[]>;
  /** Заявки родителей на подключение (кабинет логопеда). */
  requests: LinkRequest[];
  /** Чат родитель ↔ логопед. */
  chatMessages: ChatMessage[];

  // CRM клиники
  specialists: Specialist[];
  clinicClients: ClinicClient[];
  appointments: Appointment[];

  /** Сохранённое состояние «Острова Эха» (WorldState JSON) по ребёнку. */
  gameStateByChild: Record<string, string>;
  /** Прогресс 3D-мира (этапы/звёзды JSON) по ребёнку. */
  worldStateByChild: Record<string, string>;
  /** Время последнего обновления прогресса мира (для слияния с облаком). */
  worldUpdatedAt: Record<string, number>;
  /** Настройки мини-игр мира по ребёнку (логопед: сложность + вкл/выкл игр). */
  worldConfigByChild: Record<string, WorldGameConfig>;
  /** Прогресс «Шахты звуков» (пройденные кристаллы JSON) по ребёнку. */
  soundMineStateByChild: Record<string, string>;
  /** Сохранить прогресс «Шахты звуков» ребёнка (локально). */
  setSoundMineState: (childId: string, json: string) => void;

  setLang: (lang: Lang) => void;
  setParentChildId: (id: string) => void;
  addChild: (child: Child) => void;
  addNote: (note: Note) => void;
  addLesson: (lesson: Lesson) => void;
  removeLesson: (id: string) => void;
  addCustomExercise: (exercise: Exercise) => void;
  /** Переключить статус упражнения в уроке: выполнено / не начато. */
  toggleExerciseDone: (lessonId: string, exerciseId: string) => void;
  /** Принять заявку: создаёт профиль ребёнка и убирает заявку. */
  acceptRequest: (id: string) => void;
  declineRequest: (id: string) => void;
  sendChatMessage: (from: 'parent' | 'therapist', text: string) => void;

  inviteSpecialist: (name: string, role: SpecialistRole) => void;
  addClinicClient: (client: ClinicClient) => void;
  setClientStage: (id: string, stage: ClientStage) => void;
  setAppointmentStatus: (id: string, status: AppointmentStatus) => void;
  /** Записать клиента на приём (из карточки клиента). */
  addAppointment: (appt: Appointment) => void;
  /** Пополнить абонемент клиента на N занятий. */
  topUpSubscription: (clientId: string, count: number) => void;

  /** Сохранить состояние игры ребёнка (мост window.SpeechSteps.saveState). */
  setGameState: (childId: string, json: string) => void;
  /** Сохранить прогресс 3D-мира ребёнка (локально). */
  setWorldState: (childId: string, json: string, updatedAt?: number) => void;
  /** Применить прогресс из облака, только если он новее локального. */
  mergeRemoteWorldState: (childId: string, json: string, updatedAt: number) => void;
  /** Сбросить прогресс 3D-мира ребёнка локально (облако — через worldSync). */
  clearWorldState: (childId: string) => void;
  /** Логопед: задать настройки мини-игр мира ребёнку. */
  setWorldConfig: (childId: string, config: WorldGameConfig) => void;
  /** Записать попытку из игры: попадает в историю и в дневную активность. */
  recordGameAttempt: (childId: string, exerciseTitle: string, score: number) => void;
  /** Записать попытку из «Шахты звуков»: подробная запись (уровень, звук,
   *  статус pass/review/retry) в ту же историю попыток. */
  recordSoundMineAttempt: (childId: string, input: SoundMineAttemptInput) => void;
}

function emptyWeek() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { date: d.toISOString().slice(0, 10), minutes: 0, tasks: 0, avgScore: null };
  });
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      lang: 'ru',
      therapist: {
        name: 'Амирали Алтай',
        shortName: 'Амирали',
        id: 'TH-7LVV5Y',
      },
      parent: {
        name: 'Айгерим Бекетова',
        relation: 'Мама',
      },
      parentChildId: 'child-4',
      children: CHILDREN,
      attempts: ATTEMPTS,
      notes: NOTES,
      lessons: LESSONS,
      customExercises: [],
      lessonProgress: {
        'lesson-4': ['ex-br-1'],
        'lesson-1': ['ex-br-1', 'ex-art-1'],
      },
      requests: [
        {
          id: 'req-1',
          parentName: 'Динара Ахметова',
          childName: 'Амина Сулейменова',
          age: 4,
          diagnoses: ['speechDelay'],
          date: '2026-06-09',
        },
        {
          id: 'req-2',
          parentName: 'Марат Нурланов',
          childName: 'Дана Нурланова',
          age: 3,
          diagnoses: ['onr'],
          date: '2026-06-10',
        },
      ],
      chatMessages: [
        {
          id: 'msg-1',
          from: 'therapist',
          text: 'Добрый день! Посмотрел вчерашние попытки — отличный прогресс по звуку Ж 👏',
          time: '2026-06-10T09:15:00',
        },
        {
          id: 'msg-2',
          from: 'parent',
          text: 'Спасибо! Дома повторяем «Футбол» каждый вечер, очень нравится.',
          time: '2026-06-10T09:32:00',
        },
        {
          id: 'msg-3',
          from: 'therapist',
          text: 'Супер. На этой неделе добавьте «Цепочку слогов» — 2 раза в день по 3 минуты.',
          time: '2026-06-10T09:40:00',
        },
      ],

      setLang: (lang) => set({ lang }),
      setParentChildId: (id) => set({ parentChildId: id }),
      addChild: (child) => set((s) => ({ children: [child, ...s.children] })),
      addNote: (note) => set((s) => ({ notes: [note, ...s.notes] })),
      addLesson: (lesson) => set((s) => ({ lessons: [lesson, ...s.lessons] })),
      removeLesson: (id) => set((s) => ({ lessons: s.lessons.filter((l) => l.id !== id) })),
      addCustomExercise: (exercise) =>
        set((s) => ({ customExercises: [exercise, ...s.customExercises] })),
      toggleExerciseDone: (lessonId, exerciseId) =>
        set((s) => {
          const done = s.lessonProgress[lessonId] ?? [];
          const next = done.includes(exerciseId)
            ? done.filter((id) => id !== exerciseId)
            : [...done, exerciseId];
          return { lessonProgress: { ...s.lessonProgress, [lessonId]: next } };
        }),
      acceptRequest: (id) =>
        set((s) => {
          const req = s.requests.find((r) => r.id === id);
          if (!req) return s;
          const child: Child = {
            id: newId('child'),
            name: req.childName,
            age: req.age,
            diagnoses: req.diagnoses,
            progress: 0,
            connectedAt: new Date().toISOString().slice(0, 10),
            daily: emptyWeek(),
          };
          return {
            children: [child, ...s.children],
            requests: s.requests.filter((r) => r.id !== id),
          };
        }),
      declineRequest: (id) =>
        set((s) => ({ requests: s.requests.filter((r) => r.id !== id) })),
      sendChatMessage: (from, text) =>
        set((s) => ({
          chatMessages: [
            ...s.chatMessages,
            { id: newId('msg'), from, text, time: new Date().toISOString() },
          ],
        })),

      specialists: SPECIALISTS,
      clinicClients: CLINIC_CLIENTS,
      appointments: APPOINTMENTS,
      inviteSpecialist: (name, role) =>
        set((s) => ({
          specialists: [
            ...s.specialists,
            { id: newId('sp'), name, role, status: 'invited', clients: 0, loadPercent: 0, rating: 0 },
          ],
        })),
      addClinicClient: (client) =>
        set((s) => ({ clinicClients: [client, ...s.clinicClients] })),
      setClientStage: (id, stage) =>
        set((s) => ({
          clinicClients: s.clinicClients.map((c) => (c.id === id ? { ...c, stage } : c)),
        })),
      setAppointmentStatus: (id, status) =>
        set((s) => {
          const appt = s.appointments.find((a) => a.id === id);
          const appointments = s.appointments.map((a) => (a.id === id ? { ...a, status } : a));
          // Проведённое занятие списывает одно из абонемента клиента.
          let clinicClients = s.clinicClients;
          if (appt && status === 'completed' && appt.status !== 'completed') {
            clinicClients = s.clinicClients.map((c) =>
              c.id === appt.clientId && c.subscription
                ? {
                    ...c,
                    subscription: {
                      ...c.subscription,
                      sessionsUsed: Math.min(
                        c.subscription.sessionsPaid,
                        c.subscription.sessionsUsed + 1,
                      ),
                    },
                  }
                : c,
            );
          }
          return { appointments, clinicClients };
        }),
      addAppointment: (appt) =>
        set((s) => ({ appointments: [...s.appointments, appt] })),
      topUpSubscription: (clientId, count) =>
        set((s) => ({
          clinicClients: s.clinicClients.map((c) =>
            c.id === clientId && c.subscription
              ? { ...c, subscription: { ...c.subscription, sessionsPaid: c.subscription.sessionsPaid + count } }
              : c,
          ),
        })),

      gameStateByChild: {},
      setGameState: (childId, json) =>
        set((s) => ({ gameStateByChild: { ...s.gameStateByChild, [childId]: json } })),
      worldStateByChild: {},
      worldUpdatedAt: {},
      setWorldState: (childId, json, updatedAt) =>
        set((s) => ({
          worldStateByChild: { ...s.worldStateByChild, [childId]: json },
          worldUpdatedAt: { ...s.worldUpdatedAt, [childId]: updatedAt ?? Date.now() },
        })),
      mergeRemoteWorldState: (childId, json, updatedAt) =>
        set((s) => {
          if (updatedAt <= (s.worldUpdatedAt[childId] ?? 0)) return {};
          return {
            worldStateByChild: { ...s.worldStateByChild, [childId]: json },
            worldUpdatedAt: { ...s.worldUpdatedAt, [childId]: updatedAt },
          };
        }),
      clearWorldState: (childId) =>
        set((s) => {
          const worldStateByChild = { ...s.worldStateByChild };
          const worldUpdatedAt = { ...s.worldUpdatedAt };
          delete worldStateByChild[childId];
          delete worldUpdatedAt[childId];
          return { worldStateByChild, worldUpdatedAt };
        }),
      worldConfigByChild: {},
      setWorldConfig: (childId, config) =>
        set((s) => ({ worldConfigByChild: { ...s.worldConfigByChild, [childId]: config } })),
      soundMineStateByChild: {},
      setSoundMineState: (childId, json) =>
        set((s) => ({ soundMineStateByChild: { ...s.soundMineStateByChild, [childId]: json } })),
      recordGameAttempt: (childId, exerciseTitle, score) =>
        set((s) => {
          const today = new Date().toISOString().slice(0, 10);
          const attempt: Attempt = {
            id: newId('at-game'),
            childId,
            date: today,
            exerciseTitle,
            expectedWord: '🎮',
            recognizedWord: 'Остров Эха',
            score,
          };
          // Дневная активность обновляется в последней (самой свежей) точке —
          // именно её карточка ребёнка показывает как «сегодня».
          const children = s.children.map((c) => {
            if (c.id !== childId) return c;
            const daily = [...c.daily];
            const i = daily.length - 1;
            const prev = daily[i];
            const tasks = prev.tasks + 1;
            const avgScore =
              prev.avgScore == null
                ? score
                : Math.round((prev.avgScore * prev.tasks + score) / tasks);
            daily[i] = { ...prev, tasks, minutes: prev.minutes + 3, avgScore };
            return { ...c, daily, progress: Math.min(100, c.progress + 1) };
          });
          return { attempts: [attempt, ...s.attempts], children };
        }),
      recordSoundMineAttempt: (childId, input) =>
        set((s) => {
          const today = new Date().toISOString().slice(0, 10);
          const attempt: Attempt = {
            id: newId('at-mine'),
            childId,
            date: today,
            // В существующую «Историю попыток» показываем урок + слово.
            exerciseTitle: input.lessonTitle,
            expectedWord: input.expected,
            recognizedWord: input.transcription,
            score: input.score,
            itemId: input.itemId,
            level: input.level,
            targetSound: input.targetSound,
            attemptNo: input.attemptNo,
            gestureOk: input.gestureOk,
            durationMs: input.durationMs,
            status: input.status,
          };
          // Дневная активность обновляется в свежей точке (как у recordGameAttempt).
          const children = s.children.map((c) => {
            if (c.id !== childId) return c;
            const daily = [...c.daily];
            const i = daily.length - 1;
            const prev = daily[i];
            const tasks = prev.tasks + 1;
            const avgScore =
              prev.avgScore == null
                ? input.score
                : Math.round((prev.avgScore * prev.tasks + input.score) / tasks);
            daily[i] = { ...prev, tasks, minutes: prev.minutes + 1, avgScore };
            return { ...c, daily, progress: Math.min(100, c.progress + 1) };
          });
          return { attempts: [attempt, ...s.attempts], children };
        }),
    }),
    {
      name: 'speechsteps-store',
      // v5: детский режим «Остров Эха» (состояние игры, попытки из игры).
      // Персист прошлых версий сбрасывается на новый сид.
      version: 5,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
}
