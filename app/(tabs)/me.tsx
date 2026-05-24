import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
// ActivityIndicator kept for the modal save spinner
import { SafeAreaView } from 'react-native-safe-area-context';
import ListCard from '../../components/feed/ListCard';
import ProfileCompletion from '../../components/ui/ProfileCompletion';
import { ListSkeleton } from '../../components/ui/SkeletonCard';
import { useToast } from '../../components/ui/Toast';
import { colors, fonts, radius, sizes, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { displayName } from '../../lib/format';
import { fetchPostsByAuthor, fetchProfile, sendBetaFeedback, updateProfile } from '../../lib/queries';
import type { Post, Profile } from '../../lib/types';

function ProfileHeader({
  profile,
  postCount,
  onEdit,
  onFeedback,
  onSettings,
  onSignOut,
}: {
  profile: Profile;
  postCount: number;
  onEdit: () => void;
  onFeedback: () => void;
  onSettings: () => void;
  onSignOut: () => void;
}) {
  return (
    <View style={styles.profileHeader}>
      <View style={styles.topBar}>
        <Text style={styles.screenTitle}>ME</Text>
        <View style={styles.topActions}>
          <Pressable onPress={onFeedback} hitSlop={8} style={styles.iconBtn}>
            <Feather name="message-square" size={16} color={colors.muted} />
          </Pressable>
          <Pressable onPress={onSettings} hitSlop={8} style={styles.iconBtn}>
            <Feather name="settings" size={16} color={colors.muted} />
          </Pressable>
          <Pressable onPress={onEdit} hitSlop={8} style={styles.iconBtn}>
            <Feather name="edit-2" size={16} color={colors.muted} />
          </Pressable>
          <Pressable onPress={onSignOut} hitSlop={8} style={styles.iconBtn}>
            <Feather name="log-out" size={16} color={colors.muted} />
          </Pressable>
        </View>
      </View>

      {/* Hidden once profile is ≥80% complete */}
      <ProfileCompletion profile={profile} postCount={postCount} />

      <View style={styles.avatarRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{profile.initials}</Text>
        </View>
        <View style={styles.meta}>
          <Text style={styles.fullName}>{displayName(profile)}</Text>
          {profile.username ? (
            <Text style={styles.username}>@{profile.username}</Text>
          ) : null}
          <Text style={styles.postCount}>
            {postCount} {postCount === 1 ? 'post' : 'posts'}
          </Text>
        </View>
      </View>

      {profile.bio ? (
        <Text style={styles.bio}>{profile.bio}</Text>
      ) : (
        <Text style={styles.bioPlaceholder}>No bio yet — tap edit to add one.</Text>
      )}

      {profile.interests.length > 0 && (
        <View style={styles.interestsRow}>
          {profile.interests.map((tag) => (
            <View key={tag} style={styles.interestChip}>
              <Text style={styles.interestText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.divider} />
    </View>
  );
}

export default function MeScreen() {
  const { session, signOut } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const userId = session?.user.id ?? '';

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [p, ps] = await Promise.all([
        fetchProfile(userId),
        fetchPostsByAuthor(userId),
      ]);
      setProfile(p);
      setPosts(ps);
    } catch {
      // keep showing previous data
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function openEdit() {
    setEditName(profile?.fullName ?? '');
    setEditBio(profile?.bio ?? '');
    setSaveError(null);
    setEditVisible(true);
  }

  async function handleSave() {
    if (!userId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateProfile(userId, {
        fullName: editName.trim() || (profile?.fullName ?? ''),
        bio: editBio.trim() || null,
      });
      setProfile(updated);
      setEditVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      showToast({ message: 'Profile updated', type: 'success' });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    try { await signOut(); } catch { /* session cleared locally regardless */ }
  }

  async function handleSendFeedback() {
    if (!userId || feedbackSending) return;
    setFeedbackSending(true);
    setFeedbackError(null);
    try {
      await sendBetaFeedback(userId, feedbackText);
      setFeedbackText('');
      setFeedbackVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      showToast({ message: 'Feedback sent. Thank you.', type: 'success' });
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : 'Failed to send feedback');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setFeedbackSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />

      {loading && !profile ? (
        <>
          <ListSkeleton />
          <ListSkeleton />
          <ListSkeleton />
        </>
      ) : profile ? (
        <FlatList<Post>
          data={posts}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          onRefresh={load}
          refreshing={loading}
          ListHeaderComponent={
            <ProfileHeader
              profile={profile}
              postCount={posts.length}
              onEdit={openEdit}
              onFeedback={() => {
                setFeedbackError(null);
                setFeedbackVisible(true);
              }}
              onSettings={() => router.push('/settings' as never)}
              onSignOut={handleSignOut}
            />
          }
          ListEmptyComponent={
            loading ? null : (
              <View style={styles.empty}>
                <Text style={styles.emptyGlyph}>◈</Text>
                <Text style={styles.emptyTitle}>No stories yet.</Text>
                <Text style={styles.emptyHint}>
                  Your first journey, build, or idea will appear here.
                </Text>
                <Pressable onPress={() => router.push('/post/new' as never)} hitSlop={8}>
                  <Text style={styles.emptyAction}>Share your first →</Text>
                </Pressable>
              </View>
            )
          }
          renderItem={({ item }) => <ListCard post={item} userId={userId} />}
        />
      ) : (
        <View style={styles.errorState}>
          <Text style={styles.errorStateTitle}>Session expired</Text>
          <Text style={styles.errorStateHint}>Your account could not be loaded.</Text>
          <Pressable onPress={handleSignOut} style={styles.signOutBtn}>
            <Text style={styles.signOutBtnText}>SIGN OUT</Text>
          </Pressable>
        </View>
      )}

      <Modal
        visible={editVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditVisible(false)}
      >
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <KeyboardAvoidingView
            style={styles.modalInner}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalHeader}>
              <Pressable
                onPress={() => setEditVisible(false)}
                hitSlop={8}
                style={styles.modalCloseBtn}
              >
                <Feather name="x" size={20} color={colors.obsidian} />
              </Pressable>
              <Text style={styles.modalTitle}>EDIT PROFILE</Text>
              <Pressable
                onPress={handleSave}
                disabled={saving}
                hitSlop={8}
                style={styles.modalSaveBtn}
              >
                {saving ? (
                  <ActivityIndicator color={colors.gold} size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>SAVE</Text>
                )}
              </Pressable>
            </View>

            <View style={styles.modalForm}>
              {saveError ? (
                <Text style={styles.saveError}>{saveError}</Text>
              ) : null}

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>DISPLAY NAME</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Your name"
                  placeholderTextColor={colors.muted}
                  returnKeyType="next"
                  maxLength={100}
                  autoFocus
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>BIO</Text>
                <TextInput
                  style={[styles.fieldInput, styles.bioInput]}
                  value={editBio}
                  onChangeText={setEditBio}
                  placeholder="What do you build?"
                  placeholderTextColor={colors.muted}
                  multiline
                  textAlignVertical="top"
                  returnKeyType="done"
                  maxLength={300}
                />
                <Text style={styles.charCount}>{editBio.length}/300</Text>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={feedbackVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setFeedbackVisible(false)}
      >
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <KeyboardAvoidingView
            style={styles.modalInner}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalHeader}>
              <Pressable
                onPress={() => setFeedbackVisible(false)}
                hitSlop={8}
                style={styles.modalCloseBtn}
              >
                <Feather name="x" size={20} color={colors.obsidian} />
              </Pressable>
              <Text style={styles.modalTitle}>BETA FEEDBACK</Text>
              <Pressable
                onPress={handleSendFeedback}
                disabled={feedbackSending || feedbackText.trim().length < 5}
                hitSlop={8}
                style={styles.modalSaveBtn}
              >
                {feedbackSending ? (
                  <ActivityIndicator color={colors.gold} size="small" />
                ) : (
                  <Text
                    style={[
                      styles.modalSaveText,
                      feedbackText.trim().length < 5 && styles.modalSaveTextDisabled,
                    ]}
                  >
                    SEND
                  </Text>
                )}
              </Pressable>
            </View>

            <View style={styles.modalForm}>
              {feedbackError ? (
                <Text style={styles.saveError}>{feedbackError}</Text>
              ) : null}

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>WHAT SHOULD WE FIX OR IMPROVE?</Text>
                <TextInput
                  style={[styles.fieldInput, styles.feedbackInput]}
                  value={feedbackText}
                  onChangeText={(value) => {
                    setFeedbackText(value);
                    setFeedbackError(null);
                  }}
                  placeholder="Tell us what felt confusing, broken, slow, or surprisingly good."
                  placeholderTextColor={colors.muted}
                  multiline
                  textAlignVertical="top"
                  maxLength={2000}
                  autoFocus
                />
                <Text style={styles.charCount}>{feedbackText.length}/2000</Text>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.parchment },
  listContent: { paddingBottom: spacing.xxxl },
  profileHeader: {
    backgroundColor: colors.cardDark,
    paddingBottom: spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: sizes.screenPadding,
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  screenTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    letterSpacing: 2.5,
    color: colors.white,
  },
  topActions: { flexDirection: 'row', gap: spacing.xs },
  iconBtn: {
    width: sizes.tapTarget,
    height: sizes.tapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sizes.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.lg,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radius.avatar,
    backgroundColor: colors.avatarBg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.sansBold, fontSize: 24, color: colors.venture },
  meta: { gap: 3 },
  fullName: { fontFamily: fonts.display, fontSize: 28, color: colors.white, lineHeight: 34 },
  username: { fontFamily: fonts.sans, fontSize: 13, color: colors.ventureSoft },
  postCount: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.ventureSoft,
    marginTop: 2,
  },
  bio: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.white,
    lineHeight: 20,
    paddingHorizontal: sizes.screenPadding,
    paddingBottom: spacing.md,
  },
  bioPlaceholder: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.ventureSoft,
    paddingHorizontal: sizes.screenPadding,
    paddingBottom: spacing.md,
  },
  interestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingHorizontal: sizes.screenPadding,
    paddingBottom: spacing.md,
  },
  interestChip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.tag,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  interestText: { fontFamily: fonts.sans, fontSize: 11, color: colors.ventureSoft },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  empty: {
    paddingTop: spacing.xxxl * 2,
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: sizes.screenPadding,
  },
  emptyGlyph: { fontFamily: fonts.display, fontSize: 32, color: colors.gold, opacity: 0.55 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.obsidian },
  emptyHint: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  emptyAction: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.gold, marginTop: spacing.xs },
  // Modal
  modalSafe: { flex: 1, backgroundColor: colors.parchment },
  modalInner: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sizes.screenPadding,
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalCloseBtn: {
    width: sizes.tapTarget,
    height: sizes.tapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.obsidian,
  },
  modalSaveBtn: {
    width: sizes.tapTarget,
    height: sizes.tapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1.4,
    color: colors.gold,
  },
  modalSaveTextDisabled: { color: colors.muted },
  modalForm: {
    paddingHorizontal: sizes.screenPadding,
    paddingTop: spacing.xl,
    gap: spacing.xl,
  },
  saveError: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.errorRed,
    backgroundColor: colors.errorBg,
    padding: spacing.md,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  field: { gap: spacing.xs },
  fieldLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1.4,
    color: colors.muted,
  },
  fieldInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.obsidian,
    minHeight: 48,
  },
  bioInput: { minHeight: 100, paddingTop: spacing.md },
  feedbackInput: { minHeight: 160, paddingTop: spacing.md },
  charCount: { fontFamily: fonts.sans, fontSize: 11, color: colors.muted, textAlign: 'right', marginTop: 4 },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: sizes.screenPadding,
  },
  errorStateTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.obsidian },
  errorStateHint: { fontFamily: fonts.sans, fontSize: 14, color: colors.muted },
  signOutBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.obsidian,
    borderRadius: radius.card,
  },
  signOutBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 2,
    color: colors.parchment,
  },
});
