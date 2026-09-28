import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';

export default function StatCard({ label, value, helperText }: { label: string; value: string; helperText?: string }) {
  return <View style={styles.card}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value} adjustsFontSizeToFit numberOfLines={1}>{value}</Text>
    {helperText ? <Text style={styles.label}>{helperText}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  card: { flexGrow: 1, flexBasis: '45%', minWidth: 0, padding: 16, gap: 10, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  label: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  value: { color: colors.text, fontSize: 30, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
