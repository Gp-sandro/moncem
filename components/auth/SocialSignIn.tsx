import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, fonts, radius, sizes, spacing } from '../../constants/theme';
import { mapAuthError } from '../../lib/authErrors';
import {
  isSocialAuthCancel,
  signInWithApple,
  signInWithGoogle,
} from '../../lib/socialAuth';

type Provider = 'apple' | 'google';

interface SocialSignInProps {
  showPrivacyLink?: boolean;
}

export function SocialSignIn({ showPrivacyLink = false }: SocialSignInProps) {
  const router = useRouter();
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(provider: Provider): Promise<void> {
    if (loadingProvider) return;
    setError(null);
    setLoadingProvider(provider);
    try {
      if (provider === 'apple') {
        await signInWithApple();
      } else {
        await signInWithGoogle();
      }
    } catch (err) {
      if (!isSocialAuthCancel(err)) {
        setError(mapAuthError(err instanceof Error ? err.message : 'Sign in failed.'));
      }
    } finally {
      setLoadingProvider(null);
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.buttons}>
        {Platform.OS === 'ios' ? (
          <View style={styles.appleButtonWrap}>
            {loadingProvider === 'apple' ? (
              <View style={styles.appleLoading}>
                <ActivityIndicator color={colors.white} size="small" />
              </View>
            ) : (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={14}
                style={styles.appleButton}
                onPress={() => { run('apple'); }}
              />
            )}
          </View>
        ) : null}

        <Pressable
          style={styles.googleButton}
          onPress={() => { run('google'); }}
          disabled={!!loadingProvider}
        >
          {loadingProvider === 'google' ? (
            <ActivityIndicator color={colors.obsidian} size="small" />
          ) : (
            <>
              <View style={styles.googleGlyph}>
                <Text style={styles.googleGlyphText}>G</Text>
              </View>
              <Text style={styles.googleText}>Continue with Google</Text>
            </>
          )}
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {showPrivacyLink ? (
        <Pressable onPress={() => router.push('/privacy' as never)} hitSlop={8}>
          <Text style={styles.privacyText}>
            By continuing, you agree to Moncem's privacy policy.
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  buttons: { gap: spacing.sm },
  appleButtonWrap: {
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
  },
  appleButton: {
    width: '100%',
    height: 48,
  },
  appleLoading: {
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.obsidian,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButton: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  googleGlyph: {
    width: 22,
    height: 22,
    borderRadius: radius.avatar,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleGlyphText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: colors.venture,
  },
  googleText: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.obsidian,
  },
  errorBox: {
    backgroundColor: colors.errorBg,
    borderRadius: radius.card,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.errorRed,
  },
  errorText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.errorRed,
    lineHeight: 18,
  },
  privacyText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.muted,
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: sizes.screenPadding,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.muted,
  },
});
