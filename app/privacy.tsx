import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, sizes, spacing } from '../constants/theme';

const sections = [
  {
    title: 'What we collect',
    body: 'Email, profile fields, building stage, interests, connect status, push token, posts, reactions, conversations, messages, notifications, reports, and beta feedback.',
  },
  {
    title: 'Why we collect it',
    body: 'To authenticate you, run the founder community, publish posts, deliver messages, send notifications, prevent abuse, and improve the beta.',
  },
  {
    title: 'Who can see it',
    body: 'Authenticated users see public profiles and posts. Conversation participants see their shared messages. Notifications and push tokens are private to you and server-side systems.',
  },
  {
    title: 'Delete or export',
    body: 'Settings includes account deletion and a data export request. Account deletion is permanent.',
  },
  {
    title: 'Contact',
    body: 'privacy@moncem.app',
  },
];

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.iconBtn}>
          <Feather name="arrow-left" size={20} color={colors.obsidian} />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Moncem privacy policy</Text>
        <Text style={styles.updated}>Last updated May 4, 2026</Text>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.body}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.parchment },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sizes.screenPadding,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconBtn: {
    width: sizes.tapTarget,
    height: sizes.tapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.obsidian,
  },
  content: {
    paddingHorizontal: sizes.screenPadding,
    paddingVertical: spacing.xxl,
    gap: spacing.xl,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.obsidian,
    lineHeight: 34,
  },
  updated: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.muted,
    marginTop: -spacing.lg,
  },
  section: { gap: spacing.xs },
  sectionTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 1.4,
    color: colors.gold,
    textTransform: 'uppercase',
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.obsidian,
    lineHeight: 22,
  },
});
