import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConversationStarter } from '../../components/ui/ConversationStarter';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import JourneyStage from '../../components/ui/JourneyStage';
import { PostDetailSkeleton } from '../../components/ui/SkeletonCard';
import { useToast } from '../../components/ui/Toast';
import { showReportActions } from '../../components/ui/reportActions';
import { ANIM } from '../../constants/animations';
import { colors, fontSize, fonts, radius, sizes, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useReactions } from '../../hooks/useReactions';
import { displayName } from '../../lib/format';
import { deletePost, fetchPostById, fetchRecentSparkers, incrementViewCount } from '../../lib/queries';
import type { BuildingStage, Post, Profile, ReactionCounts, ReactionType } from '../../lib/types';

const REACTIONS: {
  type: ReactionType;
  label: string;
  icon: string;
  color: string;
}[] = [
  { type: 'sparked', label: 'Spark', icon: '◆', color: colors.reaction.sparked },
  { type: 'validated', label: 'Validate', icon: '↑', color: colors.reaction.validated },
  { type: 'inthis', label: 'On this', icon: '○', color: colors.reaction.inthis },
];

function useReveal(trigger: boolean) {
  const coverOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const contentY = useSharedValue(6);

  useEffect(() => {
    if (!trigger) return;
    coverOpacity.value = withTiming(1, { duration: ANIM.postRevealStage1 });
    contentOpacity.value = withDelay(
      ANIM.postRevealDelay,
      withTiming(1, { duration: ANIM.postRevealStage2 }),
    );
    contentY.value = withDelay(
      ANIM.postRevealDelay,
      withTiming(0, { duration: ANIM.postRevealStage2 }),
    );
  }, [trigger]);

  const coverStyle = useAnimatedStyle(() => ({ opacity: coverOpacity.value }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentY.value }],
  }));

  return { coverStyle, contentStyle };
}

function buildLeadLine(counts: ReactionCounts): string | null {
  const ranked = [
    { type: 'sparked', count: counts.sparked },
    { type: 'validated', count: counts.validated },
    { type: 'inthis', count: counts.inthis },
  ].sort((a, b) => b.count - a.count);
  const top = ranked[0];
  if (!top || top.count === 0) return null;
  if (top.type === 'sparked') return `${top.count} builders sparked this`;
  if (top.type === 'validated') return `${top.count} builders validated this`;
  return `${top.count} builders are in this too`;
}

function readingMinutes(post: Post): number {
  const text = `${post.body ?? ''} ${post.excerpt ?? ''}`.trim();
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.split(/\s+/).length / 220));
}

function firstName(name: string): string {
  return name.split(' ')[0] || name;
}

function stageLabel(stage: BuildingStage | null): string {
  if (stage === 'mvp') return 'Building';
  if (stage === 'idea') return 'Idea';
  if (stage === 'launched') return 'Launched';
  if (stage === 'scaling') return 'Scaling';
  return 'Builder';
}

function buildFounderBrief(post: Post): string {
  const source = post.excerpt || post.body || '';
  const cleaned = source.replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'A founder story from the Moncem community.';
  const firstSentence = cleaned.match(/^(.+?[.!?])\s/)?.[1] ?? cleaned;
  return firstSentence.length > 150 ? `${firstSentence.slice(0, 147).trim()}...` : firstSentence;
}

function PostBody({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  if (blocks.length === 0) {
    return (
      <View style={styles.bodyCard}>
        <EmptyState headline="No story yet." sub="This post has a title, but no body copy." />
      </View>
    );
  }

  return (
    <View style={styles.bodyCard}>
      <Text style={styles.sectionEyebrow}>THE STORY</Text>
      {blocks.map((block, index) => {
        const isQuote = block.startsWith('>') || block.startsWith('"');
        const body = block.replace(/^>\s*/, '');
        return (
          <Text
            key={`${index}-${body.slice(0, 16)}`}
            selectable
            style={isQuote ? styles.pullQuote : styles.bodyText}
          >
            {body}
          </Text>
        );
      })}
    </View>
  );
}

function ReactionSection({
  post,
  userId,
  sparkers,
}: {
  post: Post;
  userId: string;
  sparkers: Pick<Profile, 'id' | 'initials' | 'fullName'>[];
}) {
  const { counts, userReactions, toggle } = useReactions(
    userId,
    post.id,
    post.reactionCounts,
    post.userReactions,
  );
  const lead = buildLeadLine(counts) ?? 'Be the first to respond';

  return (
    <View style={styles.reactionSection}>
      <Text style={styles.reactionLead}>{lead}</Text>
      <View style={styles.reactionPills}>
        {REACTIONS.map((reaction) => {
          const active = userReactions.includes(reaction.type);
          return (
            <Pressable
              key={reaction.type}
              onPress={() => toggle(reaction.type)}
              style={[
                styles.reactionPill,
                active && { backgroundColor: reaction.color, borderColor: reaction.color },
              ]}
            >
              <Text style={[styles.reactionIcon, active && styles.reactionPillTextActive]}>
                {reaction.icon}
              </Text>
              <Text style={[styles.reactionPillText, active && styles.reactionPillTextActive]}>
                {reaction.label}
              </Text>
              <Text style={[styles.reactionCount, active && styles.reactionPillTextActive]}>
                {counts[reaction.type]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {sparkers.length > 0 ? (
        <View style={styles.sparkersRow}>
          <View style={styles.sparkersAvatars}>
            {sparkers.map((sparker) => (
              <View key={sparker.id} style={styles.sparkerAvatar}>
                <Text style={styles.sparkerInitials}>{sparker.initials}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.sparkersText}>
            {sparkers[0]?.fullName}
            {sparkers.length > 1 ? ` and ${sparkers.length - 1} others sparked this` : ' sparked this'}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function FloatingActionBar({
  post,
  userId,
  canConnect,
  onReply,
  onShare,
}: {
  post: Post;
  userId: string;
  canConnect: boolean;
  onReply: () => void;
  onShare: () => void;
}) {
  const { userReactions, toggle } = useReactions(
    userId,
    post.id,
    post.reactionCounts,
    post.userReactions,
  );
  const sparked = userReactions.includes('sparked');

  return (
    <View style={styles.actionBar}>
      <Pressable
        style={[styles.actionPill, sparked && styles.actionPillActive]}
        onPress={() => toggle('sparked')}
      >
        <Text style={[styles.actionIcon, sparked && styles.actionTextActive]}>◆</Text>
        <Text style={[styles.actionText, sparked && styles.actionTextActive]}>
          {sparked ? 'Sparked' : 'Spark'}
        </Text>
      </Pressable>
      <Pressable
        style={styles.actionPill}
        onPress={onReply}
        disabled={!canConnect}
      >
        <Feather name="message-circle" size={14} color={canConnect ? colors.obsidian : colors.muted} />
        <Text style={[styles.actionText, !canConnect && styles.actionTextMuted]}>Connect</Text>
      </Pressable>
      <Pressable style={styles.shareButton} onPress={onShare}>
        <Feather name="share" size={16} color={colors.goldLight} />
      </Pressable>
    </View>
  );
}

function FounderSnapshot({ post, readTime }: { post: Post; readTime: number }) {
  const signals = [
    { label: 'Stage', value: stageLabel(post.author.buildingStage) },
    { label: 'Type', value: post.type },
    { label: 'Read', value: readTime ? `${readTime} min` : 'Quick' },
  ];

  return (
    <View style={styles.snapshotCard}>
      <View style={styles.snapshotHeader}>
        <Text style={styles.sectionEyebrow}>FOUNDER SNAPSHOT</Text>
        {post.milestone ? <Text style={styles.snapshotMilestone}>{post.milestone}</Text> : null}
      </View>
      <Text style={styles.snapshotBrief}>{buildFounderBrief(post)}</Text>
      <View style={styles.signalRow}>
        {signals.map((signal) => (
          <View key={signal.label} style={styles.signalPill}>
            <Text style={styles.signalLabel}>{signal.label}</Text>
            <Text style={styles.signalValue}>{signal.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const { showToast } = useToast();

  const [post, setPost] = useState<Post | null>(null);
  const [sparkers, setSparkers] = useState<Pick<Profile, 'id' | 'initials' | 'fullName'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [connectVisible, setConnectVisible] = useState(false);

  const { coverStyle, contentStyle } = useReveal(revealed);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setRevealed(false);
    try {
      const [loadedPost, recentSparkers] = await Promise.all([
        fetchPostById(id, userId),
        fetchRecentSparkers(id),
      ]);
      setPost(loadedPost);
      setSparkers(recentSparkers);
      setRevealed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load post');
    } finally {
      setLoading(false);
    }
  }, [id, userId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (id) incrementViewCount(id).catch(() => {}); }, [id]);

  const isAuthor = !!post && !!userId && post.author.id === userId;
  const canConnect = !!post && !isAuthor && post.author.connectStatus !== 'closed';
  const readTime = post ? readingMinutes(post) : 0;

  function handleMenu() {
    Alert.alert('', '', [
      { text: 'Edit post', onPress: () => router.push(`/post/edit/${id}` as never) },
      {
        text: 'Delete post',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Delete post', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                if (!id || !userId) return;
                try {
                  await deletePost(id, userId);
                  router.replace('/(tabs)');
                } catch (err) {
                  Alert.alert('Error', err instanceof Error ? err.message : 'Delete failed');
                }
              },
            },
          ]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function handleReport() {
    if (!post) return;
    showReportActions({
      reporterId: userId,
      targetType: 'post',
      postId: post.id,
      onSuccess: (message) => showToast({ message, type: 'success' }),
      onError: (message) => showToast({ message, type: 'error' }),
    });
  }

  function handleShare() {
    if (!post) return;
    Share.share({ message: `${post.title}\n\nmoncem://post/${post.id}` }).catch(() => {});
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerBtn}>
          <Feather name="arrow-left" size={20} color={colors.obsidian} />
        </Pressable>
        {isAuthor ? (
          <Pressable onPress={handleMenu} hitSlop={12} style={styles.headerBtn}>
            <Feather name="more-horizontal" size={20} color={colors.obsidian} />
          </Pressable>
        ) : post ? (
          <Pressable onPress={handleReport} hitSlop={12} style={styles.headerBtn}>
            <Feather name="flag" size={18} color={colors.muted} />
          </Pressable>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>

      {loading ? (
        <PostDetailSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : post ? (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            <Animated.View style={[styles.coverWrapper, coverStyle]}>
              {post.coverUrl ? (
                <Image source={{ uri: post.coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.cardDark }]} />
              )}
              <View style={[StyleSheet.absoluteFill, styles.coverOverlay]} />
              <View style={styles.coverTop}>
                <View style={[styles.typeBadge, { borderColor: colors.accent[post.type] + '55' }]}>
                  <View style={[styles.typeDot, { backgroundColor: colors.accent[post.type] }]} />
                  <Text style={styles.typeBadgeText}>{post.type.toUpperCase()}</Text>
                </View>
                {post.milestone ? (
                  <View style={styles.milestonePill}>
                    <Text style={styles.milestoneText}>{post.milestone}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.coverContent}>
                <Text style={styles.coverMeta} numberOfLines={1}>
                  {[...post.tags.slice(0, 2).map((tag) => tag.toUpperCase()), readTime ? `${readTime} min read` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                <Text style={styles.coverTitle} numberOfLines={4}>{post.title}</Text>
              </View>
            </Animated.View>

            <Animated.View style={[styles.content, contentStyle]}>
              <Pressable
                style={styles.authorCard}
                onPress={() => router.push(`/profile/${post.author.id}` as never)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{post.author.initials}</Text>
                </View>
                <View style={styles.authorCopy}>
                  <View style={styles.authorNameRow}>
                    <Text style={styles.authorName}>{displayName(post.author)}</Text>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusBadgeText}>{post.author.connectStatus.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.authorMeta}>@{post.author.username} · {post.createdAt}</Text>
                </View>
                {canConnect ? (
                  <Pressable onPress={() => setConnectVisible(true)} style={styles.connectButton}>
                    <Text style={styles.connectText}>Connect</Text>
                  </Pressable>
                ) : (
                  <Feather name="chevron-right" size={16} color={colors.muted} />
                )}
              </Pressable>

              {post.author.buildingStage ? <JourneyStage stage={post.author.buildingStage} /> : null}

              <FounderSnapshot post={post} readTime={readTime} />
              <PostBody text={post.body ?? post.excerpt ?? ''} />
              <ReactionSection post={post} userId={userId} sparkers={sparkers} />

              {canConnect ? (
                <View style={styles.askSection}>
                  <Text style={styles.askLabel}>CONNECT WITH {firstName(displayName(post.author)).toUpperCase()}</Text>
                  <Text style={styles.askCopy}>
                    Ask about the numbers, trade notes, or start a founder conversation while the story is fresh.
                  </Text>
                  <Pressable style={styles.askPrimaryButton} onPress={() => setConnectVisible(true)}>
                    <Text style={styles.askPrimaryText}>Start a conversation</Text>
                    <Text style={styles.askPrimaryArrow}>→</Text>
                  </Pressable>
                </View>
              ) : null}
            </Animated.View>
          </ScrollView>

          <FloatingActionBar
            post={post}
            userId={userId}
            canConnect={canConnect}
            onReply={() => setConnectVisible(true)}
            onShare={handleShare}
          />

          {canConnect ? (
            <ConversationStarter
              visible={connectVisible}
              onClose={() => setConnectVisible(false)}
              recipient={post.author}
              contextPostId={post.id}
              contextPostTitle={post.title}
            />
          ) : null}
        </>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.parchment },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sizes.screenPadding,
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.parchment,
  },
  headerBtn: {
    width: sizes.tapTarget,
    height: sizes.tapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { paddingBottom: 96 },
  coverWrapper: {
    height: 320,
    backgroundColor: colors.cardDark,
    justifyContent: 'space-between',
  },
  coverOverlay: { backgroundColor: 'rgba(17,22,24,0.42)' },
  coverTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sizes.screenPadding,
    paddingTop: spacing.md,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.avatar,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.white,
  },
  typeDot: { width: 6, height: 6, borderRadius: 3 },
  typeBadgeText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1.4,
    color: colors.venture,
  },
  milestonePill: {
    borderRadius: radius.avatar,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  milestoneText: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.obsidian },
  coverContent: {
    paddingHorizontal: sizes.screenPadding,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  coverMeta: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1.4,
    color: colors.goldLight,
  },
  coverTitle: {
    fontFamily: fonts.display,
    fontSize: fontSize.pageTitle,
    color: colors.parchment,
    lineHeight: 27,
  },
  content: {
    paddingHorizontal: sizes.screenPadding,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  authorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: radius.avatar,
    backgroundColor: colors.avatarBg,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.gold },
  authorCopy: { flex: 1, gap: spacing.xs },
  authorNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  authorName: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.obsidian },
  authorMeta: { fontFamily: fonts.sans, fontSize: 11, color: colors.metaText },
  statusBadge: {
    borderRadius: radius.avatar,
    backgroundColor: colors.avatarBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusBadgeText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    color: colors.gold,
  },
  connectButton: {
    minHeight: 44,
    borderRadius: radius.avatar,
    backgroundColor: colors.obsidian,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectText: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.parchment },
  snapshotCard: {
    backgroundColor: colors.cardDark,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
  },
  snapshotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionEyebrow: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1.6,
    color: colors.gold,
  },
  snapshotMilestone: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: colors.goldLight,
  },
  snapshotBrief: {
    fontFamily: fonts.display,
    fontSize: 20,
    lineHeight: 26,
    color: colors.parchment,
  },
  signalRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  signalPill: {
    flex: 1,
    minHeight: 56,
    borderRadius: radius.tag,
    borderWidth: 1,
    borderColor: colors.gold,
    padding: spacing.sm,
    justifyContent: 'center',
    gap: spacing.xs,
  },
  signalLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    color: colors.badgeText,
  },
  signalValue: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: colors.parchment,
    textTransform: 'capitalize',
  },
  bodyCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  bodyText: {
    fontFamily: fonts.serifBody,
    fontSize: 16,
    lineHeight: 26,
    color: colors.obsidian,
  },
  pullQuote: {
    fontFamily: fonts.serifBodyItalic,
    fontSize: 15,
    lineHeight: 24,
    color: colors.textBody,
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
    paddingLeft: spacing.sm,
  },
  reactionSection: {
    backgroundColor: colors.parchment,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  reactionLead: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.bodyLarge,
    color: colors.obsidian,
  },
  reactionPills: { flexDirection: 'row', gap: spacing.sm },
  reactionPill: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  reactionIcon: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.gold },
  reactionPillText: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.obsidian },
  reactionPillTextActive: { color: colors.white },
  reactionCount: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.muted },
  sparkersRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sparkersAvatars: { flexDirection: 'row' },
  sparkerAvatar: {
    width: 24,
    height: 24,
    borderRadius: radius.avatar,
    backgroundColor: colors.avatarBg,
    borderWidth: 1,
    borderColor: colors.parchment,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -spacing.xs,
  },
  sparkerInitials: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.gold },
  sparkersText: { flex: 1, fontFamily: fonts.sans, fontSize: 12, color: colors.muted },
  askSection: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  askLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1.6,
    color: colors.gold,
  },
  askCopy: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textBody,
  },
  askPrimaryButton: {
    minHeight: 44,
    borderRadius: radius.avatar,
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  askPrimaryText: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.obsidian },
  askPrimaryArrow: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.obsidian },
  actionBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.parchment,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.avatar,
    padding: spacing.sm,
  },
  actionPill: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.avatar,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  actionPillActive: {
    backgroundColor: colors.goldLight,
    borderColor: colors.gold,
  },
  actionText: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.obsidian },
  actionIcon: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.gold },
  actionTextActive: { fontFamily: fonts.sansBold },
  actionTextMuted: { color: colors.muted },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: radius.avatar,
    backgroundColor: colors.obsidian,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
