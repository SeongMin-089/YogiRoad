import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';
type Props = { title: string; onBack: () => void; children: ReactNode; footer: ReactNode };
export default function AuthScreenLayout({ title, onBack, children, footer }: Props) {
  return <SafeAreaView style={styles.safeArea}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="뒤로 가기" onPress={onBack} style={({ pressed }) => [styles.back, { opacity: pressed ? 0.5 : 1 }]}><Text style={styles.backIcon}>‹</Text></Pressable>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text><View style={styles.spacer} />
    </View>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={styles.form}>{children}</View><View style={styles.footer}>{footer}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
export const authStyles = StyleSheet.create({
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' },
  muted: { color: colors.textSecondary, fontSize: 14 },
  textButton: { minHeight: 48, paddingHorizontal: 8, justifyContent: 'center' },
  link: { color: colors.primaryDark, fontSize: 14, fontWeight: '700' },
});
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  back: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 36, color: colors.text }, spacer: { width: 48 },
  title: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '700', color: colors.text },
  content: { flexGrow: 1, padding: 24, width: '100%', maxWidth: 520, alignSelf: 'center' },
  form: { gap: 20 }, footer: { marginTop: 'auto', paddingTop: 32 },
});
