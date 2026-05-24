import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ListSkeleton } from '../../components/ui/SkeletonCard';
import { useToast } from '../../components/ui/Toast';
import { ANIM } from '../../constants/animations';
import { colors, fonts, radius, sizes, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useMessages } from '../../hooks/useInbox';
import { fetchConversations } from '../../lib/queries';
import type { Conversation, Message } from '../../lib/types';

function AnimatedBubble({ msg, isMe, showTime, isNew }: { msg: Message; isMe: boolean; showTime: boolean; isNew: boolean }) {
  const translateY = useSharedValue(isNew ? 20 : 0);
  const opacity = useSharedValue(isNew ? 0 : 1);
  const time = formatTime(msg.createdAt);

  useEffect(() => {
    if (isNew) {
      translateY.value = withTiming(0, { duration: 200 });
      opacity.value = withTiming(1, { duration: 200 });
    }
  }, [isNew]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.bubbleWrap, isMe && styles.bubbleWrapMe, animStyle]}>
      <View style={styles.bubbleRow}>
        {!isMe && showTime && <View style={styles.tailThem} />}
        {isMe && showTime && <View style={styles.tailMe} />}
        <View style={[
          styles.bubble,
          isMe ? styles.bubbleMe : styles.bubbleThem,
          !isMe && showTime && styles.bubbleThemWithTail,
          isMe && showTime && styles.bubbleMeWithTail,
        ]}>
          <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{msg.body}</Text>
        </View>
      </View>
      {showTime && (
        <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>{time}</Text>
      )}
    </Animated.View>
  );
}

function isWithin5Min(a: string, b: string): boolean {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) < ANIM.messageGroupWindow;
}

function formatTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function isSameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function DateSeparator({ label }: { label: string }) {
  return (
    <View style={separatorStyles.wrap}>
      <View style={separatorStyles.line} />
      <Text style={separatorStyles.label}>{label}</Text>
      <View style={separatorStyles.line} />
    </View>
  );
}

const separatorStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', marginVertical: 8, gap: 8 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  label: { fontFamily: fonts.sans, fontSize: 11, color: colors.muted },
});

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const router = useRouter();
  const userId = session?.user.id ?? '';
  const { showToast } = useToast();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<Message>>(null);
  const prevMessageCount = useRef(0);
  const latestMessageId = useRef<string | null>(null);

  const { messages, loading, sending, error, send, reload } = useMessages(id, userId);

  // Send button scale animation
  const sendScale = useSharedValue(1);
  const sendStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
  }));

  useEffect(() => {
    if (!userId || !id) return;
    fetchConversations(userId).then((convs) => {
      const found = convs.find((c) => c.id === id);
      if (found) setConversation(found);
    }).catch(() => {});
  }, [id, userId]);

  // Track latest message for entrance animation
  useEffect(() => {
    if (messages.length > 0) {
      latestMessageId.current = messages[messages.length - 1].id;
    }
    prevMessageCount.current = messages.length;
  }, [messages.length]);

  const otherName = conversation?.otherParticipant.fullName
    || conversation?.otherParticipant.username
    || '…';

  // Inverted list: messages are shown newest at bottom by reversing
  const reversedMessages = [...messages].reverse();

  async function handleSend() {
    const body = draft.trim();
    if (!body || sending) return;

    // Animate send button
    sendScale.value = withSequence(
      withTiming(0.88, { duration: ANIM.sendPressIn }),
      withTiming(1, { duration: ANIM.sendPressOut }),
    );

    setDraft('');

    try {
      await send(body);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      showToast({ message: 'Sent', type: 'success' });
    } catch (err) {
      setDraft(body);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      showToast({
        message: err instanceof Error ? err.message : 'Failed to send message',
        type: 'error',
      });
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBtn}>
          <Feather name="arrow-left" size={20} color={colors.obsidian} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerName} numberOfLines={1}>{otherName}</Text>
        </View>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 52 : 0}
      >
        {loading && messages.length === 0 ? (
          <>
            <ListSkeleton />
            <ListSkeleton />
            <ListSkeleton />
            <ListSkeleton />
          </>
        ) : error && messages.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyChatText}>Could not load this conversation.</Text>
            <Pressable onPress={reload} hitSlop={8} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>RETRY</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList<Message>
            ref={listRef}
            data={reversedMessages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            inverted
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatText}>Start the conversation.</Text>
              </View>
            }
            renderItem={({ item, index }) => {
              // In inverted list, index 0 is the newest message
              const isNewest = index === 0;
              const prev = reversedMessages[index + 1]; // older message
              const next = reversedMessages[index - 1]; // newer message
              // Date separator: show when current msg is from a different day than the previous (older)
              const showDate = !prev || !isSameDay(prev.createdAt, item.createdAt);
              const isMe = item.senderId === userId;
              const showTime = !next
                || next.senderId !== item.senderId
                || !isWithin5Min(item.createdAt, next.createdAt);
              const isNew = isNewest && item.id === latestMessageId.current && messages.length > 1;
              return (
                <>
                  {showDate && <DateSeparator label={formatDateLabel(item.createdAt)} />}
                  <AnimatedBubble msg={item} isMe={isMe} showTime={showTime} isNew={isNew} />
                </>
              );
            }}
          />
        )}

        <View style={styles.composer}>
          <TextInput
            style={styles.composerInput}
            value={draft}
            onChangeText={setDraft}
            placeholder="Write a message…"
            placeholderTextColor={colors.muted}
            multiline
            maxLength={2000}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <Animated.View style={sendStyle}>
            <Pressable
              style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!draft.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator color={colors.parchment} size="small" />
              ) : (
                <Feather name="send" size={16} color={colors.goldLight} />
              )}
            </Pressable>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.parchment },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sizes.screenPadding,
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBtn: {
    width: sizes.tapTarget,
    height: sizes.tapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerName: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.obsidian },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: {
    paddingHorizontal: sizes.screenPadding,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  bubbleWrap: { alignItems: 'flex-start', gap: 2, marginBottom: 2 },
  bubbleWrapMe: { alignItems: 'flex-end' },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end' },
  tailThem: {
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderRightWidth: 8,
    borderTopColor: 'transparent',
    borderRightColor: colors.border,
    marginBottom: 2,
  },
  tailMe: {
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderLeftWidth: 8,
    borderTopColor: 'transparent',
    borderLeftColor: colors.obsidian,
    marginBottom: 2,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.card,
  },
  bubbleMe: { backgroundColor: colors.obsidian },
  bubbleThem: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  bubbleThemWithTail: { borderBottomLeftRadius: 4 },
  bubbleMeWithTail: { borderBottomRightRadius: 4 },
  bubbleText: { fontFamily: fonts.sans, fontSize: 14, color: colors.obsidian, lineHeight: 20 },
  bubbleTextMe: { color: colors.parchment },
  bubbleTime: { fontFamily: fonts.sans, fontSize: 11, color: colors.muted, paddingHorizontal: spacing.xs },
  bubbleTimeMe: { color: colors.muted },
  emptyChat: { flex: 1, alignItems: 'center', paddingTop: spacing.xxxl * 2 },
  emptyChatText: { fontFamily: fonts.sans, fontSize: 13, color: colors.muted },
  retryButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.obsidian,
    borderRadius: radius.card,
  },
  retryButtonText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1.4,
    color: colors.parchment,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: sizes.screenPadding,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
    backgroundColor: colors.parchment,
  },
  composerInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.obsidian,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.avatar,
    backgroundColor: colors.obsidian,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.35 },
});
