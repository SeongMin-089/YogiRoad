import type { NativeStackScreenProps } from '@react-navigation/native-stack';
export type AuthStackParamList = { Start: undefined; Login: undefined; SignUp: undefined };
export type AuthScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<AuthStackParamList, T>;
