import {
  DMSerifDisplay_400Regular,
  DMSerifDisplay_400Regular_Italic,
} from '@expo-google-fonts/dm-serif-display';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  Lora_400Regular,
  Lora_400Regular_Italic,
} from '@expo-google-fonts/lora';
import { useFonts } from 'expo-font';
import { useRouter, useSegments, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { ToastProvider } from '../components/ui/Toast';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { NotificationsProvider } from '../hooks/useNotifications';
import { addNotificationResponseListener, registerForPushNotifications } from '../lib/notifications';
import { savePushToken } from '../lib/queries';

SplashScreen.preventAutoHideAsync();

function RootLayoutInner() {
  const { session, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const splashHidden = useRef(false);
  const pushRegistered = useRef(false);

  const [fontsLoaded, fontError] = useFonts({
    DMSerifDisplay_400Regular,
    DMSerifDisplay_400Regular_Italic,
    Lora_400Regular,
    Lora_400Regular_Italic,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_700Bold,
  });

  const ready = (fontsLoaded || !!fontError) && !authLoading;

  useEffect(() => {
    if (ready && !splashHidden.current) {
      splashHidden.current = true;
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  // Register push token once after session confirmed
  useEffect(() => {
    if (!session?.user.id || pushRegistered.current) return;
    pushRegistered.current = true;
    registerForPushNotifications()
      .then((token) => {
        if (token) return savePushToken(session.user.id, token);
      })
      .catch(() => {});
  }, [session?.user.id]);

  // Navigate to the right screen when user taps a push notification
  useEffect(() => {
    return addNotificationResponseListener((data) => {
      if (data?.conversationId) {
        router.push(`/inbox/${String(data.conversationId)}` as never);
      } else if (data?.postId) {
        router.push(`/post/${String(data.postId)}` as never);
      }
    });
  }, [router]);

  useEffect(() => {
    if (!ready) return;

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';
    const inTabs = segments[0] === '(tabs)';
    const secondSegment = (segments as string[])[1];

    if (!session) {
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }

    // Came from register/login — wait for profile then route
    if (!profile) return;

    const verified = !!session.user.email_confirmed_at || profile.emailVerified;
    const onboarded = profile.onboardingCompleted || profile.onboarded;

    if (!verified) {
      if (secondSegment !== 'verify') router.replace('/(auth)/verify');
      return;
    }

    if (inOnboarding && onboarded) {
      router.replace('/(tabs)');
      return;
    }

    if (inAuth) {
      router.replace(onboarded ? '/(tabs)' : '/onboarding/welcome');
      return;
    }

    // On tabs with a session but no profile yet — wait, don't assume unboarded
    if (inTabs && !onboarded) {
      router.replace('/onboarding/welcome');
    }
  }, [ready, session, segments, profile]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="inbox" />
        <Stack.Screen name="settings/index" />
        <Stack.Screen name="settings/delete-account" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="post/[id]" />
        <Stack.Screen name="post/new" />
        <Stack.Screen name="post/edit/[id]" />
        <Stack.Screen name="profile/[id]" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <NotificationsProvider>
        <ToastProvider>
          <RootLayoutInner />
        </ToastProvider>
      </NotificationsProvider>
    </AuthProvider>
  );
}
