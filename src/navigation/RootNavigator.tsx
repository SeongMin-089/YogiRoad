import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { colors } from '../constants/colors';
import type { RootStackParamList } from '../types/navigation';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <Stack.Navigator key={user ? 'authenticated' : 'anonymous'} screenOptions={{ headerShown: false }}>
      {user
        ? <Stack.Screen name="Main" component={MainNavigator} />
        : <Stack.Screen name="Auth" component={AuthNavigator} />}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
