import { Exercise } from './types';

/**
 * Привязка зон 3D-мира к реальным назначенным упражнениям ребёнка.
 * Механики фиксированы за зонами, конкретную задачу (название, целевой
 * звук) берём из урока логопеда. Каждой механике подбираем СВОЁ упражнение
 * (не повторяемся), так что один урок наполняет сразу несколько зон:
 *  - blow      ← дыхательные;
 *  - sustain   ← автоматизация / свистящие-шипящие (С,З,Ц,Ш,Ж,Щ,Ч);
 *  - rhythm    ← фонематические (слоги/звуки);
 *  - shout     ← артикуляция;
 *  - longvoice ← связная речь / гласные (тянуть голосом «Аaa»).
 * Нет подходящего упражнения — зона остаётся с дефолтной задачей.
 */
export interface Mission {
  title: string;
  sound: string;
  emoji: string;
}

export interface WorldMissions {
  shout: Mission | null;
  sustain: Mission | null;
  blow: Mission | null;
  rhythm: Mission | null;
  longvoice: Mission | null;
}

const SIBILANTS = ['С', 'З', 'Ц', 'Ш', 'Ж', 'Щ', 'Ч'];
const VOWELS = ['А', 'О', 'У', 'И', 'Э', 'Ы', 'Я', 'Е', 'Ё', 'Ю'];

function toMission(ex: Exercise): Mission {
  return { title: ex.title, sound: ex.focusSound ?? '', emoji: ex.emoji || '🎯' };
}

export function buildWorldMissions(exercises: Exercise[]): WorldMissions {
  const used = new Set<string>();
  // Подбираем первое ещё не занятое упражнение под условие.
  const pick = (pred: (e: Exercise) => boolean): Mission | null => {
    const e = exercises.find((x) => !used.has(x.id) && pred(x));
    if (e) used.add(e.id);
    return e ? toMission(e) : null;
  };
  return {
    blow: pick((e) => e.category === 'breathing'),
    sustain: pick(
      (e) => e.category === 'automation' || (!!e.focusSound && SIBILANTS.includes(e.focusSound)),
    ),
    rhythm: pick((e) => e.category === 'phonemic'),
    shout: pick((e) => e.category === 'articulation'),
    longvoice: pick(
      (e) =>
        e.category === 'connected' ||
        (!!e.focusSound && VOWELS.includes(e.focusSound)) ||
        e.category === 'articulation',
    ),
  };
}
