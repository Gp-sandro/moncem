import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { ANIM } from '../../constants/animations';
import { colors, radius, sizes, spacing } from '../../constants/theme';

function usePulse(): Animated.Value {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: ANIM.skeletonPulse, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: ANIM.skeletonPulse, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);
  return opacity;
}

export function HeroSkeleton() {
  const opacity = usePulse();
  return (
    <Animated.View style={[styles.heroCard, { opacity }]}>
      <View style={styles.heroImage} />
      <View style={styles.heroFooter}>
        <View style={[styles.line, { width: '30%', height: 8 }]} />
        <View style={[styles.line, { width: '80%', height: 20, marginTop: 6 }]} />
        <View style={[styles.line, { width: '55%', height: 20, marginTop: 4 }]} />
        <View style={styles.metaLine}>
          <View style={styles.avatarCircle} />
          <View style={[styles.line, { width: 90, height: 8 }]} />
        </View>
      </View>
    </Animated.View>
  );
}

export function ListSkeleton() {
  const opacity = usePulse();
  return (
    <Animated.View style={[styles.listCard, { opacity }]}>
      <View style={styles.listAccent} />
      <View style={styles.listBody}>
        <View style={[styles.line, { width: '28%', height: 8 }]} />
        <View style={[styles.line, { width: '88%', height: 14, marginTop: 6 }]} />
        <View style={[styles.line, { width: '65%', height: 14, marginTop: 3 }]} />
        <View style={[styles.line, { width: '40%', height: 8, marginTop: 8 }]} />
      </View>
    </Animated.View>
  );
}

export function ProfileRowSkeleton() {
  const opacity = usePulse();
  return (
    <Animated.View style={[styles.profileRow, { opacity }]}>
      <View style={styles.profileAvatar} />
      <View style={styles.profileBody}>
        <View style={[styles.line, { width: '45%', height: 12 }]} />
        <View style={[styles.line, { width: '70%', height: 10, marginTop: spacing.sm }]} />
      </View>
    </Animated.View>
  );
}

export function NotificationSkeleton() {
  const opacity = usePulse();
  return (
    <Animated.View style={[styles.notificationRow, { opacity }]}>
      <View style={styles.notificationAvatar} />
      <View style={styles.profileBody}>
        <View style={[styles.line, { width: '80%', height: 12 }]} />
        <View style={[styles.line, { width: '38%', height: 8, marginTop: spacing.sm }]} />
      </View>
    </Animated.View>
  );
}

export function PostDetailSkeleton() {
  const opacity = usePulse();
  return (
    <Animated.View style={[styles.detailWrap, { opacity }]}>
      <View style={styles.heroImage} />
      <View style={styles.detailBody}>
        <View style={[styles.line, { width: '90%', height: 20 }]} />
        <View style={[styles.line, { width: '74%', height: 20, marginTop: spacing.sm }]} />
        {[92, 84, 96, 76, 88, 64].map((width, index) => (
          <View
            key={`${width}-${index}`}
            style={[styles.line, { width: `${width}%`, height: 10, marginTop: spacing.md }]}
          />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    marginHorizontal: sizes.screenPadding,
    marginTop: spacing.lg,
    borderRadius: radius.hero,
    backgroundColor: colors.skeletonPulse,
    overflow: 'hidden',
  },
  heroImage: {
    height: sizes.heroHeight,
    backgroundColor: colors.skeletonBlock,
  },
  heroFooter: {
    padding: spacing.lg,
    gap: 0,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  avatarCircle: {
    width: 26,
    height: 26,
    borderRadius: radius.avatar,
    backgroundColor: colors.skeletonBlock,
  },
  listCard: {
    flexDirection: 'row',
    marginHorizontal: sizes.screenPadding,
    marginTop: spacing.md,
    height: 90,
    borderRadius: radius.card,
    backgroundColor: colors.skeletonPulse,
    overflow: 'hidden',
  },
  listAccent: {
    width: 4,
    backgroundColor: colors.skeletonBlock,
  },
  listBody: {
    flex: 1,
    padding: spacing.md,
  },
  line: {
    borderRadius: 4,
    backgroundColor: colors.skeletonBlock,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.parchment,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: radius.avatar,
    backgroundColor: colors.skeletonBlock,
  },
  profileBody: {
    flex: 1,
  },
  notificationRow: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  notificationAvatar: {
    width: 36,
    height: 36,
    borderRadius: radius.avatar,
    backgroundColor: colors.skeletonBlock,
  },
  detailWrap: {
    marginHorizontal: 0,
    backgroundColor: colors.parchment,
  },
  detailBody: {
    padding: spacing.lg,
  },
});
