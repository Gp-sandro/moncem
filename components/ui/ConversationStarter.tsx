import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, fonts, radius, sizes, spacing } from '../../constants/theme';
import { startConversation } from '../../lib/queries';
import type { Profile } from '../../lib/types';
import { useToast } from './Toast';

interface Props {
  visible: boolean;
  onClose: () => void;
  recipient: Pick<Profile, 'id' | 'fullName' | 'username'>;
  contextPostId?: string;
  contextPostTitle?: string;
}

export function ConversationStarter({
  visible,
  onClose,
  recipient,
  contextPostId,
  contextPostTitle,
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recipientName = recipient.fullName || recipient.username;

  async function handleSend() {
    if (!message.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const conversationId = await startConversation(
        recipient.id,
        message.trim(),
        contextPostId,
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      showToast({ message: 'Message sent', type: 'new_message' });
      setMessage('');
      onClose();
      router.push(`/inbox/${conversationId}` as never);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send — try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (loading) return;
    setMessage('');
    setError(null);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose} />

      <KeyboardAvoidingView
        style={styles.sheetWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Connect with {recipientName}</Text>
            <Pressable onPress={handleClose} hitSlop={8}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>

          {contextPostTitle ? (
            <View style={styles.contextBanner}>
              <Text style={styles.contextLabel}>RE: </Text>
              <Text style={styles.contextTitle} numberOfLines={1}>{contextPostTitle}</Text>
            </View>
          ) : null}

          <Text style={styles.hint}>
            Introduce yourself and share why you're reaching out.
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TextInput
            style={styles.input}
            value={message}
            onChangeText={(v) => { setMessage(v); setError(null); }}
            placeholder={`Hi ${recipientName.split(' ')[0]}, I came across your post and wanted to connect…`}
            placeholderTextColor={colors.muted}
            multiline
            maxLength={2000}
            textAlignVertical="top"
            autoFocus
          />

          <Text style={styles.charCount}>{message.length}/2000</Text>

          <Pressable
            style={[styles.sendBtn, (!message.trim() || loading) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!message.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.parchment} size="small" />
            ) : (
              <Text style={styles.sendBtnText}>SEND MESSAGE →</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function ConnectBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    open:    { label: 'OPEN TO CONNECT', color: colors.reaction.validated },
    limited: { label: 'SELECTIVE',       color: colors.gold },
    closed:  { label: 'CLOSED',          color: colors.muted },
  };
  const c = config[status] ?? config.closed;

  return (
    <View style={[styles.badge, { borderColor: c.color }]}>
      <View style={[styles.badgeDot, { backgroundColor: c.color }]} />
      <Text style={[styles.badgeText, { color: c.color }]}>{c.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16,14,9,0.45)',
  },
  sheetWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: colors.parchment,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: sizes.screenPadding,
    paddingBottom: 40,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.xs,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.obsidian,
    flex: 1,
  },
  cancelText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.muted,
  },
  contextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.avatarBg,
    borderRadius: radius.tag,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  contextLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    color: colors.gold,
    letterSpacing: 0.5,
  },
  contextTitle: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.muted,
    flex: 1,
  },
  hint: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: colors.errorBg,
    borderRadius: radius.card,
    padding: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.errorRed,
  },
  errorText: { fontFamily: fonts.sans, fontSize: 12, color: colors.errorRed },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.obsidian,
    minHeight: 120,
    lineHeight: 20,
  },
  charCount: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.muted,
    textAlign: 'right',
    marginTop: -spacing.xs,
  },
  sendBtn: {
    height: sizes.tapTarget + 4,
    backgroundColor: colors.obsidian,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 1.5,
    color: colors.parchment,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeDot: { width: 5, height: 5, borderRadius: 2.5 },
  badgeText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1,
  },
});
