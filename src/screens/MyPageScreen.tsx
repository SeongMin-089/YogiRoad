import { useState, type ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import MainScreenLayout, { ui } from '../components/MainScreenLayout';
import PrimaryButton from '../components/PrimaryButton';
import { colors } from '../constants/colors';
import { profile } from '../data/mockData';
import type { MainScreenProps } from '../types/navigation';

const menus: { label: string; icon: ComponentProps<typeof Ionicons>['name']; description: string }[] = [
  { label: '내 정보', icon: 'person-outline', description: `${profile.name} · ${profile.team}\n프로필 편집 기능은 준비 중입니다.` },
  { label: '담당 지역 설정', icon: 'location-outline', description: `현재 담당 지역: ${profile.region}\n지역 변경 기능은 준비 중입니다.` },
  { label: '알림 설정', icon: 'notifications-outline', description: '방문 일정 알림\n미리보기 설정이며 실제 알림은 전송되지 않습니다.' },
  { label: '앱 정보', icon: 'information-circle-outline', description: '요기로드 1.0.0\n영업 대상 발굴부터 계약 관리까지 한 번에\n현재 화면의 정보는 예시 데이터입니다.' },
];
export default function MyPageScreen({ navigation }: MainScreenProps<'MyPage'>) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notifications, setNotifications] = useState(false);
  return <MainScreenLayout title="마이">
    <View style={[ui.card, ui.section]}>
      <View style={ui.row}><View style={styles.avatar}><Ionicons name="person-outline" size={28} color={colors.primaryDark} /></View><View style={ui.grow}><Text style={styles.name}>{profile.name}</Text><Text style={ui.muted}>{profile.team}</Text></View></View>
      <View style={styles.region}><Text style={ui.muted}>담당 지역</Text><Text style={ui.body}>{profile.region}</Text></View>
    </View>
    <View style={styles.menuList}>{menus.map(menu => <View key={menu.label}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: expanded === menu.label }} onPress={() => setExpanded(expanded === menu.label ? null : menu.label)} style={({ pressed }) => [styles.menu, { opacity: pressed ? 0.6 : 1 }]}>
        <Ionicons name={menu.icon} size={21} color={colors.textSecondary} /><Text style={[ui.body, ui.grow]}>{menu.label}</Text><Ionicons name={expanded === menu.label ? 'chevron-up' : 'chevron-forward'} size={18} color={colors.textSecondary} />
      </Pressable>
      {expanded === menu.label ? <View style={styles.details}><Text style={ui.muted}>{menu.description}</Text>{menu.label === '알림 설정' ? <Switch accessibilityLabel="방문 일정 알림 미리보기" value={notifications} onValueChange={setNotifications} trackColor={{ true: colors.primary }} /> : null}</View> : null}
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
