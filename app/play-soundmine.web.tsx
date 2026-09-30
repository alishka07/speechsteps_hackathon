import { Ionicons } from '@/web/Icon';
import { useRouter } from '@/web/router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from '@/web/ui';
import { useSafeAreaInsets } from '@/web/ui';

import { soundMineHtml } from '@/data/soundMine-html';
import { SAMPLE_SOUND_MINE } from '@/data/soundMineLesson';
import { AttemptStatus, SoundMineLevel } from '@/data/types';
import { useT } from '@/i18n';
import { speakNpc, stopNpc, warmupNpcVoice } from '@/lib/npcTts.web';
import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme';

// Запасная озвучка встроенным голосом браузера (если нейроголос недоступен).
function browserSpeak(text: string) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const clean = (text || '')
      .replace(/[^0-9A-Za-zЀ-ӿ\s.,!?-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!clean) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'ru-RU';
    u.rate = 0.9;
    u.pitch = 1.03;
    u.volume = 0.96;
    const vs = synth.getVoices() || [];
    const v =
      vs.find((x) => /ru/i.test(x.lang) && /irina|svetlana|alena|arina|female|woman/i.test(x.name)) ||
      vs.find((x) => /ru/i.test(x.lang) && /google|yandex|natural|neural|enhanced|premium/i.test(x.name)) ||
      vs.find((x) => /ru/i.test(x.lang));
    if (v) u.voice = v;
    synth.speak(u);
  } catch {
    /* нет TTS — тишина */
  }
}

/**
 * Веб-обёртка «Шахты звуков» — самодостаточный HTML (Three.js) в <iframe>.
 * Мост window.SpeechSteps: getLesson / loadState / saveState / speak / onEvent.
 */
export default function PlaySoundMineWebScreen() {
  const t = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const childId = useAppStore((s) => s.parentChildId);
  const saved = useAppStore((s) => s.soundMineStateByChild[s.parentChildId] ?? null);
  const setSoundMineState = useAppStore((s) => s.setSoundMineState);
  const recordSoundMineAttempt = useAppStore((s) => s.recordSoundMineAttempt);
  const [booted, setBooted] = useState(false);

  const lesson = useMemo(() => SAMPLE_SOUND_MINE, []);

  useEffect(() => {
    function handler(e: MessageEvent) {
      const d = e.data as { source?: string; type?: string; json?: string; text?: string };
      if (!d || d.source !== 'speechsteps') return;
      if (d.type === 'save' && typeof d.json === 'string') {
        setSoundMineState(childId, d.json);
        return;
      }
      if (d.type === 'event' && typeof d.json === 'string') {
        try {
          const ev = JSON.parse(d.json);
          if (ev.event === 'attempt' && typeof ev.score === 'number') {
            recordSoundMineAttempt(childId, {
              lessonTitle: `Шахта звуков: ${ev.targetSound ?? ''} (${ev.level ?? ''})`,
              itemId: String(ev.itemId ?? ''),
              expected: String(ev.expected ?? ''),
              transcription: String(ev.transcription ?? ''),
              score: ev.score,
              level: (ev.level ?? 'word') as SoundMineLevel,
              targetSound: String(ev.targetSound ?? ''),
              attemptNo: Number(ev.attemptNo ?? 1),
              gestureOk: !!ev.gestureOk,
              durationMs: Number(ev.durationMs ?? 0),
              status: (ev.status ?? 'retry') as AttemptStatus,
            });
          }
        } catch {
          /* игнорируем неразобранные события */
        }
        return;
      }
      if (d.type === 'speak' && typeof d.text === 'string') {
        const text = d.text;
        speakNpc(text).then((ok) => {
          if (!ok) browserSpeak(text);
        });
      }
    }
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [childId, recordSoundMineAttempt, setSoundMineState]);

  useEffect(() => {
    warmupNpcVoice();
    setBooted(true);
    return () => stopNpc();
  }, []);

  const srcDoc = useMemo(() => {
    const bridge =
      '<script>window.SpeechSteps={' +
      'loadState:function(){return ' +
      JSON.stringify(saved) +
      ';},' +
      'saveState:function(j){parent.postMessage({source:"speechsteps",type:"save",json:j},"*");},' +
      'speak:function(txt){parent.postMessage({source:"speechsteps",type:"speak",text:txt},"*");},' +
      'getLesson:function(){return ' +
      JSON.stringify(JSON.stringify(lesson)) +
      ';},' +
      'getConfig:function(){return ' +
      JSON.stringify(JSON.stringify({ difficulty: 'normal' })) +
      ';},' +
      'onEvent:function(j){parent.postMessage({source:"speechsteps",type:"event",json:j},"*");}' +
      '};</script>';
    return bridge + soundMineHtml();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booted]);

  return (
    <View style={styles.root}>
      {booted ? (
        <iframe
          srcDoc={srcDoc}
          title="Sound Mine"
          allow="camera; microphone; autoplay; fullscreen"
          style={iframeStyle}
        />
      ) : (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.teal} size="large" />
        </View>
      )}
      <Pressable
        onPress={() => router.back()}
        style={[styles.exit, { top: insets.top + 8 }]}
        hitSlop={8}
      >
        <Ionicons name="close" size={20} color={colors.white} />
        <Text style={styles.exitText}>{t('childMode.exit')}</Text>
      </Pressable>
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
  root: { flex: 1, backgroundColor: '#1b1426' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  exit: {
    position: 'absolute',
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  exitText: { color: colors.white, fontWeight: '700', fontSize: 13 },
});
