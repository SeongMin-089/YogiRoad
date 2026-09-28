import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors } from '../constants/colors';

export default function SearchField({ value, onChangeText, placeholder }: { value: string; onChangeText: (value: string) => void; placeholder: string }) {
  return <View style={styles.field}>
    <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
    <TextInput accessibilityLabel={placeholder} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.textSecondary} selectionColor={colors.primary} autoCorrect={false} returnKeyType="search" style={styles.input} />
    {value ? <Pressable accessibilityRole="button" accessibilityLabel="검색어 지우기" onPress={() => onChangeText('')} style={styles.clear}><Ionicons name="close-circle" size={20} color={colors.textSecondary} /></Pressable> : null}
  </View>;
}
const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 14, paddingRight: 4, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  input: { flex: 1, minWidth: 0, minHeight: 54, paddingVertical: 12, color: colors.text, fontSize: 14 },
  clear: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
});
