import Feather from '@expo/vector-icons/Feather';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  LayoutChangeEvent,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInDown,
  FadeOutDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeroCard from '../../components/feed/HeroCard';
import ListCard from '../../components/feed/ListCard';
import { HeroSkeleton, ListSkeleton } from '../../components/ui/SkeletonCard';
import { ANIM } from '../../constants/animations';
import { colors, fonts, radius, sizes, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useFeed } from '../../hooks/useFeed';
import { useNotifications } from '../../hooks/useNotifications';
import type { Post } from '../../lib/types';

type FeedFilter = 'NEW' | 'TOP' | 'VALIDATED';
const FILTERS: FeedFilter[] = ['NEW', 'TOP', 'VALIDATED'];
const FILTER_MAP: Record<FeedFilter, 'new' | 'top' | 'trending'> = {
  NEW: 'new', TOP: 'top', VALIDATED: 'trending',
};

// ─── Tab underline that slides between tabs ───────────────────────────────────
function SlidingTabBar({
  activeFilter,
  onFilterChange,
}: {
  activeFilter: FeedFilter;
  onFilterChange: (f: FeedFilter) => void;
}) {
  const tabLayouts = useRef<Record<FeedFilter, { x: number; width: number }>>({
    NEW: { x: 0, width: 0 },
    TOP: { x: 0, width: 0 },
    VALIDATED: { x: 0, width: 0 },
  });
  const underlineX = useSharedValue(0);
  const underlineW = useSharedValue(0);

  function onTabLayout(filter: FeedFilter, e: LayoutChangeEvent) {
    const { x, width } = e.nativeEvent.layout;
    tabLayouts.current[filter] = { x, width };
    if (filter === activeFilter) {
      underlineX.value = x;
      underlineW.value = width;
    }
  }

  useEffect(() => {
    const layout = tabLayouts.current[activeFilter];
    if (layout.width > 0) {
      underlineX.value = withTiming(layout.x, { duration: 200, easing: Easing.out(Easing.cubic) });
      underlineW.value = withTiming(layout.width, { duration: 200, easing: Easing.out(Easing.cubic) });
    }
  }, [activeFilter]);

  const underlineStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    bottom: 0,
    left: underlineX.value,
    width: underlineW.value,
    height: 2,
    backgroundColor: colors.gold,
    borderRadius: 1,
  }));

  return (
    <View style={styles.filterRow}>
      {FILTERS.map((tab) => (
        <Pressable
          key={tab}
          onPress={() => onFilterChange(tab)}
          style={styles.filterItem}
          onLayout={(e) => onTabLayout(tab, e)}
        >
          <Text style={[styles.filterText, activeFilter === tab && styles.filterActive]}>
            {tab}
          </Text>
        </Pressable>
      ))}
      <Animated.View style={underlineStyle} />
    </View>
  );
}

// ─── Bell icon with shake + badge ────────────────────────────────────────────
function BellButton({
  unreadCount,
  prevUnreadCount,
  onPress,
}: {
  unreadCount: number;
  prevUnreadCount: number;
  onPress: () => void;
}) {
  const rotation = useSharedValue(0);
  const badgeOpacity = useSharedValue(unreadCount > 0 ? 1 : 0);

  useEffect(() => {
    if (unreadCount > prevUnreadCount) {
      // Shake once on new notification — communicates the event, then silence.
      rotation.value = withSequence(
        withTiming(-15, { duration: ANIM.bellShakeStep }),
        withTiming(15,  { duration: ANIM.bellShakeStep }),
        withTiming(-10, { duration: ANIM.bellShakeStep }),
        withTiming(10,  { duration: ANIM.bellShakeStep }),
        withTiming(0,   { duration: ANIM.bellShakeStep }),
      );
      if (prevUnreadCount === 0) {
        badgeOpacity.value = withTiming(1, { duration: ANIM.badgeFade });
      }
    } else if (unreadCount === 0) {
      badgeOpacity.value = withTiming(0, { duration: ANIM.badgeFade });
    }
  }, [unreadCount]);

  const bellStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
  const badgeStyle = useAnimatedStyle(() => ({
    opacity: badgeOpacity.value,
  }));

  return (
    <Pressable onPress={onPress} style={styles.iconBtn} hitSlop={8}>
      <Animated.View style={bellStyle}>
        <Feather name="bell" size={20} color={colors.muted} />
      </Animated.View>
      {unreadCount > 0 && (
        <Animated.View style={[styles.badge, badgeStyle]}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : String(unreadCount)}</Text>
        </Animated.View>
      )}
    </Pressable>
  );
}

// ─── Feed header ──────────────────────────────────────────────────────────────
function FeedHeader({
  activeFilter,
  onFilterChange,
  userInitials,
  onAvatarPress,
  onInboxPress,
  onBellPress,
  unreadCount,
  prevUnreadCount,
}: {
  activeFilter: FeedFilter;
  onFilterChange: (f: FeedFilter) => void;
  userInitials: string;
  onAvatarPress: () => void;
  onInboxPress: () => void;
  onBellPress: () => void;
  unreadCount: number;
  prevUnreadCount: number;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.topBar}>
        <Text style={styles.appName}>MONCEM</Text>
        <View style={styles.topBarRight}>
          <BellButton
            unreadCount={unreadCount}
            prevUnreadCount={prevUnreadCount}
            onPress={onBellPress}
          />
          <Pressable onPress={onInboxPress} style={styles.iconBtn} hitSlop={8}>
            <Feather name="message-circle" size={20} color={colors.muted} />
          </Pressable>
          <Pressable onPress={onAvatarPress} style={styles.headerAvatarBtn}>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>{userInitials}</Text>
            </View>
          </Pressable>
        </View>
      </View>
      <SlidingTabBar activeFilter={activeFilter} onFilterChange={onFilterChange} />
    </View>
  );
}

function FeedEmptyState({
  error,
  onPost,
  onRetry,
}: {
  error: string | null;
  onPost: () => void;
  onRetry: () => void;
}) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyGlyph}>◈</Text>
      {error ? (
        <>
          <Text style={styles.emptyTitle}>Could not load feed.</Text>
          <Text style={styles.emptyHint}>Check your connection and try again.</Text>
          <Pressable onPress={onRetry} hitSlop={8} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>RETRY</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.emptyTitle}>Your feed is quiet right now.</Text>
          <Text style={styles.emptyHint}>Stories from builders you follow appear here.</Text>
          <Pressable onPress={onPost} hitSlop={8}>
            <Text style={styles.emptyAction}>Find builders to follow →</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

function SparseFeedFooter({ onPost }: { onPost: () => void }) {
  return (
    <View style={styles.sparseFooter}>
      <View style={styles.sparseRule}>
        <View style={styles.sparseLine} />
        <Text style={styles.sparseLabel}>MORE COMING SOON</Text>
        <View style={styles.sparseLine} />
      </View>
      <View style={styles.sparseCard}>
        <Text style={styles.sparseCardText}>Want to inspire others? Share your story.</Text>
        <Pressable onPress={onPost} hitSlop={8}>
          <Text style={styles.sparseCardAction}>Post yours →</Text>
        </Pressable>
      </View>
    </View>
  );
}

function FeedSkeletons() {
  return (
    <>
      <HeroSkeleton />
      <ListSkeleton />
      <ListSkeleton />
      <ListSkeleton />
    </>
  );
}

function WelcomeToast({ name }: { name: string }) {
  return (
    <Animated.View
      style={toastStyles.wrap}
      entering={FadeInDown.delay(400).duration(300).springify()}
      exiting={FadeOutDown.duration(200)}
    >
      <Text style={toastStyles.text}>Welcome in{name ? `, ${name.split(' ')[0]}` : ''} ◈</Text>
    </Animated.View>
  );
}

const toastStyles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    backgroundColor: colors.obsidian,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    zIndex: 100,
  },
  text: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.parchment },
});

// ─── Custom refresh indicator ─────────────────────────────────────────────────
// Linear/Notion/Craft pattern: a thin gold arc that rotates at constant speed.
// Built with a bordered View — borderTopColor visible, others transparent —
// no SVG dependency, no rotating glyph.
function RefreshArc({ refreshing }: { refreshing: boolean }) {
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (refreshing) {
      opacity.value = withTiming(1, { duration: ANIM.refreshFadeIn });
      rotation.value = 0;
      rotation.value = withRepeat(
        withTiming(360, { duration: ANIM.refreshArc, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      opacity.value = withTiming(0, { duration: ANIM.refreshFadeOut });
      cancelAnimation(rotation);
    }
  }, [refreshing]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={arcStyles.wrap}>
      <Animated.View style={[arcStyles.arc, style]} />
    </View>
  );
}

const arcStyles = StyleSheet.create({
  wrap: {
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arc: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    borderTopColor: colors.gold,
    borderRightColor: colors.gold,
  },
});

function FounderPulse({ posts }: { posts: Post[] }) {
  const milestones = posts.filter((post) => post.milestone).length;
  const openBuilders = new Set(
    posts
      .filter((post) => post.author.connectStatus !== 'closed')
      .map((post) => post.author.id),
  ).size;

  return (
    <View style={styles.pulse}>
      <View style={styles.pulseCell}>
        <Text style={styles.pulseNumber}>{posts.length}</Text>
        <Text style={styles.pulseLabel}>Shipped</Text>
      </View>
      <View style={styles.pulseCell}>
        <Text style={styles.pulseNumber}>{milestones}</Text>
        <Text style={styles.pulseLabel}>Milestones</Text>
      </View>
      <View style={styles.pulseCellLast}>
        <Text style={styles.pulseNumber}>{openBuilders}</Text>
        <Text style={styles.pulseLabel}>Open</Text>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function FeedScreen() {
  const { session, profile } = useAuth();
  const router = useRouter();
  const userId = session?.user.id ?? '';
  const userInitials = profile?.initials || session?.user.email?.slice(0, 2).toUpperCase() || '?';

  const [activeFilter, setActiveFilter] = useState<FeedFilter>('NEW');
  const { posts, loading, error, refresh } = useFeed(FILTER_MAP[activeFilter], userId);
  const { unreadCount } = useNotifications();
  const prevUnreadCount = useRef(0);

  const [showWelcome, setShowWelcome] = useState(false);
  const welcomeShown = useRef(false);

  useEffect(() => {
    if (profile?.onboardingCompleted && !welcomeShown.current) {
      const since = profile.createdAt ? Date.now() - new Date(profile.createdAt).getTime() : Infinity;
      if (since < ANIM.welcomeWindow) {
        welcomeShown.current = true;
        setShowWelcome(true);
        setTimeout(() => setShowWelcome(false), ANIM.welcomeVisible);
      }
    }
  }, [profile]);

  // Track previous unread count for bell shake trigger
  const currentUnread = unreadCount;
  const prevUnread = prevUnreadCount.current;
  useEffect(() => {
    prevUnreadCount.current = unreadCount;
  }, [unreadCount]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const header = (
    <FeedHeader
      activeFilter={activeFilter}
      onFilterChange={setActiveFilter}
      userInitials={userInitials}
      onAvatarPress={() => router.push('/(tabs)/me' as never)}
      onInboxPress={() => router.push('/inbox' as never)}
      onBellPress={() => router.push('/notifications' as never)}
      unreadCount={currentUnread}
      prevUnreadCount={prevUnread}
    />
  );

  if (loading && posts.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="dark" />
        {header}
        <FeedSkeletons />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      {showWelcome && <WelcomeToast name={profile?.fullName ?? ''} />}
      <FlatList<Post>
        data={posts}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor="transparent"
            colors={['transparent']}
          />
        }
        ListHeaderComponent={
          <>
            {header}
            <RefreshArc refreshing={loading} />
            {posts.length > 0 ? <FounderPulse posts={posts} /> : null}
          </>
        }
        ListEmptyComponent={
          <FeedEmptyState
            error={error}
            onPost={() => router.push('/(tabs)/explore' as never)}
            onRetry={refresh}
          />
        }
        ListFooterComponent={
          posts.length > 0 && posts.length < 5
            ? <SparseFeedFooter onPost={() => router.push('/post/new' as never)} />
            : null
        }
        renderItem={({ item, index }) =>
          index === 0
            ? <HeroCard post={item} userId={userId} index={index} />
            : <ListCard post={item} userId={userId} index={index} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.parchment },
  listContent: { paddingBottom: spacing.xxxl },
  header: { backgroundColor: colors.parchment },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: sizes.screenPadding,
    height: 52,
  },
  appName: { fontFamily: fonts.sansBold, fontSize: 14, letterSpacing: 2.5, color: colors.obsidian },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBtn: {
    width: sizes.tapTarget,
    height: sizes.tapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.parchment },
  headerAvatarBtn: { padding: spacing.xs },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: colors.avatarBg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.gold },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: sizes.screenPadding,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    position: 'relative',
  },
  filterItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: sizes.tapTarget,
    justifyContent: 'center',
  },
  // Inactive tab: lighter weight (medium 500) + muted color.
  // Active tab: bolder weight (700) + obsidian color.
  // No motion on the text itself — only the underline slides.
  filterText: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 1.1,
    color: colors.muted,
  },
  filterActive: { fontFamily: fonts.sansBold, color: colors.obsidian },
  pulse: {
    marginHorizontal: sizes.screenPadding,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  pulseCell: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  pulseCellLast: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  pulseNumber: {
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: 28,
    color: colors.obsidian,
  },
  pulseLabel: {
    marginTop: 2,
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 1.1,
    color: colors.muted,
    textTransform: 'uppercase',
  },

  // Empty state
  emptyState: {
    paddingTop: spacing.xxxl * 2,
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: sizes.screenPadding,
  },
  emptyGlyph: { fontFamily: fonts.display, fontSize: 32, color: colors.gold, opacity: 0.55 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.obsidian, textAlign: 'center' },
  emptyHint: { fontFamily: fonts.sans, fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  emptyAction: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.gold, marginTop: spacing.xs },
  retryButton: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.card,
    backgroundColor: colors.obsidian,
  },
  retryButtonText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1.4,
    color: colors.parchment,
  },

  // Sparse footer
  sparseFooter: {
    marginTop: spacing.xxxl,
    marginHorizontal: sizes.screenPadding,
    marginBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  sparseRule: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sparseLine: { flex: 1, height: 1, backgroundColor: colors.gold, opacity: 0.3 },
  sparseLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1.8,
    color: colors.gold,
    opacity: 0.7,
  },
  sparseCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  sparseCardText: { fontFamily: fonts.sans, fontSize: 13, color: colors.muted, textAlign: 'center' },
  sparseCardAction: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.gold },
});
