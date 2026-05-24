import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { ListSkeleton } from '../../components/ui/SkeletonCard';
import { colors, fonts, radius, sizes, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useConversations } from '../../hooks/useInbox';
import type { Conversation } from '../../lib/types';

function formatTime(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'now';
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function ConversationRow({ item, onPress }: { item: Conversation; onPress: () => void }) {
  const other = item.otherParticipant;

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{other.initials}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.name} numberOfLines={1}>
          {other.fullName || other.username}
        </Text>
        {item.lastMessage ? (
          <Text style={styles.preview} numberOfLines={1}>{item.lastMessage}</Text>
        ) : null}
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.time}>{formatTime(item.lastMessageAt)}</Text>
      </View>
    </Pressable>
  );
}

export default function InboxScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const userId = session?.user.id ?? '';
  const { conversations, loading, error, reload } = useConversations(userId);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.obsidian} />
        </Pressable>
        <Text style={styles.title}>Inbox</Text>
        <View style={styles.backBtn} />
      </View>

      {loading && conversations.length === 0 ? (
        <>
          <ListSkeleton />
          <ListSkeleton />
          <ListSkeleton />
          <ListSkeleton />
        </>
      ) : (
        <FlatList<Conversation>
          data={conversations}
          keyExtractor={(conversation) => conversation.id}
          onRefresh={reload}
          refreshing={loading}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            error ? (
              <ErrorState message={error} onRetry={reload} />
            ) : (
              <EmptyState
                headline="No conversations yet."
                sub="When you reach out to a builder, your conversation appears here."
              />
            )
          }
          renderItem={({ item }) => (
            <ConversationRow
              item={item}
              onPress={() => router.push(`/inbox/${item.id}` as never)}
            />
          )}
        />
      )}
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
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.obsidian,
  },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sizes.screenPadding,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
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
  avatarText: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.gold },
  rowBody: { flex: 1, minWidth: 0, gap: spacing.xs },
  name: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.obsidian },
  preview: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted },
  rowRight: {
    width: 44,
    minHeight: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  time: { fontFamily: fonts.sans, fontSize: 11, color: colors.muted },
});
