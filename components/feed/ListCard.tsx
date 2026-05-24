import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { ANIM } from '../../constants/animations';
import { colors, fonts, radius, spacing } from '../../constants/theme';
import { displayName } from '../../lib/format';
import type { Post } from '../../lib/types';

const animatedIds = new Set<string>();

interface ListCardProps {
  post: Post;
  userId: string;
  index?: number;
}

function readMinutes(post: Post): number {
  const wordCount = post.body ? post.body.trim().split(/\s+/).length : 0;
  return wordCount > 100 ? Math.ceil(wordCount / 200) : 0;
}

export default function ListCard({ post, index = 1 }: ListCardProps) {
  const router = useRouter();
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

  const minutes = readMinutes(post);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        style={styles.container}
        onPress={() => router.push(`/post/${post.id}` as never)}
      >
        <View style={styles.copy}>
          <Text style={[styles.type, { color: colors.accent[post.type] }]}>
            {post.type.toUpperCase()}
          </Text>
          <Text style={styles.title} numberOfLines={3}>
            {post.title}
          </Text>
          {post.milestone ? (
            <Text style={[styles.proof, { color: colors.accent[post.type] }]} numberOfLines={1}>
              {post.milestone}
            </Text>
          ) : null}
          <View style={styles.footer}>
            <Pressable
              style={styles.author}
              onPress={() => router.push(`/profile/${post.author.id}` as never)}
              hitSlop={8}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{post.author.initials}</Text>
              </View>
              <Text style={styles.authorName} numberOfLines={1}>
                {displayName(post.author)}
              </Text>
            </Pressable>
            <Text style={styles.time}>{minutes > 0 ? `${minutes} min` : post.createdAt}</Text>
          </View>
        </View>

        <View style={styles.thumbWrap}>
          {post.coverUrl ? (
            <Image source={{ uri: post.coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.accent[post.type] }]} />
          )}
          <View style={styles.thumbOverlay} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 18,
    marginTop: spacing.md,
    padding: spacing.lg,
    minHeight: 132,
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  type: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1.6,
  },
  title: {
    marginTop: spacing.sm,
    fontFamily: fonts.display,
    fontSize: 18,
    lineHeight: 22,
    color: colors.obsidian,
  },
  proof: {
    marginTop: spacing.sm,
    fontFamily: fonts.sansBold,
    fontSize: 13,
  },
  footer: {
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  author: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: radius.avatar,
    backgroundColor: colors.avatarBg,
    borderWidth: 1,
    borderColor: colors.ventureSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    color: colors.venture,
  },
  authorName: {
    flexShrink: 1,
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.mutedDark,
  },
  time: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.muted,
  },
  thumbWrap: {
    width: 76,
    height: 76,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.cobalt,
  },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17,22,24,0.08)',
  },
});
