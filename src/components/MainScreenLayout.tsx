import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';

export default function MainScreenLayout({ title, children }: { title?: string; children: ReactNode }) {
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      {title ? <Text accessibilityRole="header" style={styles.title}>{title}</Text> : null}
      <View style={ui.stack}>{children}</View>
    </ScrollView>
  </SafeAreaView>;
}

export const ui = StyleSheet.create({
  stack: { gap: 28, flex: 1 },
  section: { gap: 12 },
  card: { padding: 18, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grow: { flex: 1, minWidth: 0 },
  body: { fontSize: 15, lineHeight: 23, color: colors.text },
  name: { fontSize: 16, lineHeight: 24, fontWeight: '700', color: colors.text },
  muted: { fontSize: 13, lineHeight: 21, color: colors.textSecondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  empty: { padding: 24, borderRadius: 14, backgroundColor: colors.surface, gap: 8 },
});
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: 24, paddingBottom: 32, width: '100%', maxWidth: 520, alignSelf: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 24 },
});
