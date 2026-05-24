import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { ANIM } from '../../constants/animations';
import { colors, fonts, radius, sizes, spacing } from '../../constants/theme';
import { displayName } from '../../lib/format';
import { fetchRecentSparkers } from '../../lib/queries';
import type { Post, Profile } from '../../lib/types';
import ReactionBar from './ReactionBar';

const animatedIds = new Set<string>();

interface HeroCardProps {
  post: Post;
  userId: string;
  index?: number;
}

function readMinutes(post: Post): number {
  const text = `${post.body ?? ''} ${post.excerpt ?? ''}`.trim();
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.split(/\s+/).length / 220));
}

export default function HeroCard({ post, userId, index = 0 }: HeroCardProps) {
  const router = useRouter();
  const [sparkers, setSparkers] = useState<Pick<Profile, 'id' | 'initials' | 'fullName'>[]>([]);
  const hasAnimated = useRef(animatedIds.has(post.id));

  const opacity = useSharedValue(hasAnimated.current ? 1 : 0);
  const translateY = useSharedValue(hasAnimated.current ? 0 : 16);

  useEffect(() => {
    if (!hasAnimated.current) {
      animatedIds.add(post.id);
      hasAnimated.current = true;
      const delay = Math.min(index, ANIM.cardStaggerCap) * ANIM.cardStagger;
      opacity.value = withDelay(delay, withTiming(1, { duration: ANIM.cardEnter }));
      translateY.value = withDelay(delay, withTiming(0, { duration: ANIM.cardEnter }));
    }
  }, []);

  useEffect(() => {
    if (post.reactionCounts.sparked > 0) {
      fetchRecentSparkers(post.id, 3).then(setSparkers).catch(() => {});
    } else {
      setSparkers([]);
    }
  }, [post.id, post.reactionCounts.sparked]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const minutes = readMinutes(post);

  return (
    <Animated.View style={animStyle}>
      <Pressable
        style={styles.container}
        onPress={() => router.push(`/post/${post.id}` as never)}
      >
        <View style={styles.visual}>
          {post.coverUrl ? (
            <Image source={{ uri: post.coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.cobalt }]} />
          )}
          <View style={styles.overlay} />
          <View style={styles.heroTop}>
            <View style={styles.typeChip}>
              <View style={styles.liveDot} />
              <Text style={styles.typeText}>{post.type.toUpperCase()}</Text>
            </View>
            {post.milestone ? (
              <View style={styles.metricPill}>
                <Text style={styles.metricValue}>{post.milestone}</Text>
                <Text style={styles.metricLabel}>PROOF</Text>
              </View>
            ) : null}
          </View>
          <View>
            <Text style={styles.metaLine} numberOfLines={1}>
              {[...post.tags.slice(0, 2).map((tag) => tag.toUpperCase()), `${minutes} MIN`].join(' / ')}
            </Text>
            <Text style={styles.title} numberOfLines={3}>{post.title}</Text>
          </View>
        </View>

        <View style={styles.authorRow}>
          <Pressable
            style={styles.author}
            onPress={() => router.push(`/profile/${post.author.id}` as never)}
            hitSlop={8}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{post.author.initials}</Text>
            </View>
            <View style={styles.authorText}>
              <Text style={styles.authorName}>{displayName(post.author)}</Text>
              <Text style={styles.authorMeta}>@{post.author.username} / {post.createdAt}</Text>
            </View>
          </Pressable>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{post.author.connectStatus === 'open' ? 'OPEN' : post.author.connectStatus.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.reactionRow}>
          <ReactionBar
            userId={userId}
            postId={post.id}
            initialCounts={post.reactionCounts}
            initialUserReactions={post.userReactions}
            compact
          />
          {sparkers.length > 0 ? (
            <Text style={styles.sparkers} numberOfLines={1}>
              {sparkers[0].fullName.split(' ')[0]} sparked this
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: sizes.screenPadding,
    marginTop: spacing.lg,
    borderRadius: radius.hero,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  visual: {
    minHeight: sizes.heroHeight,
    padding: spacing.lg,
    justifyContent: 'space-between',
    backgroundColor: colors.cobalt,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17,22,24,0.34)',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 1,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: radius.avatar,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: radius.avatar,
    backgroundColor: colors.venture,
  },
  typeText: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.white,
  },
  metricPill: {
    backgroundColor: colors.white,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'flex-end',
  },
  metricValue: {
    fontFamily: fonts.display,
    fontSize: 18,
    lineHeight: 20,
    color: colors.obsidian,
  },
  metricLabel: {
    marginTop: 2,
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 1.2,
    color: colors.mutedDark,
  },
  metaLine: {
    zIndex: 1,
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.ventureSoft,
  },
  title: {
    zIndex: 1,
    marginTop: spacing.sm,
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 31,
    color: colors.white,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  author: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: radius.avatar,
    backgroundColor: colors.avatarBg,
    borderWidth: 1,
    borderColor: colors.ventureSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    color: colors.venture,
  },
  authorText: { flex: 1, minWidth: 0 },
  authorName: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.obsidian,
  },
  authorMeta: {
    marginTop: 2,
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.muted,
  },
  statusBadge: {
    borderRadius: radius.avatar,
    backgroundColor: colors.ventureSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  statusText: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 1.1,
    color: colors.venture,
  },
  reactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
  },
  sparkers: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.muted,
    textAlign: 'right',
  },
});
