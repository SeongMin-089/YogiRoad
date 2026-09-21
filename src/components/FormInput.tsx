import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors } from '../constants/colors';
type Props = TextInputProps & { label: string; error?: string };
export default function FormInput({ label, error, style, ...props }: Props) {
  return <View style={styles.container}>
    <Text style={styles.label}>{label}</Text>
    <TextInput accessibilityLabel={label} placeholderTextColor={colors.textSecondary} selectionColor={colors.primary} {...props} style={[styles.input, style, error ? styles.invalid : undefined]} />
    {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  container: { gap: 8 }, label: { color: colors.text, fontSize: 14, fontWeight: '600' },
  input: { minHeight: 54, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: colors.text },
  invalid: { borderColor: colors.error }, error: { color: colors.error, fontSize: 13 },
});
