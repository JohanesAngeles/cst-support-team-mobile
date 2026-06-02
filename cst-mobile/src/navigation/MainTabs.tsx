import React, { useMemo } from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../constants/colors';
import MainStack from './MainStack';
import DocumentVaultScreen from '../screens/features/DocumentVaultScreen';
import IFTATrackerScreen from '../screens/features/IFTATrackerScreen';
import FuelLogScreen from '../screens/features/FuelLogScreen';
import ProfileScreen from '../screens/features/ProfileScreen';

export type MainTabParamList = {
  Dashboard: undefined;
  Documents: undefined;
  IFTA: undefined;
  Fuel: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const tabIcon = (name: IoniconsName, focusedName: IoniconsName) =>
  ({ focused, color }: { focused: boolean; color: string; size: number }) => (
    <Ionicons name={focused ? focusedName : name} size={28} color={color} />
  );

export default function MainTabs() {
  const Colors = useColors();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          // Taller bar + proper safe-area padding so it never clips on iPhone
          height:        Platform.OS === 'ios' ? 94 : 78,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 10,
        },
        tabBarActiveTintColor:   Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={MainStack}
        options={{ tabBarIcon: tabIcon('home-outline', 'home') }}
      />
      <Tab.Screen
        name="Documents"
        component={DocumentVaultScreen}
        options={{ tabBarIcon: tabIcon('folder-outline', 'folder'), tabBarLabel: 'Docs' }}
      />
      <Tab.Screen
        name="IFTA"
        component={IFTATrackerScreen}
        options={{ tabBarIcon: tabIcon('map-outline', 'map') }}
      />
      <Tab.Screen
        name="Fuel"
        component={FuelLogScreen}
        options={{ tabBarIcon: tabIcon('water-outline', 'water') }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: tabIcon('person-outline', 'person') }}
      />
    </Tab.Navigator>
  );
}
