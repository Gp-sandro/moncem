import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, sizes, spacing } from '../../constants/theme';
import type { Profile } from '../../lib/types';

interface Props {
  profile: Profile;
  postCount: number;
}

interface Suggestion {
  text: string;
  href: string;
  weight: number; // higher = more impactful, surfaces first
}

function computeSuggestions(profile: Profile, postCount: number): {
  score: number;
  suggestions: Suggestion[];
} {
  let score = 0;
  const suggestions: Suggestion[] = [];

  if (profile.fullName) score += 20;
  else suggestions.push({ text: 'Set your name to appear in your profile →', href: '/(tabs)/me', weight: 95 });

  if (profile.bio) score += 20;
  else suggestions.push({ text: 'Add a bio to be discovered by other builders →', href: '/(tabs)/me', weight: 90 });

  if (profile.connectStatus !== 'closed') score += 20;
  else suggestions.push({ text: 'Set your connect status to appear in Explore →', href: '/onboarding/connect', weight: 80 });

  if (postCount > 0) score += 20;
  else suggestions.push({ text: 'Share your first story to be seen →', href: '/post/new', weight: 100 });

  if (profile.buildingStage) score += 10;
  else suggestions.push({ text: 'Set your building stage to give context →', href: '/onboarding/stage', weight: 50 });

  if (profile.interests.length >= 3) score += 10;
  else suggestions.push({ text: 'Pick a few interests to tailor your feed →', href: '/onboarding/interests', weight: 40 });

  return { score, suggestions: suggestions.sort((a, b) => b.weight - a.weight) };
}

export default function ProfileCompletion({ profile, postCount }: Props) {
  const router = useRouter();
  const { score, suggestions } = computeSuggestions(profile, postCount);

  if (score >= 80 || suggestions.length === 0) return null;

  const top = suggestions[0];
  const widthPct = `${Math.min(score, 100)}%` as const;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>PROFILE STRENGTH / {score}%</Text>
      <Pressable onPress={() => router.push(top.href as never)} hitSlop={8}>
        <Text style={styles.suggestion}>{top.text}</Text>
      </Pressable>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: widthPct }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: sizes.screenPadding,
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  label: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    color: colors.venture,
    letterSpacing: 1.6,
  },
  barTrack: {
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 999,
    overflow: 'hidden',
  },
  barFill: {
    height: 5,
    backgroundColor: colors.venture,
    borderRadius: 999,
  },
  suggestion: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    color: colors.mutedDark,
    letterSpacing: 0.2,
  },
});
