import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius, sizes, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';

export default function WelcomeScreen() {
  const router = useRouter();
  const { signOut } = useAuth();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.body}>
        <View style={styles.glyphWrap}>
          <Text style={styles.glyph}>◈</Text>
        </View>

        <View style={styles.copy}>
          <Text style={styles.heading}>Your founder{'\n'}operating room.</Text>
          <Text style={styles.sub}>
            Share what is moving, learn from builders in motion, and turn proof into the next conversation.
          </Text>
        </View>

        <View style={styles.pillars}>
          {[
            { icon: '◆', label: 'Spark founder stories' },
            { icon: '↑', label: 'Validate what is working' },
            { icon: '○', label: 'Get on the right conversations' },
          ].map(({ icon, label }) => (
            <View key={label} style={styles.pillar}>
              <Text style={styles.pillarIcon}>{icon}</Text>
              <Text style={styles.pillarLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.button} onPress={() => router.push('/onboarding/identity')}>
          <Text style={styles.buttonText}>ENTER MONCEM →</Text>
        </Pressable>
        <Pressable onPress={() => signOut()} hitSlop={12} style={styles.signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/privacy' as never)} hitSlop={8}>
          <Text style={styles.privacyText}>Privacy policy</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.parchment },
  body: {
    flex: 1,
    paddingHorizontal: sizes.screenPadding,
    paddingTop: spacing.xxxl,
    gap: spacing.xxxl,
  },
  glyphWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.card,
    backgroundColor: colors.ventureSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontFamily: fonts.display,
    fontSize: 42,
    color: colors.venture,
  },
  copy: { gap: spacing.md },
  heading: {
    fontFamily: fonts.display,
    fontSize: 38,
    color: colors.obsidian,
    lineHeight: 42,
  },
  sub: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.muted,
    lineHeight: 24,
  },
  pillars: { gap: spacing.md },
  pillar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pillarIcon: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.venture,
    width: 20,
    textAlign: 'center',
  },
  pillarLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.obsidian,
  },
  footer: {
    paddingHorizontal: sizes.screenPadding,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
    alignItems: 'center',
  },
  button: {
    height: sizes.tapTarget + 8,
    backgroundColor: colors.obsidian,
    borderRadius: radius.avatar,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 2,
    color: colors.white,
  },
  signOut: { paddingVertical: spacing.xs },
  signOutText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.muted,
  },
  privacyText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.muted,
  },
});
