import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
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
import { saveBuildingStage } from '../../lib/queries';
import type { BuildingStage } from '../../lib/types';

const STAGES: { value: BuildingStage; label: string; sub: string; icon: keyof typeof Feather.glyphMap }[] = [
  { value: 'idea', label: "I'm at the idea stage", sub: 'Exploring problems, talking to potential users', icon: 'circle' },
  { value: 'mvp', label: "I'm building it now", sub: 'Coding, designing, putting it together', icon: 'bar-chart-2' },
  { value: 'launched', label: "I've launched something", sub: 'Live, finding first users, learning fast', icon: 'zap' },
  { value: 'scaling', label: "I'm scaling", sub: 'Growing usage, revenue, team, or reach', icon: 'trending-up' },
];

const STEP = 2;
const TOTAL_STEPS = 4;

function StageOption({
  value, label, sub, icon, active, onSelect,
}: {
  value: BuildingStage; label: string; sub: string; icon: keyof typeof Feather.glyphMap; active: boolean; onSelect: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function handlePress() {
    scale.value = withSequence(
      withSpring(0.97, ANIM.selectSpring),
      withSpring(1.02, ANIM.selectSpring),
      withSpring(1,    ANIM.selectSpring),
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSelect();
  }

  return (
    <Animated.View style={animStyle}>
      <Pressable
        style={[styles.option, active && styles.optionActive]}
        onPress={handlePress}
      >
        <View style={[styles.optionIcon, active && styles.optionIconActive]}>
          <Feather name={icon} size={16} color={active ? colors.goldLight : colors.gold} />
        </View>
        <View style={styles.optionText}>
          <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>{label}</Text>
          <Text style={[styles.optionSub, active && styles.optionSubActive]}>{sub}</Text>
        </View>
        {active ? (
          <View style={styles.selectedMark}>
            <Feather name="check" size={12} color={colors.obsidian} />
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

export default function StageScreen() {
  const { session } = useAuth();
  const router = useRouter();

  const [selected, setSelected] = useState<BuildingStage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    const userId = session?.user.id;
    if (!userId || !selected) return;
    setLoading(true);
    setError(null);
    try {
      await saveBuildingStage(userId, selected);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      router.push('/onboarding/interests');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save — try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = selected !== null && !loading;

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
      <View style={styles.body}>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>YOUR JOURNEY</Text>
          <Text style={styles.heading}>Where are you in{'\n'}your build?</Text>
          <Text style={styles.sub}>We use this to surface stories from builders at your stage and just ahead of it.</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.options}>
          {STAGES.map(({ value, label, sub, icon }) => (
            <StageOption
              key={value}
              value={value}
              label={label}
              sub={sub}
              icon={icon}
              active={selected === value}
              onSelect={() => setSelected(value)}
            />
          ))}
        </View>
      </View>

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

        <Pressable onPress={() => router.push('/onboarding/interests')} hitSlop={8}>
          <Text style={styles.skip}>Skip for now</Text>
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
  body: {
    flex: 1,
    paddingHorizontal: sizes.screenPadding,
    paddingTop: spacing.xxl,
    gap: spacing.xxl,
  },
  copy: { gap: spacing.sm },
  eyebrow: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 2.4,
    color: colors.gold,
  },
  heading: {
    fontFamily: fonts.display,
    fontSize: 34,
    color: colors.obsidian,
    lineHeight: 42,
  },
  sub: { fontFamily: fonts.sans, fontSize: 15, color: colors.muted, lineHeight: 22 },
  errorBox: {
    backgroundColor: colors.errorBg,
    borderRadius: radius.card,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.errorRed,
  },
  errorText: { fontFamily: fonts.sans, fontSize: 13, color: colors.errorRed },
  options: { gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: spacing.md,
  },
  optionActive: { borderColor: colors.obsidian, backgroundColor: colors.obsidian },
  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.tag,
    backgroundColor: colors.avatarBg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconActive: {
    backgroundColor: 'rgba(184,149,42,0.14)',
    borderColor: colors.gold,
  },
  optionText: { flex: 1, gap: 2 },
  optionLabel: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.obsidian },
  optionLabelActive: { color: colors.parchment },
  optionSub: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted, lineHeight: 17 },
  optionSubActive: { color: colors.activeSubtleText },
  selectedMark: {
    width: 20,
    height: 20,
    borderRadius: radius.avatar,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: sizes.screenPadding,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
    alignItems: 'center',
  },
  button: {
    height: sizes.tapTarget + 8,
    backgroundColor: colors.obsidian,
    borderRadius: radius.avatar,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { fontFamily: fonts.sansBold, fontSize: 12, letterSpacing: 2, color: colors.parchment },
  skip: { fontFamily: fonts.sans, fontSize: 13, color: colors.muted },
});
