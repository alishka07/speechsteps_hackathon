import { Ionicons } from '@/web/Icon';
import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from '@/web/ui';
import { useSafeAreaInsets } from '@/web/ui';

import { Avatar } from '@/components/Avatar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useT } from '@/i18n';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, spacing } from '@/theme';

/** Чат родителя с логопедом (мок, сообщения сохраняются локально). */
export default function ParentChatScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const therapist = useAppStore((s) => s.therapist);
  const messages = useAppStore((s) => s.chatMessages);
  const sendChatMessage = useAppStore((s) => s.sendChatMessage);

  const [text, setText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendChatMessage('parent', trimmed);
    setText('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    // Мок-автоответ логопеда: оживляет демо до подключения реального чата.
    setTimeout(() => {
      const replies = [
        'Спасибо, что написали! Посмотрю записи занятий и вернусь с обратной связью.',
        'Поняла вас. Давайте на этой неделе добавим ещё одно короткое упражнение дома.',
        'Отличный вопрос! Лучше обсудим это на ближайшем занятии — отвечу подробно.',
        'Хорошо! Продолжайте в том же темпе, динамика у ребёнка положительная 👍',
      ];
      sendChatMessage('therapist', replies[Math.floor(Math.random() * replies.length)]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }, 1400);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <ScreenHeader title={t('parent.chatTitle')} subtitle={therapist.name} back />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {messages.map((m) => {
          const mine = m.from === 'parent';
          return (
            <View key={m.id} style={[styles.msgRow, mine && styles.msgRowMine]}>
              {!mine ? <Avatar name={therapist.name} size={30} /> : null}
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheir]}>
                <Text style={[styles.msgText, mine && styles.msgTextMine]}>{m.text}</Text>
                <Text style={[styles.msgTime, mine && styles.msgTimeMine]}>
                  {m.time.slice(11, 16)}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.inputRow, { paddingBottom: insets.bottom + spacing.md }]}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={t('parent.chatPlaceholder')}
          placeholderTextColor={colors.textMuted}
          multiline
        />
        <Pressable onPress={send} style={({ pressed }) => [styles.sendBtn, pressed && { opacity: 0.8 }]}>
          <Ionicons name="send" size={18} color={colors.white} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg },
  list: { flex: 1 },
  listContent: { padding: spacing.lg, gap: spacing.md },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  msgRowMine: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '78%',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: 3,
  },
  bubbleTheir: { backgroundColor: colors.card, borderBottomLeftRadius: 4 },
  bubbleMine: { backgroundColor: colors.teal, borderBottomRightRadius: 4 },
  msgText: { fontSize: 14.5, color: colors.navy, lineHeight: 20 },
  msgTextMine: { color: colors.white },
  msgTime: { fontSize: 12, color: colors.textMuted, alignSelf: 'flex-end' },
  msgTimeMine: { color: 'rgba(255,255,255,0.8)' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.bg,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.navy,
    maxHeight: 110,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
