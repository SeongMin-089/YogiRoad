import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../constants/colors';
type Props = { title: string; onPress: () => void; variant?: 'primary' | 'secondary'; disabled?: boolean };
export default function PrimaryButton({ title, onPress, variant = 'primary', disabled = false }: Props) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, styles[variant], { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }]}>
    <Text style={[styles.title, variant === 'secondary' && styles.secondaryTitle]}>{title}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({
  button: { minHeight: 56, borderRadius: 14, borderWidth: 1, paddingHorizontal: 20, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: colors.primary, borderColor: colors.primary },
  secondary: { backgroundColor: colors.background, borderColor: colors.primary },
  title: { fontSize: 16, fontWeight: '700', color: colors.background, textAlign: 'center' },
  secondaryTitle: { color: colors.primary },
});
