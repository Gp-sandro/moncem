import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius, sizes, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { updateProfile } from '../../lib/queries';

export default function IdentityScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const bioRef = useRef<TextInput>(null);

  const STEP = 1;
  const TOTAL_STEPS = 4;

  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    const userId = session?.user.id;
    if (!userId || !fullName.trim()) return;
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    try {
      await updateProfile(userId, {
        fullName: fullName.trim(),
        bio: bio.trim() || null,
      });
      router.push('/onboarding/stage');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save — try again.');
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = fullName.trim().length > 0 && !loading;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.obsidian} />
        </Pressable>
        <View style={styles.dots}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <View key={i} style={[styles.dot, i < STEP && styles.dotActive]} />
          ))}
        </View>
        <View style={styles.backBtn} />
      </View>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.copy}>
            <Text style={styles.heading}>Who are you?</Text>
            <Text style={styles.sub}>Your name and a line about what you're building.</Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.fields}>
            <View style={styles.field}>
              <Text style={styles.label}>FULL NAME</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Zara Kim"
                placeholderTextColor={colors.muted}
                autoCapitalize="words"
                returnKeyType="next"
                autoFocus
                maxLength={100}
                onSubmitEditing={() => bioRef.current?.focus()}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>BIO <Text style={styles.optional}>(optional)</Text></Text>
              <TextInput
                ref={bioRef}
                style={[styles.input, styles.bioInput]}
                value={bio}
                onChangeText={setBio}
                placeholder="Building an AI copilot for founders."
                placeholderTextColor={colors.muted}
                multiline
                textAlignVertical="top"
                blurOnSubmit
                returnKeyType="done"
                maxLength={300}
                onSubmitEditing={handleContinue}
              />
              <Text style={styles.charCount}>{bio.length}/300</Text>
            </View>
          </View>

          <Pressable
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!canSubmit}
          >
            {loading ? (
              <ActivityIndicator color={colors.parchment} size="small" />
            ) : (
              <Text style={styles.buttonText}>CONTINUE →</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.parchment },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sizes.screenPadding,
    paddingTop: spacing.lg,
  },
  backBtn: {
    width: sizes.tapTarget,
    height: sizes.tapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.gold },
  charCount: { fontFamily: fonts.sans, fontSize: 11, color: colors.muted, textAlign: 'right' },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: sizes.screenPadding,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxxl,
    gap: spacing.xxl,
    flexGrow: 1,
  },
  copy: { gap: spacing.sm },
  heading: {
    fontFamily: fonts.display,
    fontSize: 34,
    color: colors.obsidian,
    lineHeight: 42,
  },
  sub: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.muted,
    lineHeight: 22,
  },
  errorBox: {
    backgroundColor: colors.errorBg,
    borderRadius: radius.card,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.errorRed,
  },
  errorText: { fontFamily: fonts.sans, fontSize: 13, color: colors.errorRed, lineHeight: 18 },
  fields: { gap: spacing.lg },
  field: { gap: spacing.xs },
  label: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1.5,
    color: colors.muted,
  },
  optional: {
    fontFamily: fonts.sans,
    fontSize: 11,
    letterSpacing: 0,
    color: colors.muted,
    textTransform: 'none',
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.obsidian,
    minHeight: 50,
  },
  bioInput: { minHeight: 90, paddingTop: spacing.md },
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
});
