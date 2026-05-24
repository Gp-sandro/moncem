import Feather from '@expo/vector-icons/Feather';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs, useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius, sizes, spacing } from '../../constants/theme';

type FeatherName = ComponentProps<typeof Feather>['name'];

type TabConfig = {
  name: string;
  label: string;
  icon: FeatherName;
  isFab?: boolean;
};

const TAB_CONFIG: TabConfig[] = [
  { name: 'index', label: 'FEED', icon: 'home' },
  { name: 'explore', label: 'EXPLORE', icon: 'search' },
  { name: 'post', label: 'POST', icon: 'plus', isFab: true },
  { name: 'saved', label: 'SPARKED', icon: 'zap' },
  { name: 'me', label: 'ME', icon: 'user' },
];

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      {state.routes.map((route, index) => {
        const tab = TAB_CONFIG[index];
        if (!tab) return null;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        if (tab.isFab) {
          return (
            <Pressable key={route.key} onPress={() => router.push('/post/new')} style={styles.fabWrapper} hitSlop={8}>
              <View style={styles.fab}>
                <Feather name="plus" size={20} color={colors.white} />
              </View>
              <Text style={styles.fabLabel}>{tab.label}</Text>
            </Pressable>
          );
        }

        return (
          <Pressable key={route.key} onPress={onPress} style={styles.tabItem} hitSlop={8}>
            <Feather
              name={tab.icon}
              size={18}
              color={isFocused ? colors.obsidian : colors.tabInactive}
            />
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Feed' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="post" options={{ title: 'Post' }} />
      <Tabs.Screen name="saved" options={{ title: 'Saved' }} />
      <Tabs.Screen name="me" options={{ title: 'Me' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.parchment,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    alignItems: 'flex-start',
    paddingHorizontal: spacing.sm,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minHeight: sizes.tapTarget,
  },
  tabLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 0.7,
    color: colors.tabInactive,
  },
  tabLabelActive: {
    color: colors.obsidian,
    fontFamily: fonts.sansBold,
  },
  fabWrapper: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.xs,
    gap: 3,
  },
  fab: {
    width: sizes.fab,
    height: sizes.fab,
    borderRadius: radius.avatar,
    backgroundColor: colors.obsidian,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
    borderWidth: 3,
    borderColor: colors.parchment,
  },
  fabLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 0.7,
    color: colors.tabInactive,
  },
});
