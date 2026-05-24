import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius, sizes, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { mapAuthError } from '../../lib/authErrors';
import { supabase } from '../../lib/supabase';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { session, signOut, refreshProfile } = useAuth();
  const email = session?.user.email ?? '';
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resend(): Promise<void> {
    if (!email || sending) return;
    setSending(true);
    setError(null);
    setMessage(null);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (resendError) throw resendError;
      setMessage('Verification email sent. Check your inbox.');
    } catch (err) {
      setError(mapAuthError(err instanceof Error ? err.message : 'Could not resend email.'));
    } finally {
      setSending(false);
    }
  }

  async function checkAgain(): Promise<void> {
    if (checking) return;
    setChecking(true);
    setError(null);
    try {
      const { data, error: sessionError } = await supabase.auth.refreshSession();
      if (sessionError) throw sessionError;
      await refreshProfile();
      if (data.session?.user.email_confirmed_at) {
        router.replace('/onboarding/welcome');
      } else {
        setMessage('Still waiting for email verification.');
      }
    } catch (err) {
      setError(mapAuthError(err instanceof Error ? err.message : 'Could not refresh session.'));
    } finally {
      setChecking(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.inner}>
        <View style={styles.copy}>
          <Text style={styles.wordmark}>MONCEM</Text>
          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.body}>
            We sent a verification link to {email || 'your inbox'}. Open it, then come back here.
          </Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {message ? <Text style={styles.messageText}>{message}</Text> : null}

        <View style={styles.actions}>
          <Pressable style={styles.primaryButton} onPress={checkAgain} disabled={checking}>
            {checking ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.primaryText}>I verified my email</Text>
            )}
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={resend} disabled={sending}>
            {sending ? (
              <ActivityIndicator color={colors.gold} size="small" />
            ) : (
              <Text style={styles.secondaryText}>Resend email</Text>
            )}
          </Pressable>
          <Pressable onPress={() => signOut()} hitSlop={12}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.parchment },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: sizes.screenPadding,
    gap: spacing.xxl,
  },
  copy: { gap: spacing.sm },
  wordmark: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 3,
    color: colors.gold,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: colors.obsidian,
    lineHeight: 38,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.muted,
    lineHeight: 22,
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
  messageText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.venture,
  },
  actions: { gap: spacing.md, alignItems: 'center' },
  primaryButton: {
    width: '100%',
    minHeight: sizes.tapTarget + 8,
    borderRadius: radius.avatar,
    backgroundColor: colors.obsidian,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.white,
  },
  secondaryButton: {
    width: '100%',
    minHeight: sizes.tapTarget + 8,
    borderRadius: radius.avatar,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.gold,
  },
  signOutText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.muted,
  },
});
