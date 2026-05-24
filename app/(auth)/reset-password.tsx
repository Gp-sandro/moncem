import { useRouter } from 'expo-router';
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
import { isPasswordValid, mapAuthError, PASSWORD_RULES } from '../../lib/authErrors';
import { supabase } from '../../lib/supabase';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const confirmRef = useRef<TextInput>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = password.length > 0 && password === confirm;
  const canSubmit = isPasswordValid(password) && matches && !saving;

  async function savePassword(): Promise<void> {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      router.replace('/(tabs)');
    } catch (err) {
      setError(mapAuthError(err instanceof Error ? err.message : 'Could not update password.'));
    } finally {
      setSaving(false);
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
          <Text style={styles.title}>Choose a new password</Text>
          <Text style={styles.body}>Use a password you have not used for Moncem before.</Text>
        </View>

        <View style={styles.form}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.field}>
            <Text style={styles.label}>NEW PASSWORD</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setError(null);
              }}
              placeholder="Min. 8 characters"
              placeholderTextColor={colors.muted}
              secureTextEntry
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
            />
          </View>

          <View style={styles.checks}>
            {PASSWORD_RULES.map((rule) => {
              const ok = rule.passes(password);
              return (
                <View key={rule.label} style={styles.checkRow}>
                  <Text style={[styles.checkIcon, ok && styles.checkIconOk]}>
                    {ok ? '✓' : '○'}
                  </Text>
                  <Text style={[styles.checkLabel, ok && styles.checkLabelOk]}>{rule.label}</Text>
                </View>
              );
            })}
            <View style={styles.checkRow}>
              <Text style={[styles.checkIcon, matches && styles.checkIconOk]}>
                {matches ? '✓' : '○'}
              </Text>
              <Text style={[styles.checkLabel, matches && styles.checkLabelOk]}>
                Passwords match
              </Text>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>CONFIRM PASSWORD</Text>
            <TextInput
              ref={confirmRef}
              style={styles.input}
              value={confirm}
              onChangeText={(value) => {
                setConfirm(value);
                setError(null);
              }}
              placeholder="Repeat password"
              placeholderTextColor={colors.muted}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={savePassword}
            />
          </View>

          <Pressable
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
            onPress={savePassword}
            disabled={!canSubmit}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.buttonText}>Update password</Text>
            )}
          </Pressable>
        </View>
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
  checks: { gap: spacing.xs },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkIcon: {
    width: 16,
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: colors.muted,
  },
  checkIconOk: { color: colors.reaction.validated },
  checkLabel: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted },
  checkLabelOk: { color: colors.reaction.validated },
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
});
