import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';

type Props = { title: string; actionText?: string; onAction?: () => void };
export default function SectionHeader({ title, actionText, onAction }: Props) {
  return <View style={styles.row}>
    <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    {actionText && onAction ? <Pressable accessibilityRole="button" onPress={onAction} style={styles.action}><Text style={styles.link}>{actionText}</Text></Pressable> : null}
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 32 },
  title: { flex: 1, fontSize: 18, lineHeight: 26, fontWeight: '700', color: colors.text },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  link: { fontSize: 13, fontWeight: '600', color: colors.primaryDark },
});
