import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import { useUpcomingSalesActions } from '../hooks/useUpcomingSalesActions';
import { ui } from './MainScreenLayout';
import SectionHeader from './SectionHeader';
import StatusBadge from './StatusBadge';

type Props = {
  onSelectStore: (storeId: string) => void;
};

type DateParts = { year: number; month: number; day: number };

const SEOUL_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

function seoulDateParts(date: Date): DateParts | null {
  if (Number.isNaN(date.getTime())) return null;
  const values = Object.fromEntries(
    SEOUL_DATE_FORMATTER.formatToParts(date)
      .filter(part => part.type === 'year' || part.type === 'month' || part.type === 'day')
      .map(part => [part.type, Number(part.value)]),
  ) as Partial<DateParts>;
  if (!values.year || !values.month || !values.day) return null;
  return values as DateParts;
}

function dateLabel(value: string): string {
  const target = seoulDateParts(new Date(value));
  const today = seoulDateParts(new Date());
  if (!target || !today) return '날짜 확인 불가';

  const targetDay = Date.UTC(target.year, target.month - 1, target.day);
  const todayDay = Date.UTC(today.year, today.month - 1, today.day);
  const difference = Math.round((targetDay - todayDay) / 86_400_000);
  if (difference === 0) return '오늘';
  if (difference === 1) return '내일';
  return `${target.month}월 ${target.day}일`;
}

export default function UpcomingSalesActionsSection({ onSelectStore }: Props) {
  const { actions, loading, error } = useUpcomingSalesActions();
  const visibleActions = actions.slice(0, 5);

  return <View style={ui.section}>
    <SectionHeader title="다가오는 영업 일정" />
    {loading ? <View style={ui.empty}>
      <Text style={ui.name}>영업 일정을 불러오는 중...</Text>
    </View> : null}
    {!loading && error ? <View style={ui.empty}>
      <Text style={ui.name}>다가오는 영업 일정을 불러오지 못했습니다.</Text>
      <Text style={ui.muted}>{error}</Text>
    </View> : null}
    {!loading && !error ? visibleActions.map(action =>
      <Pressable
        key={action.activityId}
        accessibilityRole="button"
        accessibilityLabel={action.storeName + ' 영업 일정 상세 보기'}
        onPress={() => onSelectStore(action.storeId)}
        style={({ pressed }) => [ui.card, styles.card, pressed && styles.pressed]}
      >
        <View style={ui.row}>
          <Text style={styles.date}>{dateLabel(action.nextActionAt)}</Text>
          <View style={ui.grow}><Text style={ui.name}>{action.storeName}</Text></View>
          <StatusBadge status={action.status} />
        </View>
        <Text style={styles.type}>{action.type}</Text>
        <Text numberOfLines={3} style={ui.body}>{action.content}</Text>
      </Pressable>) : null}
    {!loading && !error && !visibleActions.length ? <View style={ui.empty}>
      <Text style={ui.name}>예정된 다음 영업 일정이 없습니다.</Text>
      <Text style={ui.muted}>영업 활동에서 다음 액션 날짜를 등록해 보세요.</Text>
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  date: { color: colors.primaryDark, fontSize: 15, lineHeight: 22, fontWeight: '800' },
  type: { color: colors.textSecondary, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  pressed: { opacity: 0.65 },
});
