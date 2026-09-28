import Ionicons from '@expo/vector-icons/Ionicons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { ComponentProps } from 'react';
import { colors } from '../constants/colors';
import type { MainTabParamList } from '../types/navigation';
import HomeScreen from '../screens/HomeScreen';
import MapScreen from '../screens/MapScreen';
import SalesScreen from '../screens/SalesScreen';
import DashboardScreen from '../screens/DashboardScreen';
import MyPageScreen from '../screens/MyPageScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
type Icon = ComponentProps<typeof Ionicons>['name'];
const icons: Record<keyof MainTabParamList, [Icon, Icon]> = {
  Home: ['home-outline', 'home'], Map: ['map-outline', 'map'],
  Sales: ['briefcase-outline', 'briefcase'], Dashboard: ['bar-chart-outline', 'bar-chart'],
  MyPage: ['person-outline', 'person'],
};

export default function MainNavigator() {
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textSecondary,
      tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border, elevation: 0 },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      tabBarLabelPosition: 'below-icon',
      tabBarHideOnKeyboard: true,
      tabBarIcon: ({ focused, color, size }) => <Ionicons name={icons[route.name][focused ? 1 : 0]} color={color} size={size} />,
    })}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: '홈' }} />
      <Tab.Screen name="Map" component={MapScreen} options={{ title: '지도' }} />
      <Tab.Screen name="Sales" component={SalesScreen} options={{ title: '영업관리' }} />
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: '대시보드' }} />
      <Tab.Screen name="MyPage" component={MyPageScreen} options={{ title: '마이' }} />
    </Tab.Navigator>
  );
}
