import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
export default function AppLogo() {
  // 실제 로고가 준비되면 assets/logo.png를 사용하는 Image로 교체합니다.
  return <View style={styles.logo} accessibilityLabel="요기로드 임시 로고"><Text style={styles.text}>LOGO</Text></View>;
}
const styles = StyleSheet.create({
  logo: { width: 120, height: 120, borderRadius: 32, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  text: { color: colors.textSecondary, fontSize: 20, fontWeight: '700', letterSpacing: 2 },
});
