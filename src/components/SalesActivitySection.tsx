import { Text, View } from 'react-native';
import { useSalesActivities } from '../hooks/useSalesActivities';
import { ui } from './MainScreenLayout';
import SalesActivityForm from './SalesActivityForm';
import SalesActivityList from './SalesActivityList';

type Props = {
  storeId: string;
  disabled?: boolean;
};

export default function SalesActivitySection({ storeId, disabled = false }: Props) {
  const {
    activities,
    loading,
    error,
    addActivity,
    removeActivity,
  } = useSalesActivities(storeId);

  return <>
    <View style={ui.section}>
      <Text style={ui.name}>새 영업 활동</Text>
      <SalesActivityForm disabled={disabled} onCreate={addActivity} />
    </View>
    <View style={ui.section}>
      <Text style={ui.name}>영업 활동 이력</Text>
      <SalesActivityList
        activities={activities}
        loading={loading}
        error={error}
        disabled={disabled}
        onDelete={removeActivity}
      />
    </View>
  </>;
}
