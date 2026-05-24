import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ListCard from '../../components/feed/ListCard';
import { ConnectBadge } from '../../components/ui/ConversationStarter';
import EmptyState from '../../components/ui/EmptyState';
import { colors, fonts, radius, sizes, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { displayName } from '../../lib/format';
import {
  fetchAllBuilders,
  fetchBuilders,
  fetchPostsByTag,
  fetchProfile,
  fetchTagsWithCounts,
} from '../../lib/queries';
import type { Post, Profile } from '../../lib/types';

const TOPIC_PALETTES = colors.topic;

const KNOWN_PALETTE: Record<string, number> = {
  AI: 0,
  'Machine Learning': 0,
  'Dev Tools': 1,
  'Open Source': 1,
  Climate: 1,
  SaaS: 2,
  B2B: 2,
  Consumer: 2,
  Robotics: 2,
  Fintech: 3,
  Finance: 3,
  Crypto: 3,
  Health: 3,
};

function paletteFor(tag: string, idx: number) {
  return TOPIC_PALETTES[KNOWN_PALETTE[tag] ?? idx % 4];
}

function SectionLabel({ title }: { title: string }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

function TopicCard({
  tag,
  count,
  paletteIdx,
  onPress,
}: {
  tag: string;
  count: number;
  paletteIdx: number;
  onPress: () => void;
}) {
  const p = paletteFor(tag, paletteIdx);
  return (
    <Pressable style={[styles.topicCard, { backgroundColor: p.bg }]} onPress={onPress}>
      <View style={[styles.topicGlow, { backgroundColor: p.glow }]} />
      <Text style={[styles.topicTag, { color: p.accent }]}>{tag.toUpperCase()}</Text>
      <Text style={styles.topicCount}>{count}</Text>
      <Text style={styles.topicSub}>posts this week</Text>
    </Pressable>
  );
}

function BuilderCard({ profile }: { profile: Profile }) {
  const router = useRouter();
  return (
    <Pressable
      style={styles.builderCard}
      onPress={() => router.push(`/profile/${profile.id}` as never)}
    >
      <View style={styles.builderAvatar}>
        <Text style={styles.builderInitials}>{profile.initials}</Text>
      </View>
      <View style={styles.builderMeta}>
        <Text style={styles.builderName} numberOfLines={1}>{displayName(profile)}</Text>
        <View style={styles.builderFooter}>
          <ConnectBadge status={profile.connectStatus} />
          {profile.interests.slice(0, 2).map((interest) => (
            <View key={interest} style={styles.interestPill}>
              <Text style={styles.interestPillText}>{interest}</Text>
            </View>
          ))}
        </View>
      </View>
      <Text style={styles.builderArrow}>→</Text>
    </Pressable>
  );
}

export default function ExploreScreen() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';

  const [tagCounts, setTagCounts] = useState<{ tag: string; count: number }[]>([]);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [builders, setBuilders] = useState<Profile[]>([]);
  const [showAllBuilders, setShowAllBuilders] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  const loadPage = useCallback(async () => {
    try {
      const [tc, bl] = await Promise.all([fetchTagsWithCounts(), fetchBuilders(3)]);
      setTagCounts(tc);
      setBuilders(bl);
      if (userId) {
        const profile = await fetchProfile(userId).catch(() => null);
        setUserInterests(profile?.interests ?? []);
      }
    } catch {
      setTagCounts([]);
      setBuilders([]);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => {
    setShowAllBuilders(false);
    setActiveTag(null);
    setFilteredPosts([]);
    loadPage();
  }, [loadPage]));

  async function selectTag(tag: string) {
    if (activeTag === tag) {
      setActiveTag(null);
      setFilteredPosts([]);
      return;
    }
    setActiveTag(tag);
    setLoadingPosts(true);
    try {
      setFilteredPosts(await fetchPostsByTag(tag, userId));
    } catch {
      setFilteredPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  }

  async function showAllOpenBuilders() {
    setShowAllBuilders(true);
    try {
      setBuilders(await fetchAllBuilders());
    } catch {
      setShowAllBuilders(false);
    }
  }

  const allTags = tagCounts.map((t) => t.tag);
  const topicTags = [
    ...userInterests.filter((tag) => allTags.includes(tag)),
    ...allTags.filter((tag) => !userInterests.includes(tag)),
  ].slice(0, 4);
  const countFor = (tag: string) => tagCounts.find((item) => item.tag === tag)?.count ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore</Text>
        {activeTag ? (
          <Pressable onPress={() => { setActiveTag(null); setFilteredPosts([]); }} hitSlop={12} style={styles.clearBtn}>
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        ) : <View style={styles.clearBtn} />}
      </View>

      {activeTag ? (
        <View style={styles.flex}>
          <ScrollView
            horizontal
            style={styles.pillStripScroll}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalPills}
          >
            {allTags.map((tag) => (
              <Pressable
                key={tag}
                style={[styles.pill, activeTag === tag && styles.pillActive]}
                onPress={() => selectTag(tag)}
              >
                <Text style={[styles.pillText, activeTag === tag && styles.pillTextActive]}>
                  {tag}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {loadingPosts ? (
            <View style={styles.loadingState}>
              <Text style={styles.loadingDots}>...</Text>
            </View>
          ) : (
            <FlatList<Post>
              data={filteredPosts}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.filteredListContent}
              ListEmptyComponent={
                <EmptyState
                  headline="No builders match those filters yet."
                  sub="Try a broader search."
                />
              }
              renderItem={({ item }) => <ListCard post={item} userId={userId} />}
            />
          )}
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.discovery}>
          {topicTags.length > 0 ? (
            <>
              <SectionLabel title="TOPICS" />
              <View style={styles.topicGrid}>
                {topicTags.map((tag, i) => (
                  <TopicCard
                    key={tag}
                    tag={tag}
                    count={countFor(tag)}
                    paletteIdx={i}
                    onPress={() => selectTag(tag)}
                  />
                ))}
              </View>
            </>
          ) : null}

          {allTags.length > 0 ? (
            <>
              <SectionLabel title="BROWSE BY INTEREST" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalPills}
              >
                {allTags.map((tag) => (
                  <Pressable key={tag} style={styles.pill} onPress={() => selectTag(tag)}>
                    <Text style={styles.pillText}>{tag}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          ) : null}

          <SectionLabel title="BUILDERS OPEN TO CONNECT" />
          {builders.length > 0 ? (
            <>
              {builders.map((builder) => <BuilderCard key={builder.id} profile={builder} />)}
              {!showAllBuilders ? (
                <Pressable hitSlop={12} style={styles.seeAll} onPress={showAllOpenBuilders}>
                  <Text style={styles.seeAllText}>See all builders →</Text>
                </Pressable>
              ) : null}
            </>
          ) : (
            <EmptyState headline="No builders match those filters yet." sub="Try a broader search." />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.parchment },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sizes.screenPadding,
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.obsidian,
  },
  clearBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  clearText: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.gold },
  discovery: {
    paddingHorizontal: sizes.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl * 2,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1.8,
    color: colors.muted,
    flexShrink: 0,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: colors.border },
  topicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  topicCard: {
    width: '48.5%',
    borderRadius: radius.card,
    padding: spacing.md,
    minHeight: 108,
    overflow: 'hidden',
    gap: spacing.xs,
  },
  topicGlow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  topicTag: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1.4,
  },
  topicCount: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.white,
    lineHeight: 34,
    marginTop: spacing.sm,
  },
  topicSub: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.white,
    opacity: 0.5,
  },
  horizontalPills: {
    gap: spacing.sm,
    paddingRight: sizes.screenPadding,
  },
  pillStripScroll: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pill: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.avatar,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: { backgroundColor: colors.obsidian, borderColor: colors.obsidian },
  pillText: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.mutedDark },
  pillTextActive: { color: colors.goldLight },
  builderCard: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  builderAvatar: {
    width: 40,
    height: 40,
    borderRadius: radius.avatar,
    backgroundColor: colors.avatarBg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  builderInitials: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.gold },
  builderMeta: { flex: 1, gap: spacing.xs },
  builderName: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.obsidian },
  builderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  interestPill: {
    minHeight: 24,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.avatar,
    backgroundColor: colors.parchment,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  interestPillText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.muted,
  },
  builderArrow: {
    width: 24,
    fontFamily: fonts.sansMedium,
    fontSize: 16,
    color: colors.gold,
    textAlign: 'right',
  },
  seeAll: {
    minHeight: 44,
    alignSelf: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  seeAllText: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.gold },
  filteredListContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  loadingState: {
    paddingTop: spacing.xxxl,
    alignItems: 'center',
    paddingHorizontal: sizes.screenPadding,
  },
  loadingDots: { fontFamily: fonts.sansMedium, fontSize: 22, color: colors.muted, letterSpacing: 4 },
});
