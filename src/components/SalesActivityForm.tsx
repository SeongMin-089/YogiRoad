import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../constants/colors';
import {
  SalesActivityApiError,
  type CreateSalesActivityRequest,
} from '../services/salesActivityApi';
import { SALES_ACTIVITY_TYPES, type SalesActivityType } from '../types/sales';
import { ui } from './MainScreenLayout';
import PrimaryButton from './PrimaryButton';

type Props = {
  disabled?: boolean;
  onCreate: (request: CreateSalesActivityRequest) => Promise<void>;
};

function toNextActionAt(value: string): string | null | undefined {
  const normalized = value.trim();
  if (!normalized) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1000) return undefined;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year
      || date.getUTCMonth() !== month - 1
      || date.getUTCDate() !== day) {
    return undefined;
  }

  return `${normalized}T00:00:00+09:00`;
}

export default function SalesActivityForm({ disabled = false, onCreate }: Props) {
  const [type, setType] = useState<SalesActivityType>('방문');
  const [content, setContent] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [adding, setAdding] = useState(false);
  const busy = disabled || adding;

  async function handleCreate(): Promise<void> {
    const normalizedContent = content.trim();
    if (!normalizedContent) {
      Alert.alert('활동 내용 확인', '오늘 진행한 영업 활동 내용을 입력해 주세요.');
      return;
    }

    const nextActionAt = toNextActionAt(nextActionDate);
    if (nextActionAt === undefined) {
      Alert.alert('날짜 확인', '다음 액션 날짜를 YYYY-MM-DD 형식의 올바른 날짜로 입력해 주세요.');
      return;
    }

    setAdding(true);
    try {
      await onCreate({ type, content: normalizedContent, nextActionAt });
      setContent('');
      setNextActionDate('');
    } catch (error) {
      Alert.alert(
        '활동 기록 추가 실패',
        error instanceof SalesActivityApiError ? error.message : '영업 활동을 추가하지 못했습니다.',
      );
    } finally {
      setAdding(false);
    }
  }

  return <View style={[ui.card, styles.form]}>
    <Text style={styles.label}>활동 종류</Text>
    <View style={styles.chips}>
      {SALES_ACTIVITY_TYPES.map(option => {
        const selected = type === option;
        return <Pressable
          key={option}
          accessibilityRole="button"
          accessibilityState={{ selected, disabled: busy }}
          disabled={busy}
          onPress={() => setType(option)}
          style={({ pressed }) => [
            styles.chip,
            selected && styles.selectedChip,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.chipText, selected && styles.selectedChipText]}>{option}</Text>
        </Pressable>;
      })}
    </View>

    <Text style={styles.label}>활동 내용</Text>
    <TextInput
      accessibilityLabel="영업 활동 내용"
      value={content}
      onChangeText={setContent}
      placeholder="오늘 진행한 상담이나 방문 내용을 입력해 주세요."
      placeholderTextColor={colors.textSecondary}
      multiline
      maxLength={2000}
      editable={!busy}
      textAlignVertical="top"
      style={styles.contentInput}
    />
    <Text style={[ui.muted, styles.count]}>{content.length}/2000</Text>

    <Text style={styles.label}>다음 액션 날짜 <Text style={ui.muted}>(선택)</Text></Text>
    <TextInput
      accessibilityLabel="다음 액션 날짜"
      value={nextActionDate}
      onChangeText={setNextActionDate}
      placeholder="YYYY-MM-DD"
      placeholderTextColor={colors.textSecondary}
      autoCapitalize="none"
      autoCorrect={false}
      maxLength={10}
      editable={!busy}
      style={styles.dateInput}
    />
    <Text style={ui.muted}>예: 2026-10-15 · 입력한 날짜의 한국 시간 자정으로 저장됩니다.</Text>

    <PrimaryButton
      title={adding ? '추가 중...' : '활동 기록 추가'}
      disabled={busy}
      onPress={() => { void handleCreate(); }}
    />
  </View>;
}

const styles = StyleSheet.create({
  form: { gap: 12 },
  label: { color: colors.text, fontSize: 14, lineHeight: 22, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    justifyContent: 'center',
  },
  selectedChip: { borderColor: colors.primary, backgroundColor: '#FFF0F0' },
  chipText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  selectedChipText: { color: colors.primaryDark },
  contentInput: {
    minHeight: 120,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 15,
    lineHeight: 23,
  },
  dateInput: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 15,
  },
  count: { textAlign: 'right' },
  pressed: { opacity: 0.55 },
});
