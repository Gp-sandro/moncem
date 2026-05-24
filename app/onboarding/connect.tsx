import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius, sizes, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { completeOnboardingFull } from '../../lib/queries';
import type { ConnectStatus } from '../../lib/types';

const OPTIONS: { value: ConnectStatus; label: string; sub: string; badge: string }[] = [
  {
    value: 'open',
    label: 'Open to connect',
    sub: 'Anyone can reach out to collaborate, advise, or invest.',
    badge: 'OPEN',
  },
  {
    value: 'limited',
    label: 'Selective',
    sub: 'I\'m open but prefer context — reach out if you have a specific reason.',
    badge: 'SELECTIVE',
  },
  {
    value: 'closed',
    label: 'Not right now',
    sub: 'I\'m heads-down and not taking new conversations.',
    badge: 'CLOSED',
  },
];

const BADGE_COLORS: Record<ConnectStatus, string> = {
  open: colors.reaction.validated,
  limited: colors.gold,
  closed: colors.muted,
};

const STEP = 4;
const TOTAL_STEPS = 4;

export default function ConnectScreen() {
  const { session, refreshProfile } = useAuth();
  const router = useRouter();

  const [selected, setSelected] = useState<ConnectStatus>('closed');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFinish() {
    const userId = session?.user.id;
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      await completeOnboardingFull(userId, selected);
      await refreshProfile();
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save — try again.');
    } finally {
      setLoading(false);
    }
  }

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
      <View style={styles.body}>
        <View style={styles.copy}>
          <Text style={styles.heading}>Open to{'\n'}connect?</Text>
          <Text style={styles.sub}>
            This appears on your profile. You can change it any time.
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.options}>
          {OPTIONS.map(({ value, label, sub, badge }) => {
            const active = selected === value;
            const badgeColor = BADGE_COLORS[value];
            return (
              <Pressable
                key={value}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => setSelected(value)}
              >
                <View style={styles.optionTop}>
                  <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                    {label}
                  </Text>
                  <View style={[styles.badge, { borderColor: active ? colors.parchment : badgeColor }]}>
                    <Text style={[styles.badgeText, { color: active ? colors.parchment : badgeColor }]}>
                      {badge}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.optionSub, active && styles.optionSubActive]}>
                  {sub}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleFinish}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.parchment} size="small" />
          ) : (
            <Text style={styles.buttonText}>FINISH SETUP →</Text>
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
  body: {
    flex: 1,
    paddingHorizontal: sizes.screenPadding,
    paddingTop: spacing.xxxl,
    gap: spacing.xxl,
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
  errorText: { fontFamily: fonts.sans, fontSize: 13, color: colors.errorRed },
  options: { gap: spacing.sm },
  option: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  optionActive: {
    borderColor: colors.obsidian,
    backgroundColor: colors.obsidian,
  },
  optionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.obsidian,
  },
  optionLabelActive: { color: colors.parchment },
  optionSub: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
  },
  optionSubActive: { color: colors.activeSubtleText },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1,
  },
  footer: {
    paddingHorizontal: sizes.screenPadding,
    paddingBottom: spacing.xxxl,
  },
  button: {
    height: sizes.tapTarget + 8,
    backgroundColor: colors.gold,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 2,
    color: colors.obsidian,
  },
});
