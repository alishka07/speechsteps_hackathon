/**
 * Нейроголос Үнчика (web): vits-web + Piper (русская модель).
 *
 * ВАЖНО: саму библиотеку мы НЕ импортируем в коде — она лежит строками
 * (data/vits-web-src.ts + data/vits-piper-src.ts, как three-lib.ts) и
 * исполняется через blob-URL + вставку <script type="module">. Vite
 * оставляет модель самостоятельным модулем браузера.
 *
 * Строки уже пропатчены под браузер при генерации:
 *  - node-ветка Emscripten отключена (никаких require("fs"));
 *  - numThreads = 1 (не нужен cross-origin isolation / SharedArrayBuffer);
 *  - bare-импорт onnxruntime-web заменён на полный URL с CDN.
 * onnxruntime + phonemizer + модель тянутся с CDN/HuggingFace при первом
 * запуске; модель кэшируется в OPFS → дальше работает без сети.
 *
 * Любая ошибка → возвращаем false и откатываемся на встроенный голос
 * браузера (см. browserSpeak в play-world.web.tsx).
 */
import { VITS_PIPER_SRC } from '@/data/vits-piper-src';
import { VITS_WEB_SRC } from '@/data/vits-web-src';

const VOICE = 'ru_RU-irina-medium'; // (denis/ruslan/dmitri — на выбор)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Vits = any;

let modPromise: Promise<Vits> | null = null;
let prep: Promise<boolean> | null = null;
let mod: Vits = null;
let current: HTMLAudioElement | null = null;
let lastUrl: string | null = null;
let broken = false;

function moduleBlobUrl(src: string): string {
  return URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
}

function loadMod(): Promise<Vits> {
  if (modPromise) return modPromise;
  modPromise = new Promise<Vits>((resolve) => {
    try {
      // piper-glue → blob; его URL подставляем в исходник vits-web вместо
      // относительного импорта "./piper-DeOu3H9E.js".
      const piperUrl = moduleBlobUrl(VITS_PIPER_SRC);
      const webUrl = moduleBlobUrl(VITS_WEB_SRC.replace('__PIPER_URL__', piperUrl));
      const id = '__vits_' + Date.now();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any)[id] = (m: Vits) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any)[id];
        resolve(m);
      };
      const s = document.createElement('script');
      s.type = 'module';
      // import() здесь исполняет браузер, а не сборщик приложения.
      s.textContent =
        "import('" +
        webUrl +
        "').then(function(m){window['" +
        id +
        "'](m);}).catch(function(e){console.warn('[npcTts] vits load failed',e);window['" +
        id +
        "'](null);});";
      s.onerror = () => resolve(null);
      document.head.appendChild(s);
    } catch {
      resolve(null);
    }
  });
  return modPromise;
}

function clean(text: string): string {
  return (text || '')
    .replace(/[^0-9A-Za-zЀ-ӿ\s.,!?«»:-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function ready(): Promise<boolean> {
  if (broken) return false;
  if (!prep) {
    prep = (async () => {
      try {
        mod = await loadMod();
        if (!mod || typeof mod.predict !== 'function') {
          broken = true;
          return false;
        }
        const have: string[] = await mod.stored();
        if (!have.includes(VOICE)) await mod.download(VOICE);
        return true;
      } catch {
        broken = true;
        return false;
      }
    })();
  }
  return prep;
}

/** Заранее загрузить библиотеку и модель (на входе в игру). */
export function warmupNpcVoice(): void {
  void ready();
}

/** Озвучить фразу нейроголосом. true — проиграл; false — нужен откат. */
export async function speakNpc(text: string): Promise<boolean> {
  const t = clean(text);
  if (!t) return true;
  const ok = await ready();
  if (!ok || !mod) return false;
  try {
    const wav: Blob = await mod.predict({ text: t, voiceId: VOICE });
    stopNpc();
    const url = URL.createObjectURL(wav);
    lastUrl = url;
    const audio = new Audio(url);
    // Чуть замедляем русскую нейроозвучку и опускаем тон — голос звучит
    // спокойнее и теплее для детского спутника.
    audio.playbackRate = 0.95;
    audio.preservesPitch = false;
    current = audio;
    audio.onended = () => {
      if (lastUrl === url) {
        URL.revokeObjectURL(url);
        lastUrl = null;
      }
    };
    try {
      await audio.play();
    } catch {
      // Если браузер не начал проигрывание (например, из-за autoplay policy),
      // сообщаем об этом обёртке, чтобы она включила системный голос.
      stopNpc();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function stopNpc(): void {
  if (current) {
    try {
      current.pause();
    } catch {
      /* noop */
    }
    current = null;
  }
  if (lastUrl) {
    URL.revokeObjectURL(lastUrl);
    lastUrl = null;
  }
}
