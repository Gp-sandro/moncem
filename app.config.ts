import type { ConfigContext, ExpoConfig } from 'expo/config';

declare const process: {
  env: Record<string, string | undefined>;
};

function uniquePlugins(plugins: NonNullable<ExpoConfig['plugins']>): NonNullable<ExpoConfig['plugins']> {
  const seen = new Set<string>();
  return plugins.filter((plugin) => {
    const name = Array.isArray(plugin) ? String(plugin[0]) : String(plugin);
    if (seen.has(name)) return false;
    seen.add(name);
    return true;
  });
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const reversedGoogleClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_REVERSED_CLIENT_ID;
  const existingInfoPlist = config.ios?.infoPlist ?? {};
  const existingUrlTypes = Array.isArray(existingInfoPlist.CFBundleURLTypes)
    ? existingInfoPlist.CFBundleURLTypes
    : [];

  return {
    ...config,
    name: config.name ?? 'moncem',
    slug: config.slug ?? 'moncem',
    scheme: config.scheme ?? 'moncem',
    ios: {
      ...config.ios,
      bundleIdentifier: config.ios?.bundleIdentifier ?? 'com.moncem.app',
      usesAppleSignIn: true,
      infoPlist: {
        ...existingInfoPlist,
        ...(reversedGoogleClientId
          ? {
              CFBundleURLTypes: [
                ...existingUrlTypes,
                {
                  CFBundleURLSchemes: [reversedGoogleClientId],
                },
              ],
            }
          : {}),
      },
    },
    plugins: uniquePlugins([
      ...(config.plugins ?? []),
      'expo-apple-authentication',
      '@react-native-google-signin/google-signin',
    ]),
  };
};
