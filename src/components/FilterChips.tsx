import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { colors } from '../constants/colors';

type Props<T extends string> = { options: readonly T[]; value: T; onChange: (value: T) => void; counts?: Partial<Record<T, number>> };
export default function FilterChips<T extends string>({ options, value, onChange, counts }: Props<T>) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
    {options.map(option => <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: value === option }} onPress={() => onChange(option)} style={[styles.chip, value === option && styles.selected]}>
      <Text style={[styles.text, value === option && styles.selectedText]}>{option}{counts?.[option] !== undefined ? ` ${counts[option]}` : ''}</Text>
    </Pressable>)}
  </ScrollView>;
}
const styles = StyleSheet.create({
  list: { gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', backgroundColor: colors.background },
  selected: { borderColor: colors.primary, backgroundColor: '#FFF0F0' },
  text: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  selectedText: { color: colors.primaryDark },
});
