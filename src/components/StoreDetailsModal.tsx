import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';
import {
  deleteSalesTarget,
  SalesTargetApiError,
  type SalesTarget,
  updateSalesTarget,
} from '../services/salesTargetApi';
import { SALES_STATUSES, type SalesStatus } from '../types/sales';
import { ui } from './MainScreenLayout';
import PrimaryButton from './PrimaryButton';
import SalesActivitySection from './SalesActivitySection';
import StatusBadge, { statusColors } from './StatusBadge';

type Props = {
  target: SalesTarget | null;
  onClose: () => void;
  onChanged?: (target: SalesTarget) => void;
  onDeleted?: (storeId: string) => void;
};

function formatRegisteredAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '확인할 수 없음';
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof SalesTargetApiError ? error.message : fallback;
}

export default function StoreDetailsModal({ target, onClose, onChanged, onDeleted }: Props) {
  const [status, setStatus] = useState<SalesStatus>('미방문');
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const busy = saving || deleting;

  useEffect(() => {
    if (!target) return;
    setStatus(target.status);
    setMemo(target.memo ?? '');
  }, [target]);

  async function handleSave(): Promise<void> {
    if (!target || busy) return;
    setSaving(true);
    try {
      const updated = await updateSalesTarget(target.storeId, { status, memo });
      onChanged?.(updated);
      Alert.alert('저장 완료', '영업 상태와 상담 메모를 저장했습니다.');
    } catch (error) {
      Alert.alert('변경사항 저장 실패', errorMessage(error, '영업 대상을 수정하지 못했습니다.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!target || busy) return;
    setDeleting(true);
    try {
      await deleteSalesTarget(target.storeId);
      onDeleted?.(target.storeId);
      onClose();
    } catch (error) {
      Alert.alert('영업 대상 삭제 실패', errorMessage(error, '영업 대상을 삭제하지 못했습니다.'));
    } finally {
      setDeleting(false);
    }
  }

  function confirmDelete(): void {
    if (!target || busy) return;
    Alert.alert(
      '영업 대상 삭제',
      '이 매장을 영업 대상에서 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: () => { void handleDelete(); } },
      ],
    );
  }

  return <Modal
    visible={target !== null}
    animationType="slide"
    onRequestClose={busy ? undefined : onClose}
    presentationStyle="pageSheet"
  >
    <SafeAreaView style={styles.safe}><ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
    >
      {target ? <View style={ui.stack}>
        <Text accessibilityRole="header" style={styles.title}>영업 대상 상세</Text>
        <View style={[ui.card, ui.section]}>
          <Text style={ui.name}>{target.storeName}</Text>
          <View style={styles.infoRow}><Text style={styles.label}>업종</Text><Text style={[ui.body, styles.value]}>{target.category || '-'}</Text></View>
          <View style={styles.infoRow}><Text style={styles.label}>주소</Text><Text style={[ui.body, styles.value]}>{target.address || '-'}</Text></View>
          <View style={styles.infoRow}><Text style={styles.label}>등록일</Text><Text style={[ui.body, styles.value]}>{formatRegisteredAt(target.registeredAt)}</Text></View>
          <View style={styles.infoRow}><Text style={styles.label}>현재 상태</Text><View style={styles.value}><StatusBadge status={target.status} /></View></View>
        </View>

        <View style={ui.section}>
          <Text style={ui.name}>영업 상태</Text>
          <View style={styles.statuses}>
            {SALES_STATUSES.map(option => {
              const selected = status === option;
              const tone = statusColors[option];
              return <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: busy }}
                disabled={busy}
                onPress={() => setStatus(option)}
                style={({ pressed }) => [
                  styles.status,
                  selected && { borderColor: tone.foreground, backgroundColor: tone.background },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.statusText, selected && { color: tone.foreground }]}>{option}</Text>
              </Pressable>;
            })}
          </View>
        </View>

        <View style={ui.section}>
          <Text style={ui.name}>현재 메모</Text>
          <TextInput
            accessibilityLabel="상담 메모"
            value={memo}
            onChangeText={setMemo}
            placeholder="상담 내용, 다음 방문 일정 등을 입력해 주세요."
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={2000}
            editable={!busy}
            textAlignVertical="top"
            style={styles.memo}
          />
          <Text style={[ui.muted, styles.count]}>{memo.length}/2000</Text>
        </View>

        <PrimaryButton
          title={saving ? '저장 중...' : '변경사항 저장'}
          disabled={busy}
          onPress={() => { void handleSave(); }}
        />

        <SalesActivitySection storeId={target.storeId} disabled={busy} />

        <PrimaryButton title="닫기" variant="secondary" disabled={busy} onPress={onClose} />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={confirmDelete}
          style={({ pressed }) => [styles.deleteButton, (busy || pressed) && styles.pressed]}
        >
          <Text style={styles.deleteText}>{deleting ? '삭제 중...' : '영업 대상 삭제'}</Text>
        </Pressable>
      </View> : null}
    </ScrollView></SafeAreaView>
  </Modal>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingBottom: 40, width: '100%', maxWidth: 520, alignSelf: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  label: { width: 64, fontSize: 13, lineHeight: 23, color: colors.textSecondary },
  value: { flex: 1, minWidth: 0 },
  statuses: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  status: {
    minHeight: 44,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    justifyContent: 'center',
  },
  statusText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  memo: {
    minHeight: 150,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: 15,
    lineHeight: 23,
  },
  count: { textAlign: 'right' },
  deleteButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  deleteText: { color: colors.error, fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.55 },
});
