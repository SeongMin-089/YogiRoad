import type { NativeStackScreenProps } from '@react-navigation/native-stack';
export type AuthStackParamList = { Start: undefined; Login: undefined; SignUp: undefined };
export type AuthScreenProps<T extends keyof AuthStackParamList> = CompositeScreenProps<NativeStackScreenProps<AuthStackParamList, T>, NativeStackScreenProps<RootStackParamList>>;
export type MainScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<BottomTabScreenProps<MainTabParamList, T>, NativeStackScreenProps<RootStackParamList>>;
export type MainTabParamList = {
  Home: undefined;
  Map: undefined;
  Sales: { storeId?: string } | undefined;
  Dashboard: undefined;
  MyPage: undefined;
};
export type RootStackParamList = { Auth: NavigatorScreenParams<AuthStackParamList> | undefined; Main: NavigatorScreenParams<MainTabParamList> | undefined };
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
