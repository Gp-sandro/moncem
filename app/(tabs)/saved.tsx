import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ListCard from '../../components/feed/ListCard';
import { ListSkeleton } from '../../components/ui/SkeletonCard';
import { colors, fonts, radius, sizes, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { fetchSparkedPosts } from '../../lib/queries';
import type { Post } from '../../lib/types';

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

export default function SavedScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const userId = session?.user.id ?? '';

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      setPosts(await fetchSparkedPosts(userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sparked posts');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const header = (
    <View style={styles.header}>
      <Text style={styles.title}>SPARKED</Text>
    </View>
  );

  if (loading && posts.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar style="dark" />
        {header}
        <ListSkeleton />
        <ListSkeleton />
        <ListSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />
      <FlatList<Post>
        data={posts}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        onRefresh={load}
        refreshing={loading}
        ListHeaderComponent={header}
        ListEmptyComponent={
          error ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyGlyph}>◈</Text>
              <Text style={styles.emptyTitle}>Could not load sparked posts.</Text>
              <Text style={styles.emptyHint}>Check your connection and try again.</Text>
              <Pressable onPress={load} hitSlop={8} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>RETRY</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyGlyph}>◈</Text>
              <Text style={styles.emptyTitle}>Nothing sparked yet.</Text>
              <Text style={styles.emptyHint}>
                When something inspires you, tap Sparked. Your collection lives here.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          posts.length > 0 && posts.length < 5
            ? <SparseFeedFooter onPost={() => router.push('/post/new' as never)} />
            : null
        }
        renderItem={({ item }) => <ListCard post={item} userId={userId} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.parchment },
  listContent: { paddingBottom: spacing.xxxl },
  header: {
    paddingHorizontal: sizes.screenPadding,
    height: 52,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontFamily: fonts.sansBold, fontSize: 14, letterSpacing: 2.5, color: colors.obsidian },

  emptyState: {
    paddingTop: spacing.xxxl * 2,
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: sizes.screenPadding,
  },
  emptyGlyph: { fontFamily: fonts.display, fontSize: 32, color: colors.gold, opacity: 0.55 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.obsidian, textAlign: 'center' },
  emptyHint: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  retryButton: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.obsidian,
    borderRadius: radius.card,
  },
  retryButtonText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1.4,
    color: colors.parchment,
  },

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
