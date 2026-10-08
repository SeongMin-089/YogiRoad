import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import AuthScreenLayout, { authStyles } from '../components/AuthScreenLayout';
import { colors } from '../constants/colors';
import type { AuthScreenProps } from '../types/navigation';

export default function LoginScreen({ navigation }: AuthScreenProps<'Login'>) {
  const { signInWithGoogle } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const handleGoogleLogin = async () => {
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      Alert.alert('Google 로그인 실패', error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return <AuthScreenLayout title="로그인" onBack={() => navigation.goBack()} footer={
    <View style={authStyles.footerRow}><Text style={authStyles.muted}>계정이 없으신가요?</Text><Pressable accessibilityRole="button" style={authStyles.textButton} onPress={() => navigation.replace('SignUp')}><Text style={authStyles.link}>회원가입</Text></Pressable></View>
  }>
    <View style={styles.intro}>
      <Text style={styles.introTitle}>Google 계정으로 안전하게 로그인하세요.</Text>
      <Text style={authStyles.muted}>로그인한 계정별로 영업 대상과 활동이 분리됩니다.</Text>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Google로 로그인" disabled={submitting} onPress={() => void handleGoogleLogin()} style={({ pressed }) => [styles.google, { opacity: pressed || submitting ? 0.55 : 1 }]}><Text style={styles.googleIcon}>G</Text><Text style={styles.googleText}>{submitting ? '로그인 중...' : 'Google로 로그인'}</Text></Pressable>
  </AuthScreenLayout>;
}

const styles = StyleSheet.create({
  intro: { gap: 8, paddingVertical: 12 },
  introTitle: { fontSize: 17, lineHeight: 26, fontWeight: '700', color: colors.text },
  google: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  googleIcon: { fontSize: 20, fontWeight: '800', color: colors.text },
  googleText: { fontSize: 16, fontWeight: '600', color: colors.text, flexShrink: 1 },
});
