import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToast } from '../../components/ui/Toast';
import { colors, fonts, radius, sizes, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { createPost, updatePost, uploadCover } from '../../lib/queries';
import type { PostType } from '../../lib/types';

const POST_TYPES: { value: PostType; label: string }[] = [
  { value: 'journey', label: 'JOURNEY' },
  { value: 'build', label: 'BUILD' },
  { value: 'idea', label: 'IDEA' },
  { value: 'demo', label: 'DEMO' },
];

function parseTags(value: string): string[] {
  return [...new Set(value.split(',').map((tag) => tag.trim()).filter(Boolean))];
}

export default function NewPostScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { showToast } = useToast();
  const userId = session?.user.id ?? '';

  const [type, setType] = useState<PostType | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [milestone, setMilestone] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [coverUri, setCoverUri] = useState<string | null>(null);

  const [typeError, setTypeError] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const hasUnsavedChanges =
    !!type ||
    title.trim().length > 0 ||
    body.trim().length > 0 ||
    milestone.trim().length > 0 ||
    tagsText.trim().length > 0 ||
    !!coverUri;
  const canPublish = !!type && title.trim().length > 0 && !submitting;

  const confirmDiscard = useCallback(() => {
    if (submitting) return;
    if (!hasUnsavedChanges) {
      router.back();
      return;
    }
    Alert.alert('Discard post?', 'Your draft will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  }, [hasUnsavedChanges, router, submitting]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (submitting) return true;
      if (!hasUnsavedChanges) return false;
      confirmDiscard();
      return true;
    });
    return () => subscription.remove();
  }, [confirmDiscard, hasUnsavedChanges, submitting]);

  async function pickCover() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) setCoverUri(result.assets[0].uri);
  }

  async function handlePublish() {
    const noType = !type;
    const noTitle = !title.trim();
    const tags = parseTags(tagsText);
    setTypeError(noType);
    setTitleError(noTitle);
    setTagError(tags.length > 5 ? 'Use up to 5 tags.' : null);
    if (noType || noTitle || tags.length > 5 || !userId) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      let post = await createPost(userId, {
        title: title.trim(),
        type: type!,
        excerpt: null,
        body: body.trim() || null,
        milestone: milestone.trim() || null,
        tags,
        coverUrl: null,
      });
      if (coverUri) {
        const coverUrl = await uploadCover(userId, coverUri, post.id);
        post = await updatePost(post.id, userId, {
          title: title.trim(),
          type: type!,
          excerpt: null,
          body: body.trim() || null,
          milestone: milestone.trim() || null,
          tags,
          coverUrl,
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      showToast({ message: 'Post published', type: 'success' });
      router.replace(`/post/${post.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to publish');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable onPress={confirmDiscard} hitSlop={8} style={styles.headerBtn}>
          <Feather name="x" size={20} color={colors.obsidian} />
        </Pressable>
        <Text style={styles.headerTitle}>NEW DISPATCH</Text>
        <Pressable
          onPress={handlePublish}
          disabled={!canPublish}
          style={[styles.headerBtn, !canPublish && styles.publishDisabled]}
        >
          {submitting ? (
            <ActivityIndicator color={colors.gold} size="small" />
          ) : (
            <Text style={styles.publishBtn}>PUBLISH</Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {submitError ? (
            <View style={styles.submitError}>
              <Text style={styles.submitErrorText}>{submitError}</Text>
            </View>
          ) : null}

          {/* Type selector */}
          <View style={styles.typeSection}>
            <View style={styles.typeRow}>
              {POST_TYPES.map(({ value, label }) => (
                <Pressable
                  key={value}
                  style={[
                    styles.typeBtn,
                    type === value && { backgroundColor: colors.accent[value], borderColor: colors.accent[value] },
                    typeError && !type && styles.typeBtnError,
                  ]}
                  onPress={() => { setType(value); setTypeError(false); }}
                >
                  <Text style={[styles.typeBtnText, type === value && styles.typeBtnActiveText]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {typeError ? <Text style={styles.inlineError}>Choose a type</Text> : null}
          </View>

          <View style={styles.divider} />

          {/* Title */}
          <TextInput
            style={[styles.titleInput, titleError && styles.titleInputError]}
            value={title}
            onChangeText={(v) => { setTitle(v); setTitleError(false); }}
            placeholder="Title your story"
            placeholderTextColor={titleError ? colors.inputErrorPlaceholder : colors.muted}
            autoFocus
            returnKeyType="next"
            multiline
            maxLength={150}
          />

          {/* Body */}
          <TextInput
            style={styles.bodyInput}
            value={body}
            onChangeText={setBody}
            placeholder="Write what really happened. The struggles. The decisions. The numbers."
            placeholderTextColor={colors.muted}
            multiline
            textAlignVertical="top"
            maxLength={10000}
          />
          {body.length > 0 && (
            <View style={styles.bodyCounter}>
              <Text style={styles.bodyCounterText}>{body.length.toLocaleString()}/10,000</Text>
            </View>
          )}

          <View style={styles.divider} />

          {/* Optional fields */}
          <View style={styles.optionals}>
            <Text style={styles.optionalLabel}>OPTIONAL</Text>

            {/* Cover */}
            <Pressable onPress={pickCover} style={styles.optionalRow}>
              {coverUri ? (
                <Image source={{ uri: coverUri }} style={styles.coverThumb} contentFit="cover" />
              ) : (
                <View style={styles.coverPlaceholder}>
                  <Feather name="image" size={16} color={colors.muted} />
                </View>
              )}
              <Text style={styles.optionalRowText}>
                {coverUri ? 'Cover image added' : 'Add cover image'}
              </Text>
              {coverUri ? (
                <Pressable
                  onPress={() => setCoverUri(null)}
                  hitSlop={8}
                  style={styles.removeBtn}
                >
                  <Feather name="x" size={14} color={colors.muted} />
                </Pressable>
              ) : (
                <Feather name="chevron-right" size={16} color={colors.muted} />
              )}
            </Pressable>

            {/* Milestone */}
            <View style={styles.optionalInputRow}>
              <Feather name="award" size={16} color={colors.muted} style={styles.optionalIcon} />
              <TextInput
                style={styles.optionalInput}
                value={milestone}
                onChangeText={setMilestone}
                placeholder="Milestone (e.g. $8k MRR)"
                placeholderTextColor={colors.muted}
                returnKeyType="next"
                maxLength={150}
              />
            </View>

            {/* Tags */}
            <View style={styles.optionalInputRow}>
              <Feather name="hash" size={16} color={colors.muted} style={styles.optionalIcon} />
              <TextInput
                style={styles.optionalInput}
                value={tagsText}
                onChangeText={(value) => {
                  setTagsText(value);
                  setTagError(null);
                }}
                placeholder="Tags (AI, SaaS, Fintech)"
                placeholderTextColor={colors.muted}
                autoCapitalize="words"
                returnKeyType="done"
                maxLength={200}
              />
            </View>
            {tagError ? <Text style={styles.inlineError}>{tagError}</Text> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.parchment,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: sizes.screenPadding,
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBtn: {
    minWidth: sizes.tapTarget,
    height: sizes.tapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishDisabled: {
    opacity: 0.4,
  },
  headerTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.obsidian,
  },
  publishBtn: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1.4,
    color: colors.gold,
  },
  submitError: {
    margin: sizes.screenPadding,
    marginBottom: 0,
    backgroundColor: colors.errorBg,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  submitErrorText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.errorRed,
  },
  typeSection: {
    paddingHorizontal: sizes.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeBtn: {
    width: '48.5%',
    minHeight: 78,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  typeBtnError: {
    borderColor: colors.errorRed,
  },
  typeBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 0.8,
    color: colors.muted,
  },
  typeBtnActiveText: {
    color: colors.white,
  },
  inlineError: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.errorRed,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: sizes.screenPadding,
  },
  titleInput: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.obsidian,
    lineHeight: 34,
    paddingHorizontal: sizes.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    minHeight: 80,
  },
  titleInputError: {
    color: colors.errorRed,
  },
  bodyInput: {
    fontFamily: fonts.serifBody,
    fontSize: 18,
    color: colors.obsidian,
    lineHeight: 28,
    paddingHorizontal: sizes.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    minHeight: 160,
    textAlignVertical: 'top',
  },
  bodyCounter: {
    paddingHorizontal: sizes.screenPadding,
    paddingBottom: spacing.sm,
    alignItems: 'flex-end',
  },
  bodyCounterText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.muted,
  },
  optionals: {
    paddingHorizontal: sizes.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.xs,
  },
  optionalLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1.4,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  optionalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  coverThumb: {
    width: 40,
    height: 28,
    borderRadius: radius.tag,
  },
  coverPlaceholder: {
    width: 40,
    height: 28,
    borderRadius: radius.tag,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionalRowText: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.obsidian,
  },
  removeBtn: {
    padding: spacing.xs,
  },
  optionalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionalIcon: {
    marginRight: spacing.md,
  },
  optionalInput: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.obsidian,
    height: 40,
  },
});
