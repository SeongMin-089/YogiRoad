import { createNativeStackNavigator } from '@react-navigation/native-stack';
import StartScreen from '../screens/StartScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import type { AuthStackParamList } from '../types/navigation';
const Stack = createNativeStackNavigator<AuthStackParamList>();
export default function AuthNavigator() {
  return <Stack.Navigator initialRouteName="Start" screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Start" component={StartScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="SignUp" component={SignUpScreen} />
  </Stack.Navigator>;
}
