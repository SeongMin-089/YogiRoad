import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import {
  SalesActivityApiError,
  type SalesActivity,
} from '../services/salesActivityApi';
import type { SalesActivityType } from '../types/sales';
import { ui } from './MainScreenLayout';

type Props = {
  activities: SalesActivity[];
  loading: boolean;
  error: string | null;
  disabled?: boolean;
  onDelete: (activityId: string) => Promise<void>;
};

const activityColors: Record<SalesActivityType, { foreground: string; background: string }> = {
  방문: { foreground: colors.primaryDark, background: '#FFF0F0' },
  전화: { foreground: '#436F9E', background: '#EEF5FC' },
  상담: { foreground: '#6B5A9C', background: '#F3F0FA' },
  재방문: { foreground: '#976B28', background: '#FBF4E8' },
  기타: { foreground: colors.textSecondary, background: colors.surface },
};

function validDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value: string): string {
  const date = validDate(value);
  if (!date) return '날짜 확인 불가';
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatDate(value: string): string {
  const date = validDate(value);
  if (!date) return '날짜 확인 불가';
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export default function SalesActivityList({
  activities,
  loading,
  error,
  disabled = false,
  onDelete,
}: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const upcoming = useMemo(() => activities
    .map(activity => ({ activity, date: validDate(activity.nextActionAt) }))
    .filter((item): item is { activity: SalesActivity; date: Date } =>
      item.date !== null && item.date.getTime() >= Date.now())
    .sort((left, right) => left.date.getTime() - right.date.getTime())[0], [activities]);

  async function handleDelete(activityId: string): Promise<void> {
    setDeletingId(activityId);
    try {
      await onDelete(activityId);
    } catch (requestError) {
      Alert.alert(
        '활동 기록 삭제 실패',
        requestError instanceof SalesActivityApiError
          ? requestError.message
          : '영업 활동 기록을 삭제하지 못했습니다.',
      );
    } finally {
      setDeletingId(null);
    }
  }

  function confirmDelete(activityId: string): void {
    if (disabled || deletingId) return;
    Alert.alert(
      '영업 활동 기록 삭제',
      '이 영업 활동 기록을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => { void handleDelete(activityId); },
        },
      ],
    );
  }

  if (loading) {
    return <View style={ui.empty}><Text style={ui.name}>영업 활동을 불러오는 중...</Text></View>;
  }

  if (error) {
    return <View style={ui.empty}>
      <Text style={ui.name}>영업 활동을 불러오지 못했습니다.</Text>
      <Text style={ui.muted}>{error}</Text>
    </View>;
  }

  if (!activities.length) {
    return <View style={ui.empty}>
      <Text style={ui.name}>아직 등록된 영업 활동이 없습니다.</Text>
      <Text style={ui.muted}>방문이나 상담 내용을 기록해 보세요.</Text>
    </View>;
  }

  return <View style={styles.list}>
    {upcoming ? <View style={styles.upcoming}>
      <Text style={styles.upcomingLabel}>다가오는 다음 액션</Text>
      <Text style={ui.name}>{formatDate(upcoming.activity.nextActionAt!)}</Text>
      <Text style={ui.muted}>{upcoming.activity.type} 기록에 등록된 일정</Text>
    </View> : null}

    {activities.map(activity => {
      const tone = activityColors[activity.type];
      const deleting = deletingId === activity.id;
      return <View key={activity.id} style={[ui.card, styles.card]}>
        <View style={ui.row}>
          <View style={[styles.badge, { backgroundColor: tone.background }]}>
            <Text style={[styles.badgeText, { color: tone.foreground }]}>{activity.type}</Text>
          </View>
          <Text style={[ui.muted, ui.grow]}>{formatDateTime(activity.createdAt)}</Text>
        </View>
        <Text style={ui.body}>{activity.content}</Text>
        {activity.nextActionAt ? <View style={styles.nextAction}>
          <Text style={styles.nextActionLabel}>다음 액션</Text>
          <Text style={ui.body}>{formatDate(activity.nextActionAt)}</Text>
        </View> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={activity.type + ' 활동 기록 삭제'}
          accessibilityState={{ disabled: disabled || deletingId !== null }}
          disabled={disabled || deletingId !== null}
          onPress={() => confirmDelete(activity.id)}
          style={({ pressed }) => [styles.delete, (pressed || deleting) && styles.pressed]}
        >
          <Text style={styles.deleteText}>{deleting ? '삭제 중...' : '기록 삭제'}</Text>
        </Pressable>
      </View>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  upcoming: {
    gap: 4,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#FFF8E8',
    borderWidth: 1,
    borderColor: '#F2DFC0',
  },
  upcomingLabel: { color: '#976B28', fontSize: 13, lineHeight: 20, fontWeight: '700' },
  card: { gap: 12 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  nextAction: { gap: 3, padding: 12, borderRadius: 10, backgroundColor: colors.surface },
  nextActionLabel: { color: colors.primaryDark, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  delete: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  deleteText: { color: colors.error, fontSize: 13, fontWeight: '600' },
  pressed: { opacity: 0.55 },
});
