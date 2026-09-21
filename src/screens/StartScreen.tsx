import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppLogo from '../components/AppLogo';
import PrimaryButton from '../components/PrimaryButton';
import { colors } from '../constants/colors';
import type { AuthScreenProps } from '../types/navigation';
export default function StartScreen({ navigation }: AuthScreenProps<'Start'>) {
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.hero}><AppLogo /><Text accessibilityRole="header" style={styles.title}>요기로드</Text><Text style={styles.description}>영업 대상 발굴부터 계약 관리까지 한 번에</Text></View>
    <View style={styles.actions}><PrimaryButton title="로그인" onPress={() => navigation.navigate('Login')} /><PrimaryButton title="회원가입" variant="secondary" onPress={() => navigation.navigate('SignUp')} /></View>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: 24, width: '100%', maxWidth: 520, alignSelf: 'center' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },
  title: { fontSize: 34, fontWeight: '800', color: colors.text, marginTop: 28, marginBottom: 12 },
  description: { fontSize: 14, lineHeight: 22, textAlign: 'center', color: colors.textSecondary },
  actions: { gap: 12, paddingBottom: 12 },
});
