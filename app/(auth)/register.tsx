import { Link, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
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
import { isPasswordValid, mapAuthError, PASSWORD_RULES } from '../../lib/authErrors';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const router = useRouter();
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pwFocused, setPwFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignUp(): Promise<void> {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) return;
    if (!isPasswordValid(password)) {
      setError('Password does not meet the requirements below.');
      return;
    }
      setLoading(true);
    setError(null);
    try {
      await signUp(trimmedEmail, password);
      router.replace('/(auth)/verify');
    } catch (err) {
      setError(mapAuthError(err instanceof Error ? err.message : 'Sign up failed'));
    } finally {
      setLoading(false);
    }
  }

  const showChecks = pwFocused || password.length > 0;
  const canSubmit = email.trim().length > 0 && isPasswordValid(password) && !loading;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.brand}>
          <Text style={styles.wordmark}>MONCEM</Text>
          <Text style={styles.tagline}>Join the{'\n'}community</Text>
        </View>

        <View style={styles.form}>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={(v) => { setEmail(v); setError(null); }}
              placeholder="you@example.com"
              placeholderTextColor={colors.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>PASSWORD</Text>
            <TextInput
              ref={passwordRef}
              style={styles.input}
              value={password}
              onChangeText={(v) => { setPassword(v); setError(null); }}
              placeholder="Min. 8 characters"
              placeholderTextColor={colors.muted}
              secureTextEntry
              returnKeyType="done"
              onFocus={() => setPwFocused(true)}
              onBlur={() => setPwFocused(false)}
              onSubmitEditing={handleSignUp}
            />

            {showChecks && (
              <View style={styles.checks}>
                {PASSWORD_RULES.map((rule) => {
                  const ok = rule.passes(password);
                  return (
                    <View key={rule.label} style={styles.checkRow}>
                      <Text style={[styles.checkIcon, ok && styles.checkIconOk]}>
                        {ok ? '✓' : '○'}
                      </Text>
                      <Text style={[styles.checkLabel, ok && styles.checkLabelOk]}>
                        {rule.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          <Pressable
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={!canSubmit}
          >
            {loading ? (
              <ActivityIndicator color={colors.parchment} size="small" />
            ) : (
              <Text style={styles.buttonText}>CREATE ACCOUNT</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable hitSlop={8}>
              <Text style={styles.footerLink}>Sign in</Text>
            </Pressable>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.parchment },
  inner: {
    flex: 1,
    paddingHorizontal: sizes.screenPadding,
    justifyContent: 'center',
    gap: spacing.xxxl,
  },
  brand: { gap: spacing.xs },
  wordmark: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    letterSpacing: 3,
    color: colors.gold,
  },
  tagline: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: colors.obsidian,
    lineHeight: 38,
  },
  form: { gap: spacing.lg },
  errorBox: {
    backgroundColor: colors.errorBg,
    borderRadius: radius.card,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.errorRed,
  },
  errorText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.errorRed,
    lineHeight: 18,
  },
  field: { gap: spacing.xs },
  label: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1.5,
    color: colors.muted,
  },
  input: {
    height: 50,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.obsidian,
  },
  checks: {
    gap: spacing.xs,
    paddingTop: spacing.xs,
    paddingLeft: spacing.xs,
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkIcon: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: colors.muted,
    width: 14,
  },
  checkIconOk: { color: colors.reaction.validated },
  checkLabel: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted },
  checkLabelOk: { color: colors.reaction.validated },
  button: {
    height: sizes.tapTarget + 8,
    backgroundColor: colors.obsidian,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 2,
    color: colors.parchment,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: { fontFamily: fonts.sans, fontSize: 13, color: colors.muted },
  footerLink: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.gold },
});
