import { useState, type ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MainScreenLayout, { ui } from '../components/MainScreenLayout';
import PrimaryButton from '../components/PrimaryButton';
import { colors } from '../constants/colors';
import type { MainScreenProps } from '../types/navigation';

const menus: { label: string; icon: ComponentProps<typeof Ionicons>['name']; description: string }[] = [
  { label: '내 정보', icon: 'person-outline', description: '로그인 사용자 정보 기능 준비중' },
  { label: '담당 지역 설정', icon: 'location-outline', description: '사용자별 담당 지역 기능 준비중' },
  { label: '알림 설정', icon: 'notifications-outline', description: '방문 일정 및 알림 기능 준비중' },
  { label: '앱 정보', icon: 'information-circle-outline', description: '요기로드 1.0.0\n영업 대상 발굴부터 계약 관리까지 한 번에' },
];
export default function MyPageScreen({ navigation }: MainScreenProps<'MyPage'>) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return <MainScreenLayout title="마이">
    <View style={[ui.card, ui.section]}>
      <View style={ui.row}><View style={styles.avatar}><Ionicons name="person-outline" size={28} color={colors.primaryDark} /></View><View style={ui.grow}><Text style={styles.name}>사용자 정보 없음</Text><Text style={ui.muted}>로그인 사용자 정보 기능 준비중</Text></View></View>
      <View style={styles.region}><Text style={ui.muted}>담당 지역</Text><Text style={ui.body}>설정되지 않음</Text></View>
    </View>
    <View style={styles.menuList}>{menus.map(menu => <View key={menu.label}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: expanded === menu.label }} onPress={() => setExpanded(expanded === menu.label ? null : menu.label)} style={({ pressed }) => [styles.menu, { opacity: pressed ? 0.6 : 1 }]}>
        <Ionicons name={menu.icon} size={21} color={colors.textSecondary} /><Text style={[ui.body, ui.grow]}>{menu.label}</Text><Ionicons name={expanded === menu.label ? 'chevron-up' : 'chevron-forward'} size={18} color={colors.textSecondary} />
      </Pressable>
      {expanded === menu.label ? <View style={styles.details}><Text style={ui.muted}>{menu.description}</Text></View> : null}
    </View>)}</View>
    <View style={styles.logout}><PrimaryButton title="로그아웃" variant="secondary" onPress={() => navigation.replace('Auth', { screen: 'Start' })} /></View>
  </MainScreenLayout>;
}
const styles = StyleSheet.create({
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF0F0', justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 22, fontWeight: '700', lineHeight: 32, color: colors.text },
  region: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16, gap: 4 },
  menuList: { borderTopWidth: 1, borderTopColor: colors.border },
  menu: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  details: { padding: 16, backgroundColor: colors.surface, gap: 12 },
  logout: { marginTop: 'auto', paddingTop: 16 },
});
