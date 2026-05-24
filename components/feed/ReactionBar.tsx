import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { ANIM } from '../../constants/animations';
import { colors, fonts, radius, spacing } from '../../constants/theme';
import { useReactions } from '../../hooks/useReactions';
import type { ReactionCounts, ReactionType } from '../../lib/types';
import { useToast } from '../ui/Toast';

interface ReactionBarProps {
  userId: string;
  postId: string;
  initialCounts: ReactionCounts;
  initialUserReactions: ReactionType[];
  compact?: boolean;
}

const REACTION_CONFIG: {
  type: ReactionType;
  label: string;
  icon: string;
  activeColor: string;
  toastMsg: string;
}[] = [
  { type: 'sparked', label: 'SPARK', icon: '◆', activeColor: colors.reaction.sparked, toastMsg: 'Sparked!' },
  { type: 'validated', label: 'VALIDATE', icon: '↑', activeColor: colors.reaction.validated, toastMsg: 'Validated!' },
  { type: 'inthis', label: 'ON THIS', icon: '○', activeColor: colors.reaction.inthis, toastMsg: "You're on this too" },
];

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function AnimatedPill({
  type,
  label,
  icon,
  activeColor,
  toastMsg,
  active,
  count,
  compact,
  onPress,
}: {
  type: ReactionType;
  label: string;
  icon: string;
  activeColor: string;
  toastMsg: string;
  active: boolean;
  count: number;
  compact: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const { showToast } = useToast();

  function handlePress() {
    scale.value = withSequence(
      withSpring(0.92, ANIM.reactionSpring),
      withSpring(1.08, ANIM.reactionSpring),
      withSpring(1, ANIM.reactionSpring),
    );

    if (!active) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const toastType =
        type === 'sparked'
          ? 'post_sparked'
          : type === 'validated'
            ? 'post_validated'
            : 'post_inthis';
      showToast({ message: toastMsg, type: toastType });
    } else {
      Haptics.selectionAsync().catch(() => {});
    }

    onPress();
  }

  return (
    <Animated.View style={[styles.animatedWrap, compact && styles.animatedWrapCompact, animStyle]}>
      <Pressable
        onPress={handlePress}
        hitSlop={6}
        style={[
          styles.pill,
          compact && styles.pillCompact,
          active && { backgroundColor: activeColor, borderColor: activeColor },
        ]}
      >
        <Text style={[styles.icon, compact && styles.iconCompact, active && styles.textActive]}>
          {icon}
        </Text>
        {!compact ? (
          <Text style={[styles.label, active && styles.textActive]}>{label}</Text>
        ) : null}
        {count > 0 ? (
          <Text style={[styles.count, compact && styles.countCompact, active && styles.textActive]}>
            {formatCount(count)}
          </Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

export default function ReactionBar({
  userId,
  postId,
  initialCounts,
  initialUserReactions,
  compact = false,
}: ReactionBarProps) {
  const { counts, userReactions, toggle } = useReactions(
    userId,
    postId,
    initialCounts,
    initialUserReactions,
  );

  return (
    <View style={styles.row}>
      {REACTION_CONFIG.map(({ type, label, icon, activeColor, toastMsg }) => (
        <AnimatedPill
          key={type}
          type={type}
          label={label}
          icon={icon}
          activeColor={activeColor}
          toastMsg={toastMsg}
          active={userReactions.includes(type)}
          count={counts[type]}
          compact={compact}
          onPress={() => toggle(type)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'nowrap',
    maxWidth: '100%',
  },
  animatedWrap: {
    flexShrink: 1,
  },
  animatedWrapCompact: {
    flexShrink: 0,
  },
  pill: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.avatar,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  pillCompact: {
    minHeight: 34,
    minWidth: 48,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    gap: spacing.xs,
  },
  icon: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: colors.venture,
    lineHeight: 14,
  },
  iconCompact: {
    fontSize: 12,
    lineHeight: 12,
  },
  label: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.mutedDark,
  },
  count: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    color: colors.mutedDark,
    marginLeft: 1,
  },
  countCompact: {
    fontSize: 11,
    marginLeft: 0,
  },
  textActive: {
    color: colors.white,
  },
});
