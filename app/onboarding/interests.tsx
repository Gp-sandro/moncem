import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ANIM } from '../../constants/animations';
import { colors, fonts, radius, sizes, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { saveInterests } from '../../lib/queries';

const TAGS = [
  'AI', 'SaaS', 'Dev Tools', 'Fintech', 'Health', 'Climate',
  'Robotics', 'Consumer', 'B2B', 'Marketplaces', 'Crypto', 'EdTech',
  'Gaming', 'Media', 'Hardware', 'Open Source',
];

const STEP = 3;
const TOTAL_STEPS = 4;
const MIN_SELECTIONS = 3;
const MAX_SELECTIONS = 5;

function TagChip({ tag, active, onToggle }: { tag: string; active: boolean; onToggle: () => void }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function handlePress() {
    scale.value = withSequence(
      withSpring(0.97, ANIM.selectSpring),
      withSpring(1.02, ANIM.selectSpring),
      withSpring(1,    ANIM.selectSpring),
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onToggle();
  }

  return (
    <Animated.View style={animStyle}>
      <Pressable
        style={[styles.chip, active && styles.chipActive]}
        onPress={handlePress}
      >
        {active && <Text style={styles.chipCheck}>✓ </Text>}
        <Text style={[styles.chipText, active && styles.chipTextActive]}>{tag}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function InterestsScreen() {
  const { session } = useAuth();
  const router = useRouter();

  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleTag(tag: string) {
    setSelected((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= MAX_SELECTIONS) return prev;
      return [...prev, tag];
    });
  }

  async function handleContinue() {
    const userId = session?.user.id;
    if (!userId || selected.length < MIN_SELECTIONS) return;
    setLoading(true);
    setError(null);
    try {
      await saveInterests(userId, selected);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      router.push('/onboarding/connect');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save — try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = selected.length >= MIN_SELECTIONS && !loading;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Feather name="arrow-left" size={15} color={colors.muted} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <View style={styles.dots}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <View key={i} style={[styles.dot, i < STEP && styles.dotActive]} />
          ))}
        </View>
        <Text style={styles.stepText}>{STEP} of {TOTAL_STEPS}</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>YOUR INTERESTS</Text>
          <Text style={styles.heading}>What do you{'\n'}build?</Text>
          <Text style={styles.sub}>Pick at least 3. We use these to filter your feed and suggest builders.</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.grid}>
          {TAGS.map((tag) => (
            <TagChip
              key={tag}
              tag={tag}
              active={selected.includes(tag)}
              onToggle={() => toggleTag(tag)}
            />
          ))}
        </View>

        <View style={styles.selectionPill}>
          <View style={styles.selectionDots}>
            {Array.from({ length: MIN_SELECTIONS }, (_, i) => (
              <View key={i} style={[styles.selectionDot, i < selected.length && styles.selectionDotActive]} />
            ))}
          </View>
          <Text style={styles.hint}>
            {selected.length} of {TAGS.length} selected
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.parchment },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sizes.screenPadding,
    paddingTop: spacing.md,
  },
  backBtn: {
    minWidth: 70,
    height: sizes.tapTarget,
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  backText: { fontFamily: fonts.sans, fontSize: 13, color: colors.muted },
  dots: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 7 },
  dot: { width: 22, height: 3, borderRadius: 2, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.gold },
  stepText: {
    width: 70,
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.muted,
    textAlign: 'right',
  },
  scroll: {
    paddingHorizontal: sizes.screenPadding,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    gap: spacing.xxl,
    flexGrow: 1,
  },
  copy: { gap: spacing.sm },
  eyebrow: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 2.4,
    color: colors.gold,
  },
  heading: { fontFamily: fonts.display, fontSize: 34, color: colors.obsidian, lineHeight: 42 },
  sub: { fontFamily: fonts.sans, fontSize: 15, color: colors.muted, lineHeight: 22 },
  errorBox: {
    backgroundColor: colors.errorBg,
    borderRadius: radius.card,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.errorRed,
  },
  errorText: { fontFamily: fonts.sans, fontSize: 13, color: colors.errorRed },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.avatar,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.obsidian, borderColor: colors.obsidian },
  chipCheck: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.gold },
  chipText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.obsidian },
  chipTextActive: { color: colors.parchment },
  selectionPill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.avatar,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  selectionDots: { flexDirection: 'row', gap: 3 },
  selectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  selectionDotActive: { backgroundColor: colors.gold },
  hint: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.obsidian, textAlign: 'center' },
  footer: { paddingHorizontal: sizes.screenPadding, paddingBottom: spacing.xxxl },
  button: {
    height: sizes.tapTarget + 8,
    backgroundColor: colors.obsidian,
    borderRadius: radius.avatar,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { fontFamily: fonts.sansBold, fontSize: 12, letterSpacing: 2, color: colors.parchment },
});
