import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmptyState from '../../components/ui/EmptyState';
import { NotificationSkeleton } from '../../components/ui/SkeletonCard';
import { colors, fonts, radius, sizes, spacing } from '../../constants/theme';
import { useNotifications } from '../../hooks/useNotifications';
import type { AppNotification, NotificationType } from '../../lib/types';

type NotificationFilter = 'all' | 'sparks' | 'messages' | 'asks' | 'milestones';

const FILTERS: { key: NotificationFilter; label: string }[] = [
  { key: 'all', label: 'ALL' },
  { key: 'sparks', label: 'SPARKS' },
  { key: 'messages', label: 'MESSAGES' },
  { key: 'asks', label: 'ASKS' },
  { key: 'milestones', label: 'MILESTONES' },
];

const TYPE_DOT_COLOR: Record<NotificationType, string> = {
  post_sparked: colors.reaction.sparked,
  post_validated: colors.reaction.validated,
  post_inthis: colors.reaction.inthis,
  new_message: colors.gold,
  new_conversation: colors.gold,
  new_ask: colors.gold,
  milestone_reached: colors.gold,
  weekly_digest: colors.muted,
};

function formatRelativeTime(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function firstName(name: string): string {
  return name.split(' ')[0] || name;
}

function titleSnippet(title: string | undefined, words = 4): string {
  if (!title) return 'your post';
  return title.split(' ').slice(0, words).join(' ');
}

function nearestMilestone(count: number | undefined): number {
  const thresholds = [10, 25, 50, 100, 250];
  return thresholds.filter((t) => (count ?? 0) >= t).pop() ?? (count ?? 0);
}

function notificationText(n: AppNotification): string {
  const name = firstName(n.actor?.fullName || n.actor?.username || 'Someone');
  const snippet = titleSnippet(n.post?.title);
  switch (n.type) {
    case 'post_sparked':
      return `${name} sparked your post — ${snippet}`;
    case 'post_validated':
      return `${name} validated your post — ${snippet}`;
    case 'post_inthis':
      return `${name} is in this too — ${snippet}`;
    case 'new_message':
      return `${name} replied`;
    case 'new_conversation':
      return `${name} started a conversation`;
    case 'new_ask':
      return `${name} asked about ${n.post?.title ?? 'your post'}`;
    case 'milestone_reached':
      return `Your post on ${n.post?.title ?? 'your post'} reached ${nearestMilestone(n.post?.sparkedCount)} sparks`;
    case 'weekly_digest':
      return 'Your weekly digest is ready';
    default:
      return 'New notification';
  }
}

function matchesFilter(n: AppNotification, filter: NotificationFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'sparks') return ['post_sparked', 'post_validated', 'post_inthis'].includes(n.type);
  if (filter === 'messages') return ['new_message', 'new_conversation'].includes(n.type);
  if (filter === 'asks') return n.type === 'new_ask';
  if (filter === 'milestones') return n.type === 'milestone_reached';
  return true;
}

function NotificationRow({
  item,
  onPress,
}: {
  item: AppNotification;
  onPress: () => void;
}) {
  const dotColor = TYPE_DOT_COLOR[item.type] ?? colors.muted;
  const isSystem = item.type === 'milestone_reached' || item.type === 'weekly_digest';

  return (
    <Pressable
      style={[styles.row, !item.read && styles.rowUnread]}
      onPress={onPress}
    >
      <View style={[styles.avatar, isSystem && styles.systemAvatar, { borderColor: dotColor + '66' }]}>
        <Text style={styles.avatarText}>{isSystem ? '◈' : item.actor?.initials ?? '?'}</Text>
      </View>

      <Text style={[styles.rowText, item.read && styles.rowTextRead]} numberOfLines={2}>
        {notificationText(item)}
      </Text>

      <View style={styles.rowRight}>
        <Text style={styles.rowTime}>{formatRelativeTime(item.createdAt)}</Text>
        {!item.read && <View style={[styles.unreadDot, { backgroundColor: dotColor }]} />}
      </View>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, markRead, markAllRead, isLoading, reload } = useNotifications();
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');

  const filteredNotifications = useMemo(
    () => notifications.filter((item) => matchesFilter(item, activeFilter)),
    [notifications, activeFilter],
  );

  const handlePress = useCallback(async (item: AppNotification) => {
    if (!item.read) await markRead(item.id);
    if (item.conversationId) {
      router.push(`/inbox/${item.conversationId}` as never);
    } else if (item.postId) {
      router.push(`/post/${item.postId}` as never);
    }
  }, [markRead, router]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.obsidian} />
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
        <Pressable onPress={markAllRead} hitSlop={12} style={styles.markAllBtn}>
          <Text style={styles.markAllText}>Mark all read</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filters}
      >
        {FILTERS.map((filter) => {
          const active = activeFilter === filter.key;
          return (
            <Pressable
              key={filter.key}
              onPress={() => setActiveFilter(filter.key)}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{filter.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshing={isLoading}
        onRefresh={reload}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.skeletons}>
              <NotificationSkeleton />
              <NotificationSkeleton />
              <NotificationSkeleton />
              <NotificationSkeleton />
              <NotificationSkeleton />
            </View>
          ) : (
            <EmptyState
              headline="Quiet for now."
              sub="When someone sparks your post or messages you, it shows up here."
            />
          )
        }
        renderItem={({ item }) => (
          <NotificationRow item={item} onPress={() => handlePress(item)} />
        )}
      />
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
  backBtn: {
    width: sizes.tapTarget,
    height: sizes.tapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.obsidian,
    textAlign: 'center',
  },
  markAllBtn: {
    minWidth: 88,
    minHeight: sizes.tapTarget,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  markAllText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.gold,
  },
  filtersScroll: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filters: {
    paddingHorizontal: sizes.screenPadding,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.avatar,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.obsidian,
    borderColor: colors.obsidian,
  },
  filterText: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 1.2,
  },
  filterTextActive: {
    color: colors.goldLight,
    fontFamily: fonts.sansBold,
  },
  list: {
    flexGrow: 1,
  },
  skeletons: {
    paddingTop: spacing.md,
  },
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: sizes.screenPadding,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowUnread: {
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
    paddingLeft: sizes.screenPadding - 3,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.avatar,
    backgroundColor: colors.avatarBg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  systemAvatar: {
    backgroundColor: colors.goldLight,
  },
  avatarText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: colors.gold,
  },
  rowText: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.obsidian,
    lineHeight: 20,
  },
  rowTextRead: {
    color: colors.muted,
  },
  rowRight: {
    width: 44,
    minHeight: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  rowTime: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.bookmarkIdle,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
