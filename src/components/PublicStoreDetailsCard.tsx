import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors } from '../constants/colors';
import type { PublicDataStore } from '../services/publicDataApi';
import type { SalesStatus } from '../types/sales';
import PrimaryButton from './PrimaryButton';
import StatusBadge from './StatusBadge';

type Props = {
  store: PublicDataStore;
  status?: SalesStatus;
  registering?: boolean;
  loadingRegistrationStatus?: boolean;
  onRegister: () => void;
  onClose: () => void;
};

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export default function PublicStoreDetailsCard({
  store,
  status,
  registering = false,
  loadingRegistrationStatus = false,
  onRegister,
  onClose,
}: Props) {
  const { height } = useWindowDimensions();
  const category = text(store.indsMclsNm) || text(store.indsSclsNm);
  const subcategory = text(store.indsSclsNm);
  const name = text(store.bizesNm);
  const branch = text(store.brchNm);
  const road = text(store.rdnmAdr);
  const lot = text(store.lnoAdr);
  const region = [store.ctprvnNm, store.signguNm, store.adongNm].map(text).filter(Boolean).join(' ');
  const rows = [
    { label: road ? '도로명' : '지번', value: road || lot },
    { label: '지번', value: road && lot !== road ? lot : '' },
    { label: '건물명', value: text(store.bldNm) },
    { label: '층', value: text(store.flrNo) },
    { label: '지역', value: region },
    { label: '상가업소번호', value: text(store.bizesId) },
  ].filter(row => row.value);

  return <View style={[styles.sheet, { height: height * 0.38 }]}>
    <View style={styles.top}>
      <View style={styles.badges}>
        {category ? <View style={styles.category}><Text style={styles.categoryText}>{category}</Text></View> : null}
        {status ? <StatusBadge status={status} /> : null}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="영업 대상 상세 닫기" onPress={onClose}
        style={({ pressed }) => [styles.close, { opacity: pressed ? 0.5 : 1 }]}>
        <Ionicons name="close" size={23} color={colors.textSecondary} />
      </Pressable>
    </View>
    <ScrollView style={styles.body} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
      {name ? <Text accessibilityRole="header" style={styles.name}>{name}</Text> : null}
      {branch ? <Text style={styles.branch}>{branch}</Text> : null}
      {subcategory && subcategory !== category ? <Text style={styles.secondary}>{subcategory}</Text> : null}
      {rows.map(row => <View key={row.label} style={styles.detail}>
        <Text style={styles.label}>{row.label}</Text><Text style={styles.value}>{row.value}</Text>
      </View>)}
    </ScrollView>
    <View style={styles.footer}>
      <PrimaryButton
        title={status
          ? `등록 완료 · ${status}`
          : registering
            ? '등록 중...'
            : loadingRegistrationStatus
              ? '등록 상태 확인 중...'
              : '영업 대상 등록'}
        variant={status ? 'secondary' : 'primary'}
        disabled={status !== undefined || registering || loadingRegistrationStatus || !text(store.bizesId)}
        onPress={onRegister}
      />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden', width: '100%', maxWidth: 520, alignSelf: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', paddingLeft: 24, paddingRight: 12, paddingTop: 4 },
  badges: { flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  category: { backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7 },
  categoryText: { fontSize: 12, fontWeight: '600', color: colors.primaryDark },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 16, gap: 8 },
  name: { color: colors.text, fontSize: 21, lineHeight: 29, fontWeight: '700' },
  branch: { color: colors.text, fontSize: 14, lineHeight: 21 },
  secondary: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  detail: { gap: 3, paddingTop: 6 },
  label: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  value: { color: colors.text, fontSize: 14, lineHeight: 21 },
  footer: { paddingHorizontal: 24, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
});
