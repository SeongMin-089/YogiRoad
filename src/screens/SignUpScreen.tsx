import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import AuthScreenLayout, { authStyles } from '../components/AuthScreenLayout';
import { colors } from '../constants/colors';
import type { AuthScreenProps } from '../types/navigation';

export default function SignUpScreen({ navigation }: AuthScreenProps<'SignUp'>) {
  const { signInWithKakao } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const handleKakaoSignUp = async () => {
    setSubmitting(true);
    try {
      await signInWithKakao();
    } catch (error) {
      Alert.alert('카카오 가입 실패', error instanceof Error ? error.message : '가입 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return <AuthScreenLayout title="회원가입" onBack={() => navigation.goBack()} footer={
    <View style={authStyles.footerRow}><Text style={authStyles.muted}>이미 계정이 있으신가요?</Text><Pressable accessibilityRole="button" style={authStyles.textButton} onPress={() => navigation.replace('Login')}><Text style={authStyles.link}>로그인</Text></Pressable></View>
  }>
    <View style={styles.intro}>
      <Text style={styles.introTitle}>별도 가입 양식 없이 시작할 수 있습니다.</Text>
      <Text style={authStyles.muted}>카카오 계정으로 처음 로그인하면 YogiRoad 계정이 자동으로 생성됩니다.</Text>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="카카오로 가입하기" disabled={submitting} onPress={() => void handleKakaoSignUp()} style={({ pressed }) => [styles.kakao, { opacity: pressed || submitting ? 0.55 : 1 }]}><Text style={styles.kakaoIcon}>K</Text><Text style={styles.kakaoText}>{submitting ? '가입 확인 중...' : '카카오로 가입하기'}</Text></Pressable>
  </AuthScreenLayout>;
}

const styles = StyleSheet.create({
  intro: { gap: 8, paddingVertical: 12 },
  introTitle: { fontSize: 17, lineHeight: 26, fontWeight: '700', color: colors.text },
  kakao: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 16, borderRadius: 14, backgroundColor: '#FEE500' },
  kakaoIcon: { fontSize: 20, fontWeight: '900', color: '#191919' },
  kakaoText: { fontSize: 16, fontWeight: '700', color: '#191919', flexShrink: 1 },
});
