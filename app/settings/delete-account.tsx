import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius, sizes, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { deleteAccount } from '../../lib/queries';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const username = profile?.username ?? '';
  const [confirm, setConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = username.length > 0 && confirm.trim() === username && !deleting;

  async function handleDelete(): Promise<void> {
    if (!canDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount();
      await signOut().catch(() => {});
      router.replace('/(auth)/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete account.');
      setDeleting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.iconBtn}>
            <Feather name="arrow-left" size={20} color={colors.obsidian} />
          </Pressable>
          <Text style={styles.headerTitle}>Delete account</Text>
          <View style={styles.iconBtn} />
        </View>

        <View style={styles.body}>
          <Text style={styles.warning}>
            This is permanent. Your profile, posts, reactions, conversations, and notifications
            will be deleted. We cannot recover any of this.
          </Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.field}>
            <Text style={styles.label}>TYPE YOUR USERNAME TO CONFIRM</Text>
            <Text style={styles.username}>@{username}</Text>
            <TextInput
              style={styles.input}
              value={confirm}
              onChangeText={(value) => {
                setConfirm(value);
                setError(null);
              }}
              placeholder={username}
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleDelete}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable
            style={[styles.deleteButton, !canDelete && styles.deleteButtonDisabled]}
            onPress={handleDelete}
            disabled={!canDelete}
          >
            {deleting ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.deleteText}>Delete my account permanently</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.parchment },
  inner: { flex: 1 },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sizes.screenPadding,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconBtn: {
    width: sizes.tapTarget,
    height: sizes.tapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.obsidian,
  },
  body: {
    flex: 1,
    paddingHorizontal: sizes.screenPadding,
    paddingTop: spacing.xxl,
    gap: spacing.xl,
  },
  warning: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.obsidian,
    lineHeight: 30,
  },
  errorText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.errorRed,
    backgroundColor: colors.errorBg,
    padding: spacing.md,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  field: { gap: spacing.sm },
  label: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1.5,
    color: colors.muted,
  },
  username: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.muted,
  },
  input: {
    minHeight: 50,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.obsidian,
  },
  footer: {
    paddingHorizontal: sizes.screenPadding,
    paddingBottom: spacing.xxl,
  },
  deleteButton: {
    minHeight: sizes.tapTarget + 8,
    borderRadius: radius.avatar,
    backgroundColor: colors.errorRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonDisabled: { opacity: 0.4 },
  deleteText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.white,
  },
});
