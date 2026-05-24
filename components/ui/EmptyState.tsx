import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fonts, spacing } from '../../constants/theme';

interface EmptyStateProps {
  headline: string;
  sub: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  headline,
  sub,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.glyph}>◈</Text>
      <Text style={styles.headline}>{headline}</Text>
      <Text style={styles.sub}>{sub}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={12} style={styles.actionHit}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxxl,
  },
  glyph: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: colors.gold,
  },
  headline: {
    fontFamily: fonts.display,
    fontSize: fontSize.sectionTitle,
    color: colors.obsidian,
    textAlign: 'center',
    lineHeight: 20,
  },
  sub: {
    fontFamily: fonts.sans,
    fontSize: fontSize.body,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },
  actionHit: {
    minHeight: 44,
    justifyContent: 'center',
  },
  action: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.body,
    color: colors.gold,
  },
});
