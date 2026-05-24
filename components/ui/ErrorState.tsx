import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fonts, radius, spacing } from '../../constants/theme';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.icon}>
        <Text style={styles.iconText}>!</Text>
      </View>
      <Text style={styles.headline}>Something went wrong</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} hitSlop={12} style={styles.retry}>
          <Text style={styles.retryText}>Try again</Text>
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
  icon: {
    width: 28,
    height: 28,
    borderRadius: radius.avatar,
    backgroundColor: colors.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.sectionTitle,
    color: colors.errorRed,
  },
  headline: {
    fontFamily: fonts.display,
    fontSize: fontSize.sectionTitle,
    color: colors.obsidian,
  },
  message: {
    fontFamily: fonts.sans,
    fontSize: fontSize.body,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },
  retry: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.avatar,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  retryText: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.body,
    color: colors.gold,
  },
});
