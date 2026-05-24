import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ListCard from '../../components/feed/ListCard';
import { ConnectBadge, ConversationStarter } from '../../components/ui/ConversationStarter';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { ListSkeleton } from '../../components/ui/SkeletonCard';
import { useToast } from '../../components/ui/Toast';
import { showReportActions } from '../../components/ui/reportActions';
import { colors, fonts, radius, sizes, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { displayName } from '../../lib/format';
import { fetchPostsByAuthor, fetchPublicProfile } from '../../lib/queries';
import type { Post, Profile } from '../../lib/types';

function ProfileHeader({
  profile,
  postCount,
  sparksReceived,
  isOwnProfile,
  onConnect,
}: {
  profile: Profile;
  postCount: number;
  sparksReceived: number;
  isOwnProfile: boolean;
  onConnect: () => void;
}) {
  const canConnect = !isOwnProfile && profile.connectStatus !== 'closed';

  return (
    <View style={styles.profileHeader}>
      <View style={styles.coverBand} />
      <View style={styles.identityBlock}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{profile.initials}</Text>
        </View>

        <Text style={styles.fullName}>{displayName(profile)}</Text>
        <View style={styles.handleRow}>
          {profile.username ? <Text style={styles.username}>@{profile.username}</Text> : null}
          <ConnectBadge status={profile.connectStatus} />
        </View>
        {profile.location ? <Text style={styles.location}>⌖ {profile.location}</Text> : null}
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{postCount}</Text>
            <Text style={styles.statLabel}>posts</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>sparks given</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{sparksReceived}</Text>
            <Text style={styles.statLabel}>sparks received</Text>
          </View>
        </View>

        {canConnect ? (
          <Pressable style={styles.connectBtn} onPress={onConnect}>
            <Text style={styles.connectBtnText}>Start a conversation</Text>
          </Pressable>
        ) : null}

        {profile.interests.length > 0 ? (
          <View style={styles.interestsRow}>
            {profile.interests.map((tag) => (
              <View key={tag} style={styles.interestChip}>
                <Text style={styles.interestText}>{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.tabs}>
        <Text style={[styles.tabText, styles.tabTextActive]}>Posts</Text>
        <Text style={styles.tabText}>Asks</Text>
        <Text style={styles.tabText}>About</Text>
        <View style={styles.tabUnderline} />
      </View>
    </View>
  );
}

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const { showToast } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectVisible, setConnectVisible] = useState(false);

  const isOwnProfile = id === userId;
  const sparksReceived = useMemo(
    () => posts.reduce((sum, post) => sum + (post.reactionCounts?.sparked ?? 0), 0),
    [posts],
  );

  function handleReportProfile() {
    if (!profile || isOwnProfile) return;
    showReportActions({
      reporterId: userId,
      targetType: 'profile',
      profileId: profile.id,
      onSuccess: (message) => showToast({ message, type: 'success' }),
      onError: (message) => showToast({ message, type: 'error' }),
    });
  }

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    Promise.all([fetchPublicProfile(id), fetchPostsByAuthor(id)])
      .then(([loadedProfile, loadedPosts]) => {
        setProfile(loadedProfile);
        setPosts(loadedPosts);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerBtn}>
          <Feather name="arrow-left" size={20} color={colors.obsidian} />
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        {profile && !isOwnProfile ? (
          <Pressable onPress={handleReportProfile} hitSlop={12} style={styles.headerBtn}>
            <Feather name="flag" size={18} color={colors.muted} />
          </Pressable>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>

      {loading ? (
        <>
          <ListSkeleton />
          <ListSkeleton />
          <ListSkeleton />
        </>
      ) : error ? (
        <ErrorState message={error} />
      ) : profile ? (
        <>
          <FlatList<Post>
            data={posts}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <ProfileHeader
                profile={profile}
                postCount={posts.length}
                sparksReceived={sparksReceived}
                isOwnProfile={isOwnProfile}
                onConnect={() => setConnectVisible(true)}
              />
            }
            ListEmptyComponent={
              <EmptyState
                headline="No stories yet."
                sub="Their first journey, build, or idea will appear here."
              />
            }
            renderItem={({ item }) => <ListCard post={item} userId={userId} />}
          />

          {!isOwnProfile && profile.connectStatus !== 'closed' ? (
            <ConversationStarter
              visible={connectVisible}
              onClose={() => setConnectVisible(false)}
              recipient={profile}
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
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBtn: {
    width: sizes.tapTarget,
    height: sizes.tapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.obsidian,
  },
  listContent: { paddingBottom: spacing.xxxl },
  profileHeader: { backgroundColor: colors.parchment },
  coverBand: {
    height: 96,
    backgroundColor: colors.avatarBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  identityBlock: {
    paddingHorizontal: sizes.screenPadding,
    paddingTop: 40,
    paddingBottom: spacing.lg,
  },
  avatar: {
    position: 'absolute',
    top: -36,
    left: sizes.screenPadding,
    width: 72,
    height: 72,
    borderRadius: radius.avatar,
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.parchment,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.sansBold, fontSize: 22, color: colors.gold },
  fullName: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.obsidian,
    lineHeight: 28,
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  username: { fontFamily: fonts.sans, fontSize: 13, color: colors.muted },
  location: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.muted,
    marginTop: spacing.sm,
  },
  bio: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.obsidian,
    lineHeight: 22,
    marginTop: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  stat: { flex: 1 },
  statNumber: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.obsidian,
    lineHeight: 30,
  },
  statLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.muted,
  },
  connectBtn: {
    minHeight: 44,
    borderRadius: radius.avatar,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  connectBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.obsidian,
  },
  interestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  interestChip: {
    backgroundColor: colors.avatarBg,
    borderRadius: radius.tag,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  interestText: { fontFamily: fonts.sans, fontSize: 11, color: colors.muted },
  tabs: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sizes.screenPadding,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  tabText: {
    minWidth: 72,
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.muted,
  },
  tabTextActive: {
    color: colors.obsidian,
    fontFamily: fonts.sansBold,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: sizes.screenPadding,
    width: 40,
    height: 2,
    backgroundColor: colors.gold,
  },
});
