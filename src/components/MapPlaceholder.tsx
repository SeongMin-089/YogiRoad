import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';

// Replace this component with the map provider; search and preview stay in MapScreen.
export default function MapPlaceholder() {
  return <View style={styles.map}>
    <Ionicons name="map-outline" size={36} color={colors.textSecondary} />
    <Text style={styles.title}>지도 영역</Text><Text style={styles.description}>지도 API 연결 예정</Text>
  </View>;
}
const styles = StyleSheet.create({
  map: { flex: 1, minHeight: 290, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  description: { fontSize: 13, color: colors.textSecondary },
});
