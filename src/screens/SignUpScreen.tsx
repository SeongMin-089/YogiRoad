import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import AuthScreenLayout, { authStyles } from '../components/AuthScreenLayout';
import { colors } from '../constants/colors';
import type { AuthScreenProps } from '../types/navigation';

export default function SignUpScreen({ navigation }: AuthScreenProps<'SignUp'>) {
  const { signInWithGoogle } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const handleGoogleSignUp = async () => {
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      Alert.alert('Google 가입 실패', error instanceof Error ? error.message : '가입 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return <AuthScreenLayout title="회원가입" onBack={() => navigation.goBack()} footer={
    <View style={authStyles.footerRow}><Text style={authStyles.muted}>이미 계정이 있으신가요?</Text><Pressable accessibilityRole="button" style={authStyles.textButton} onPress={() => navigation.replace('Login')}><Text style={authStyles.link}>로그인</Text></Pressable></View>
  }>
    <View style={styles.intro}>
      <Text style={styles.introTitle}>별도 가입 양식 없이 시작할 수 있습니다.</Text>
      <Text style={authStyles.muted}>Google 계정으로 처음 로그인하면 YogiRoad 계정이 자동으로 생성됩니다.</Text>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Google로 가입하기" disabled={submitting} onPress={() => void handleGoogleSignUp()} style={({ pressed }) => [styles.google, { opacity: pressed || submitting ? 0.55 : 1 }]}><Text style={styles.googleIcon}>G</Text><Text style={styles.googleText}>{submitting ? '가입 중...' : 'Google로 가입하기'}</Text></Pressable>
  </AuthScreenLayout>;
}

const styles = StyleSheet.create({
  intro: { gap: 8, paddingVertical: 12 },
  introTitle: { fontSize: 17, lineHeight: 26, fontWeight: '700', color: colors.text },
  google: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  googleIcon: { fontSize: 20, fontWeight: '800', color: colors.text },
  googleText: { fontSize: 16, fontWeight: '600', color: colors.text, flexShrink: 1 },
});
