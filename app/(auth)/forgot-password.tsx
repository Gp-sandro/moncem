import * as Linking from 'expo-linking';
import { Link } from 'expo-router';
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
import { mapAuthError } from '../../lib/authErrors';
import { supabase } from '../../lib/supabase';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sendReset(): Promise<void> {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || sending) return;
    setSending(true);
    setError(null);
    setMessage(null);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: Linking.createURL('/(auth)/reset-password'),
      });
      if (resetError) throw resetError;
      setMessage('Reset link sent. Check your inbox.');
    } catch (err) {
      setError(mapAuthError(err instanceof Error ? err.message : 'Could not send reset link.'));
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.copy}>
          <Text style={styles.wordmark}>MONCEM</Text>
          <Text style={styles.title}>Reset password</Text>
          <Text style={styles.body}>Enter your email and we will send a secure reset link.</Text>
        </View>

        <View style={styles.form}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {message ? <Text style={styles.messageText}>{message}</Text> : null}

          <View style={styles.field}>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                setError(null);
                setMessage(null);
              }}
              placeholder="you@example.com"
              placeholderTextColor={colors.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="send"
              onSubmitEditing={sendReset}
            />
          </View>

          <Pressable
            style={[styles.button, (!email.trim() || sending) && styles.buttonDisabled]}
            onPress={sendReset}
            disabled={!email.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.buttonText}>Send reset link</Text>
            )}
          </Pressable>
        </View>

        <Link href="/(auth)/login" asChild>
          <Pressable hitSlop={12} style={styles.backLink}>
            <Text style={styles.backText}>Back to sign in</Text>
          </Pressable>
        </Link>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.parchment },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: sizes.screenPadding,
    gap: spacing.xxxl,
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
  form: { gap: spacing.lg },
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
  field: { gap: spacing.xs },
  label: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1.5,
    color: colors.muted,
  },
  input: {
    minHeight: 50,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.obsidian,
  },
  button: {
    minHeight: sizes.tapTarget + 8,
    backgroundColor: colors.obsidian,
    borderRadius: radius.avatar,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.white,
  },
  backLink: { alignItems: 'center' },
  backText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.gold,
  },
});
