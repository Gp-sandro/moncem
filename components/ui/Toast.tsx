import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ANIM } from '../../constants/animations';
import { colors, fonts, radius, spacing } from '../../constants/theme';
import type { NotificationType } from '../../lib/types';

type ToastType = NotificationType | 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (opts: { message: string; type?: ToastType }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TYPE_COLORS: Record<string, string> = {
  post_sparked: colors.reaction.sparked,
  post_validated: colors.reaction.validated,
  post_inthis: colors.reaction.inthis,
  new_message: colors.gold,
  new_conversation: colors.gold,
  new_ask: colors.gold,
  milestone_reached: colors.gold,
  weekly_digest: colors.gold,
  success: colors.gold,
  error: colors.errorRed,
  info: colors.accent.idea,
};

function ToastView({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-40);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    opacity.value = withTiming(1, { duration: ANIM.toastEnter });
    translateY.value = withSpring(0, ANIM.toastSpring);

    const dismiss = () => {
      opacity.value = withSequence(
        withDelay(ANIM.toastVisible, withTiming(0, { duration: ANIM.toastExit })),
      );
      translateY.value = withDelay(
        ANIM.toastVisible,
        withTiming(-20, { duration: ANIM.toastExit }, () => {
          runOnJS(onDismiss)();
        }),
      );
    };
    dismiss();
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const dotColor = TYPE_COLORS[toast.type] ?? colors.muted;

  function handleTap() {
    opacity.value = withTiming(0, { duration: ANIM.toastExit });
    translateY.value = withTiming(-20, { duration: ANIM.toastExit }, () => {
      runOnJS(onDismiss)();
    });
  }

  return (
    <Animated.View style={[styles.toast, animStyle, { top: insets.top + spacing.sm }]}>
      <Pressable style={styles.inner} onPress={handleTap}>
        <View style={[styles.typeBar, { backgroundColor: dotColor }]} />
        <Text style={styles.message} numberOfLines={2}>{toast.message}</Text>
        <Text style={styles.close}>×</Text>
      </Pressable>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<ToastItem[]>([]);
  const lastToastTime = useRef(0);
  const pendingRef = useRef<ToastItem[]>([]);

  const showToast = useCallback(({ message, type = 'info' }: { message: string; type?: ToastType }) => {
    const now = Date.now();
    const item: ToastItem = { id: String(now + Math.random()), message, type };

    if (now - lastToastTime.current < ANIM.toastDebounce) {
      pendingRef.current.push(item);
      return;
    }

    lastToastTime.current = now;
    setQueue((prev) => [...prev, item]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setQueue((prev) => {
      if (!prev.some((t) => t.id === id)) return prev;
      const next = prev.filter((t) => t.id !== id);
      // Flush one pending item if any
      if (pendingRef.current.length > 0) {
        const pending = pendingRef.current.shift()!;
        lastToastTime.current = Date.now();
        return [...next, pending];
      }
      return next;
    });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {queue.map((toast) => (
        <ToastView key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
      ))}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.chip,
    paddingRight: spacing.md,
    paddingVertical: spacing.sm,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 4,
  },
  typeBar: {
    width: 4,
    alignSelf: 'stretch',
    flexShrink: 0,
  },
  message: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.obsidian,
    flex: 1,
    lineHeight: 18,
  },
  close: {
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.muted,
    lineHeight: 20,
  },
});
