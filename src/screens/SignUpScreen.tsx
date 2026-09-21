import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import AuthScreenLayout, { authStyles } from '../components/AuthScreenLayout';
import FormInput from '../components/FormInput';
import PrimaryButton from '../components/PrimaryButton';
import type { AuthScreenProps } from '../types/navigation';
export default function SignUpScreen({ navigation }: AuthScreenProps<'SignUp'>) {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', team: '', region: '' });
  const update = (field: keyof typeof form) => (value: string) => setForm(previous => ({ ...previous, [field]: value }));
  return <AuthScreenLayout title="회원가입" onBack={() => navigation.goBack()} footer={
    <View style={authStyles.footerRow}><Text style={authStyles.muted}>이미 계정이 있으신가요?</Text><Pressable accessibilityRole="button" style={authStyles.textButton} onPress={() => navigation.replace('Login')}><Text style={authStyles.link}>로그인</Text></Pressable></View>
  }>
    <FormInput label="이름" placeholder="이름을 입력해 주세요" value={form.name} onChangeText={update('name')} autoComplete="name" />
    <FormInput label="이메일" placeholder="이메일을 입력해 주세요" value={form.email} onChangeText={update('email')} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
    <FormInput label="비밀번호" placeholder="비밀번호를 입력해 주세요" value={form.password} onChangeText={update('password')} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" />
    <FormInput label="비밀번호 확인" placeholder="비밀번호를 한 번 더 입력해 주세요" value={form.confirmPassword} onChangeText={update('confirmPassword')} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" />
    <FormInput label="소속 팀" placeholder="소속 팀을 입력해 주세요" value={form.team} onChangeText={update('team')} />
    <FormInput label="담당 지역" placeholder="담당 지역을 입력해 주세요" value={form.region} onChangeText={update('region')} />
    <PrimaryButton title="가입하기" onPress={() => Alert.alert('회원가입', '회원가입 기능은 준비 중입니다.')} />
  </AuthScreenLayout>;
}
