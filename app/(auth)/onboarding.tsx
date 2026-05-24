import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius, sizes, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { completeOnboarding } from '../../lib/queries';

const TAGS = [
  'AI', 'SaaS', 'Dev Tools', 'Fintech',
  'Health', 'Climate', 'Robotics', 'Consumer',
];

export default function OnboardingScreen() {
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();
  const userId = session?.user.id ?? '';

  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleTag(tag: string) {
    setSelected((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= 5) return prev;
      return [...prev, tag];
    });
  }

  async function handleContinue() {
    if (selected.length === 0) return;

    if (!userId) {
      setError('Your session could not be loaded. Please go back and sign in again.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await completeOnboarding(userId, selected);
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong — please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.wordmark}>MONCEM</Text>
          <Text style={styles.heading}>What do you{'\n'}build?</Text>
          <Text style={styles.sub}>
            Pick up to 5 topics. We'll use these to surface the most relevant stories for you.
          </Text>
        </View>

        <View style={styles.grid}>
          {TAGS.map((tag) => {
            const active = selected.includes(tag);
            return (
              <Pressable
                key={tag}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => toggleTag(tag)}
              >
                {active && <Text style={styles.chipCheck}>✓ </Text>}
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {tag}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Text style={styles.hint}>
            {selected.length === 0 ? 'Select at least one topic to continue' : `${selected.length} of 5 selected`}
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.button, (loading || selected.length === 0) && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={loading || selected.length === 0}
          >
            {loading ? (
              <ActivityIndicator color={colors.parchment} size="small" />
            ) : (
              <Text style={styles.buttonText}>CONTINUE →</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.parchment },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: {
    paddingHorizontal: sizes.screenPadding,
    paddingTop: spacing.xxxl + spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.xxxl,
    flexGrow: 1,
  },
  header: { gap: spacing.md },
  wordmark: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 3,
    color: colors.gold,
  },
  heading: {
    fontFamily: fonts.display,
    fontSize: 38,
    color: colors.obsidian,
    lineHeight: 44,
  },
  sub: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.muted,
    lineHeight: 22,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.chip,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipActive: {
    backgroundColor: colors.obsidian,
    borderColor: colors.obsidian,
  },
  chipCheck: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: colors.gold,
  },
  chipText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.obsidian,
  },
  chipTextActive: {
    color: colors.parchment,
  },
  footer: { gap: spacing.md },
  hint: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.errorRed,
    backgroundColor: colors.errorBg,
    padding: spacing.md,
    borderRadius: radius.card,
    overflow: 'hidden',
    textAlign: 'center',
    lineHeight: 18,
  },
  button: {
    height: sizes.tapTarget + 8,
    backgroundColor: colors.obsidian,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.35 },
  buttonText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 2,
    color: colors.parchment,
  },
});
