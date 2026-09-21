import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import AuthScreenLayout, { authStyles } from '../components/AuthScreenLayout';
import FormInput from '../components/FormInput';
import PrimaryButton from '../components/PrimaryButton';
import { colors } from '../constants/colors';
import type { AuthScreenProps } from '../types/navigation';
export default function LoginScreen({ navigation }: AuthScreenProps<'Login'>) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('')
  return <AuthScreenLayout title="로그인" onBack={() => navigation.goBack()} footer={
    <View style={authStyles.footerRow}><Text style={authStyles.muted}>계정이 없으신가요?</Text><Pressable accessibilityRole="button" style={authStyles.textButton} onPress={() => navigation.replace('SignUp')}><Text style={authStyles.link}>회원가입</Text></Pressable></View>
  }>
    <FormInput label="이메일" placeholder="이메일을 입력해 주세요" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
    <FormInput label="비밀번호" placeholder="비밀번호를 입력해 주세요" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="current-password" />
    <PrimaryButton title="로그인" onPress={() => Alert.alert('로그인', '로그인 기능은 준비 중입니다.')} />
    <Pressable accessibilityRole="button" style={styles.forgot} onPress={() => Alert.alert('비밀번호 찾기', '비밀번호 찾기 기능은 준비 중입니다.')}><Text style={authStyles.muted}>비밀번호를 잊으셨나요?</Text></Pressable>
    <View style={styles.divider}><View style={styles.line} /><Text style={authStyles.muted}>또는</Text><View style={styles.line} /></View>
    <Pressable accessibilityRole="button" accessibilityLabel="Google로 계속하기" onPress={() => Alert.alert('Google 로그인', 'Google 로그인 기능은 준비 중입니다.')} style={({ pressed }) => [styles.google, { opacity: pressed ? 0.7 : 1 }]}><Text style={styles.googleIcon}>G</Text><Text style={styles.googleText}>Google로 계속하기</Text></Pressable>
  </AuthScreenLayout>;
}
const styles = StyleSheet.create({
  forgot: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: 4 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  google: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  googleIcon: { fontSize: 20, fontWeight: '800', color: colors.text },
  googleText: { fontSize: 16, fontWeight: '600', color: colors.text, flexShrink: 1 },
});
