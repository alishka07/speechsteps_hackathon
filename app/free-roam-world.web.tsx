import { Ionicons } from '@/web/Icon';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from '@/web/ui';
import { useSafeAreaInsets } from '@/web/ui';

import { echoName } from '@/data/echoMapping';
import { EXERCISES } from '@/data/exercises';
import { worldHtml } from '@/data/world3d-html';
import { normalizeWorldConfig } from '@/data/worldConfig';
import { buildWorldMissions } from '@/data/worldMissions';
import { pullWorldProgress, pushWorldProgress } from '@/lib/worldSync';
import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme';
import { IS_HACKATHON_DEMO } from '@/web/demo/config';
import { saveCameraRouteResult } from '@/web/demo/demoResultsData';

type WorldLoadState = 'loading' | 'ready' | 'error' | 'timeout' | 'context-lost';

// JSON is embedded in an inline script: an exercise title must never close it.
function scriptJson(value: unknown): string {
  return (JSON.stringify(value) ?? 'null').replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

// Запасная озвучка встроенным голосом браузера (если нейроголос не доступен).
function browserSpeak(text: string) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const clean = (text || '')
      .replace(/[^0-9A-Za-zЀ-ӿ\s.,!?«»:-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!clean) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'ru-RU';
    // Спокойная подача и голос Үнчика без излишне высокого «мультяшного» тона.
    u.rate = 0.9;
    u.pitch = 1.03;
    u.volume = 0.96;
    const vs = synth.getVoices() || [];
    const v =
      vs.find((x) => /ru/i.test(x.lang) && /irina|svetlana|alena|arina|female|woman/i.test(x.name)) ||
      vs.find((x) => /ru/i.test(x.lang) && /google|yandex|natural|neural|enhanced|premium/i.test(x.name)) ||
      vs.find((x) => /ru/i.test(x.lang) && x.localService === false) ||
      vs.find((x) => /ru/i.test(x.lang));
    if (v) u.voice = v;
    synth.speak(u);
  } catch {
    /* нет TTS — тишина */
  }
}

/**
 * Веб-обёртка 3D-мира «Остров Эха». Мир — самодостаточный HTML (Three.js)
 * в <iframe>. Мост window.SpeechSteps:
 *  - getMissions: задачи зон из назначенного урока ребёнка;
 *  - loadState/saveState: прогресс мира (этапы/звёзды) в общий store;
 *  - onEvent: телеметрия → попытки ребёнка.
 */
export default function FreeRoamWorldScreen({ onBackToStory, onFinish }: { onBackToStory: () => void; onFinish: () => void }) {
  const insets = useSafeAreaInsets();
  const childId = useAppStore((s) => s.parentChildId);
  const lessons = useAppStore((s) => s.lessons);
  const customExercises = useAppStore((s) => s.customExercises);
  const savedWorld = useAppStore((s) => s.worldStateByChild[s.parentChildId] ?? null);
  const worldConfig = useAppStore((s) => s.worldConfigByChild[s.parentChildId] ?? null);
  const setWorldState = useAppStore((s) => s.setWorldState);
  const mergeRemoteWorldState = useAppStore((s) => s.mergeRemoteWorldState);
  const recordGameAttempt = useAppStore((s) => s.recordGameAttempt);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const npcVoice = useRef<typeof import('@/lib/npcTts.web') | null>(null);
  const [loadState, setLoadState] = useState<WorldLoadState>('loading');
  const loadStateRef = useRef<WorldLoadState>('loading');
  const [bootAttempt, setBootAttempt] = useState(0);

  function updateLoadState(next: WorldLoadState) {
    loadStateRef.current = next;
    setLoadState(next);
  }

  function retryWorld() {
    updateLoadState('loading');
    setBootAttempt((attempt) => attempt + 1);
  }

  // Перед стартом подтягиваем облачный прогресс (возобновление на новом
  // устройстве). Ждём с таймаутом, затем строим мир со свежим состоянием.
  const [synced, setSynced] = useState(false);
  useEffect(() => {
    if (IS_HACKATHON_DEMO) { setSynced(true); return; }
    let active = true;
    (async () => {
      const res = await pullWorldProgress(childId);
      if (active && res) mergeRemoteWorldState(childId, res.state, res.updatedAt);
      if (active) setSynced(true);
    })();
    return () => {
      active = false;
    };
  }, [childId, mergeRemoteWorldState]);

  useEffect(() => {
    if (!synced || loadState !== 'loading') return;
    const timeout = window.setTimeout(() => {
      if (loadStateRef.current === 'loading') updateLoadState('timeout');
    }, 12000);
    return () => window.clearTimeout(timeout);
  }, [synced, bootAttempt, loadState]);

  useEffect(() => {
    if (loadState === 'loading' || loadState === 'ready') return;
    npcVoice.current?.stopNpc();
    window.speechSynthesis?.cancel();
  }, [loadState]);

  // Задачи зон из урока, назначенного ребёнку (фиксируются на вход в мир).
  const missions = useMemo(() => {
    if (IS_HACKATHON_DEMO) return buildWorldMissions([]);
    const all = [...customExercises, ...EXERCISES];
    const lesson = lessons.find((l) => l.childId === childId);
    const exs = lesson
      ? lesson.exerciseIds
          .map((id) => all.find((e) => e.id === id))
          .filter((e): e is NonNullable<typeof e> => !!e)
      : [];
    return buildWorldMissions(exs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handler(e: MessageEvent) {
      const d = e.data as { source?: string; type?: string; json?: string; text?: string; reason?: string };
      if (e.source !== iframeRef.current?.contentWindow || !d || d.source !== 'speechsteps') return;
      if (loadStateRef.current !== 'loading' && loadStateRef.current !== 'ready') return;
      if (d.type === 'world-ready') {
        if (loadStateRef.current === 'loading') updateLoadState('ready');
        return;
      }
      if (d.type === 'world-error') {
        updateLoadState(d.reason === 'webgl-context-lost' ? 'context-lost' : 'error');
        return;
      }
      if (IS_HACKATHON_DEMO && d.type === 'finish-demo') { onFinish(); return; }
      if (d.type === 'save' && typeof d.json === 'string') {
        const now = Date.now();
        setWorldState(childId, d.json, now);
        if (!IS_HACKATHON_DEMO) pushWorldProgress(childId, d.json, now);
        return;
      }
      if (d.type === 'event' && typeof d.json === 'string') {
        try {
          const ev = JSON.parse(d.json);
          if (IS_HACKATHON_DEMO) { saveCameraRouteResult(childId, ev); return; }
          if (typeof ev.best === 'number') {
            recordGameAttempt(childId, echoName(ev.exercise ?? 'world'), ev.best);
          }
        } catch {
          /* игнорируем неразобранные события */
        }
        return;
      }
      // Үнчик говорит: нейроголос (vits-web), иначе — встроенный браузерный.
      if (d.type === 'speak' && typeof d.text === 'string') {
        const text = d.text;
        if (IS_HACKATHON_DEMO) { browserSpeak(text); return; }
        if (!npcVoice.current) { browserSpeak(text); return; }
        const speakingFrame = e.source;
        npcVoice.current.speakNpc(text).then((ok) => {
          if (!ok && loadStateRef.current === 'ready' && iframeRef.current?.contentWindow === speakingFrame) browserSpeak(text);
        });
      }
    }
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [childId, recordGameAttempt, setWorldState, onFinish]);

  // Подготовить нейромодель заранее и остановить голос при выходе.
  useEffect(() => {
    let active = true;
    if (!IS_HACKATHON_DEMO) void import('@/lib/npcTts.web').then(voice => {
      if (active) { npcVoice.current = voice; voice.warmupNpcVoice(); }
    });
    return () => { active = false; npcVoice.current?.stopNpc(); window.speechSynthesis?.cancel(); };
  }, []);

  // Snapshot progress at boot/retry; an autosave must not reload the iframe.
  const srcDoc = useMemo(() => {
    if (!synced) return '';
    const bridge =
      '<script>(function(){' +
      'var failed=false;' +
      'function fail(reason){if(failed)return;failed=true;parent.postMessage({source:"speechsteps",type:"world-error",reason:reason},"*");}' +
      // Resource load events are not ErrorEvents. Camera/model failures are
      // caught inside the world and remain recoverable through its own UI.
      'window.addEventListener("error",function(event){if(event instanceof ErrorEvent)fail("runtime");});' +
      'document.addEventListener("webglcontextlost",function(){fail("webgl-context-lost");},true);' +
      'window.SpeechSteps={' +
      'ready:function(){if(!failed)parent.postMessage({source:"speechsteps",type:"world-ready"},"*");},' +
      'loadState:function(){return ' +
      scriptJson(savedWorld) +
      ';},' +
      'saveState:function(j){parent.postMessage({source:"speechsteps",type:"save",json:j},"*");},' +
      'speak:function(txt){parent.postMessage({source:"speechsteps",type:"speak",text:txt},"*");},' +
      'getMissions:function(){return ' +
      scriptJson(JSON.stringify(missions)) +
      ';},' +
      'getConfig:function(){return ' +
      scriptJson(JSON.stringify({ ...normalizeWorldConfig(IS_HACKATHON_DEMO ? null : worldConfig), demoOnly: IS_HACKATHON_DEMO })) +
      ';},' +
      'onEvent:function(j){parent.postMessage({source:"speechsteps",type:"event",json:j},"*");}' +
      '};})();</script>';
    // Keep the doctype first so the embedded page stays in standards mode.
    return worldHtml().replace('<head>', '<head>' + bridge);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [synced, bootAttempt]);

  const failed = loadState !== 'loading' && loadState !== 'ready';

  return (
    <View style={styles.root}>
      {synced && !failed && (
        <iframe
          key={bootAttempt}
          ref={iframeRef}
          srcDoc={srcDoc}
          title="Echo Island 3D"
          allow="camera; microphone; autoplay; fullscreen"
          aria-hidden={loadState !== 'ready'}
          tabIndex={loadState === 'ready' ? 0 : -1}
          style={{ ...iframeStyle, visibility: loadState === 'ready' ? 'visible' : 'hidden' }}
        />
      )}
      {loadState === 'loading' && (
        <View role="status" aria-live="polite" style={styles.loading}>
          <ActivityIndicator color="#9ddfee" size="large" />
          <Text style={styles.loadingTitle}>Остров просыпается…</Text>
          <Text style={styles.loadingText}>Готовим поляну для игры</Text>
        </View>
      )}
      {failed ? (
        <View style={styles.failure}>
          <View role="alert" style={styles.failureCard}>
            <View aria-hidden="true" style={styles.failureIcon}>
              <Ionicons name="sparkles-outline" size={30} color="#b9ddff" />
            </View>
            <Text style={styles.failureTitle}>
              {loadState === 'context-lost' ? 'Острову нужна пауза' : 'Не удалось открыть остров'}
            </Text>
            <Text style={styles.failureText}>
              {loadState === 'context-lost'
                ? 'Браузер приостановил 3D-сцену. Можно открыть её заново.'
                : loadState === 'timeout'
                  ? '3D-сцена не ответила вовремя. Попробуй загрузить её ещё раз.'
                  : 'Браузеру не удалось запустить 3D-сцену. Попробуй ещё раз или вернись на главный экран.'}
            </Text>
            <Pressable onPress={retryWorld} style={styles.retry}>
              <Ionicons name="repeat-outline" size={20} color="#15243b" />
              <Text style={styles.retryText}>Попробовать снова</Text>
            </Pressable>
            <Pressable onPress={onBackToStory} style={styles.back}>
              <Ionicons name="arrow-back" size={18} color="#d2e7fa" />
              <Text>На главный экран</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={onBackToStory}
          style={[styles.exit, { top: insets.top + 8 }]}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={20} color={colors.white} />
          <Text style={styles.exitText}>На остров</Text>
        </Pressable>
      )}
    </View>
  );
}

const iframeStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  border: 'none',
  display: 'block',
};

const styles = StyleSheet.create({
  // This route is mounted outside the dashboard layout, so it needs an
  // explicit viewport-sized box for the iframe's 100% height to resolve.
  root: { position: 'fixed', inset: 0, width: '100%', height: '100dvh', minHeight: 0, flex: 1, backgroundColor: '#101e35' },
  loading: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, background: 'radial-gradient(ellipse at 50% 80%, #264b65, #101e35 75%)', textAlign: 'center' },
  loadingTitle: { color: '#edf7ff', fontSize: 21, fontWeight: '700', marginTop: 8 },
  loadingText: { color: '#b8cede', fontSize: 14 },
  failure: { position: 'absolute', inset: 0, overflowY: 'auto', alignItems: 'center', padding: 24, background: 'radial-gradient(ellipse at 15% 90%, #24475c, transparent 55%), radial-gradient(ellipse at 85% 10%, #3e385b, #101e35 80%)' },
  failureCard: { alignItems: 'center', flexShrink: 0, gap: 16, width: '100%', maxWidth: 420, margin: 'auto', padding: '28px 22px', borderRadius: 24, border: '1px solid rgba(192,218,247,.17)', backgroundColor: 'rgba(15,29,50,.83)', boxShadow: '0 24px 90px rgba(0,0,0,.2)', textAlign: 'center' },
  failureIcon: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(153,196,246,.1)' },
  failureTitle: { color: '#eff7ff', fontSize: 24, fontWeight: '800', lineHeight: 1.2 },
  failureText: { color: '#c1d4e6', fontSize: 15, lineHeight: 1.6 },
  retry: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, width: '100%', minHeight: 48, padding: '12px 18px', borderRadius: 14, marginTop: 6, background: 'linear-gradient(110deg, #bde7f2, #bac4ff)' },
  retryText: { color: '#15243b', fontWeight: '800', fontSize: 15 },
  back: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#d2e7fa', minHeight: 44, padding: '8px 12px', fontSize: 14 },
  exit: {
    position: 'absolute',
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
    backgroundColor: 'rgba(41,48,61,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  exitText: { color: colors.white, fontWeight: '700', fontSize: 13 },
});
