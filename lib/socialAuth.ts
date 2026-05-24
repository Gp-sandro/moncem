import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { supabase } from './supabase';

declare const process: {
  env: Record<string, string | undefined>;
};

GoogleSignin.configure({
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

type GoogleSignInResult = {
  idToken?: string | null;
  data?: {
    idToken?: string | null;
  };
};

export function isSocialAuthCancel(error: unknown): boolean {
  if (isErrorWithCode(error)) {
    return error.code === statusCodes.SIGN_IN_CANCELLED;
  }

  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code?: unknown }).code);
    return code === 'ERR_REQUEST_CANCELED' || code === 'ERR_CANCELED';
  }

  return false;
}

export async function signInWithApple(): Promise<void> {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple Sign-In is only available on iOS.');
  }

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error('Apple Sign-In failed: no identity token.');
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });

  if (error) throw error;
}

export async function signInWithGoogle(): Promise<void> {
  if (Platform.OS === 'android') {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }

  const result = (await GoogleSignin.signIn()) as GoogleSignInResult;
  const idToken = result.idToken ?? result.data?.idToken ?? null;

  if (!idToken) {
    throw new Error('Google Sign-In failed: no ID token.');
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });

  if (error) throw error;
}
