import type { ConfigContext, ExpoConfig } from 'expo/config';

function toGoogleIosUrlScheme(clientId: string): string {
  const suffix = '.apps.googleusercontent.com';
  const id = clientId.endsWith(suffix) ? clientId.slice(0, -suffix.length) : clientId;
  return `com.googleusercontent.apps.${id}`;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  const googleServiceInfoPlist = process.env.GOOGLE_SERVICE_INFO_PLIST?.trim();
  const googleServicesJson = process.env.GOOGLE_SERVICES_JSON?.trim();
  const hasIosFirebaseNativeConfig = Boolean(
    googleServiceInfoPlist
    || config.ios?.googleServicesFile,
  );
  const googlePlugin = !hasIosFirebaseNativeConfig && iosClientId
    ? [
      '@react-native-google-signin/google-signin',
      { iosUrlScheme: toGoogleIosUrlScheme(iosClientId) },
    ]
    : '@react-native-google-signin/google-signin';

  return {
    ...config,
    name: config.name ?? 'YogiRoad',
    slug: config.slug ?? 'YogiRoad',
    ios: {
      ...config.ios,
      ...(googleServiceInfoPlist ? { googleServicesFile: googleServiceInfoPlist } : {}),
    },
    android: {
      ...config.android,
      ...(googleServicesJson ? { googleServicesFile: googleServicesJson } : {}),
    },
    plugins: [
      ...(config.plugins ?? []).filter(plugin => {
        const name = Array.isArray(plugin) ? plugin[0] : plugin;
        return name !== '@react-native-google-signin/google-signin' && name !== 'expo-font';
      }),
      'expo-font',
      googlePlugin,
    ],
  } as ExpoConfig;
};
