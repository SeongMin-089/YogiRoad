import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import StatusBadge, { type BadgeStatus } from './StatusBadge';
import { ui } from './MainScreenLayout';

type Props = { name: string; category: string; address?: string; status: BadgeStatus; meta?: string; onPress?: () => void };
export default function StoreCard({ name, category, address, status, meta, onPress }: Props) {
  const content = <>
    <View style={ui.row}><View style={ui.grow}>
      <Text style={ui.name}>{name}</Text>
      <Text style={ui.muted}>{[category, address].filter(Boolean).join(' · ')}</Text>
    </View>{onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} /> : null}</View>
    <View style={styles.footer}><StatusBadge status={status} />{meta ? <Text style={styles.meta}>{meta}</Text> : null}</View>
  </>;
  return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={`${name}, ${status}, 상세 보기`} onPress={onPress} style={({ pressed }) => [ui.card, styles.card, { opacity: pressed ? 0.65 : 1 }]}>{content}</Pressable> : <View style={[ui.card, styles.card]}>{content}</View>;
}
const styles = StyleSheet.create({
  card: { gap: 14 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  meta: { fontSize: 12, lineHeight: 20, color: colors.textSecondary, flexShrink: 1 },
});
