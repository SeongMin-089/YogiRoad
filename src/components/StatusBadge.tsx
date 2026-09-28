import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import type { SalesStatus } from '../types/sales';

export type BadgeStatus = SalesStatus | '방문 예정' | '미접촉';
export const statusColors: Record<BadgeStatus, { foreground: string; background: string }> = {
  미방문: { foreground: colors.textSecondary, background: colors.surface },
  미접촉: { foreground: colors.textSecondary, background: colors.surface },
  상담중: { foreground: colors.primaryDark, background: '#FFF0F0' },
  '방문 예정': { foreground: colors.primaryDark, background: '#FFF0F0' },
  재방문: { foreground: '#976B28', background: '#FBF4E8' },
  계약완료: { foreground: '#47765D', background: '#EDF5F0' },
  거절: { foreground: '#946367', background: '#F6EFF0' },
};
export default function StatusBadge({ status }: { status: BadgeStatus }) {
  const tone = statusColors[status];
  return <View style={[styles.badge, { backgroundColor: tone.background }]}><Text style={[styles.text, { color: tone.foreground }]}>{status}</Text></View>;
}
const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7 },
  text: { fontSize: 12, fontWeight: '600' },
});
