import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { NotificationType } from './types';

// Expo Go on SDK 53+ removed Android remote push support; many notification APIs
// throw or no-op there. Detect once and skip unsupported calls.
const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

// Module-level handler config — wrapped so a throw in Expo Go can't take down the app
if (!IS_EXPO_GO) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: true,
      }),
    });
  } catch {
    // ignore — environment doesn't support notifications
  }
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (IS_EXPO_GO) return null;
  if (!Device.isDevice) return null;

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    const token = (await Notifications.getExpoPushTokenAsync()).data;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }
    return token;
  } catch {
    return null;
  }
}

function firstName(name: string): string {
  return name.split(' ')[0] || name;
}

function titleSnippet(title: string | undefined, words = 4): string {
  if (!title) return 'your story';
  const parts = title.split(' ').slice(0, words).join(' ');
  return parts;
}

function nearestMilestone(count: number | undefined): number {
  const thresholds = [10, 25, 50, 100, 250];
  return thresholds.filter((t) => (count ?? 0) >= t).pop() ?? (count ?? 0);
}

export function buildNotificationContent(
  type: NotificationType,
  actorName: string,
  postTitle?: string,
  sparkedCount?: number,
): { title: string; body: string } {
  const fName = firstName(actorName);
  const snippet = titleSnippet(postTitle);
  switch (type) {
    case 'post_sparked':
      return {
        title: 'Someone sparked your story',
        body: `${fName} sparked your story about ${snippet}`,
      };
    case 'post_validated':
      return {
        title: 'Someone validated your story',
        body: `${fName} validated your story about ${snippet}`,
      };
    case 'post_inthis':
      return {
        title: "Someone's in this too",
        body: `${fName} is in this too — ${snippet}`,
      };
    case 'new_message':
      return {
        title: 'New reply',
        body: `${fName} replied to your conversation`,
      };
    case 'new_conversation':
      return {
        title: 'New conversation',
        body: `${fName} started a conversation with you`,
      };
    case 'new_ask':
      return {
        title: 'New question',
        body: `${fName} asked you something`,
      };
    case 'milestone_reached': {
      const n = nearestMilestone(sparkedCount);
      return {
        title: 'Your story hit a milestone',
        body: `Your post on "${snippet}" just reached ${n} sparks`,
      };
    }
    case 'weekly_digest':
      // The Edge Function passes a pre-built body; this is a fallback.
      return {
        title: 'Your weekly digest',
        body: 'New stories this week match your interests',
      };
    default:
      return { title: 'Moncem', body: 'Something happened' };
  }
}

export async function scheduleLocalNotification(
  type: NotificationType,
  actorName: string,
  postTitle?: string,
  sparkedCount?: number,
): Promise<void> {
  if (IS_EXPO_GO) return;
  try {
    const content = buildNotificationContent(type, actorName, postTitle, sparkedCount);
    await Notifications.scheduleNotificationAsync({
      content: { title: content.title, body: content.body },
      trigger: null,
    });
  } catch {
    // ignore — scheduling unsupported in current environment
  }
}

export async function setBadgeCount(count: number): Promise<void> {
  if (IS_EXPO_GO) return;
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch {
    // ignore
  }
}

export function addNotificationResponseListener(
  callback: (data: Record<string, unknown>) => void,
): () => void {
  if (IS_EXPO_GO) return () => {};
  try {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = (response.notification.request.content.data ?? {}) as Record<string, unknown>;
      callback(data);
    });
    return () => sub.remove();
  } catch {
    return () => {};
  }
}
