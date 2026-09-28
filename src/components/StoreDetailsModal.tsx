import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Store } from '../types/sales';
import { colors } from '../constants/colors';
import { ui } from './MainScreenLayout';
import PrimaryButton from './PrimaryButton';
import StatusBadge from './StatusBadge';

export default function StoreDetailsModal({ store, onClose }: { store: Store | null; onClose: () => void }) {
  return <Modal visible={store !== null} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
    <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
      {store ? <View style={ui.stack}>
        <Text accessibilityRole="header" style={styles.title}>매장 정보</Text>
        <View style={[ui.card, ui.section]}><Text style={ui.name}>{store.name}</Text><Text style={ui.body}>{store.category} · {store.address}</Text><StatusBadge status={store.status} /><Text style={ui.muted}>{store.meta}</Text><Text style={ui.muted}>거리 {store.distance}</Text></View>
        <Text style={ui.muted}>UI 미리보기용 예시 매장 정보입니다.</Text>
        <PrimaryButton title="닫기" variant="secondary" onPress={onClose} />
      </View> : null}
    </ScrollView></SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, width: '100%', maxWidth: 520, alignSelf: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
});
