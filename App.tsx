import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AuthNavigator from './src/navigation/AuthNavigator';
import { colors } from './src/constants/colors';
const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: colors.primary, background: colors.background, card: colors.background, text: colors.text, border: colors.border } };
export default function App() {
  return <SafeAreaProvider><NavigationContainer theme={theme}><StatusBar style="dark" /><AuthNavigator /></NavigationContainer></SafeAreaProvider>;
}
