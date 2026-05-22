import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import DocumentVaultScreen from '../screens/features/DocumentVaultScreen';
import IFTAScreen from '../screens/features/IFTAScreen';
import FuelScreen from '../screens/features/FuelScreen';
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
  ({ focused, color, size }: { focused: boolean; color: string; size: number }) => (
    <Ionicons name={focused ? focusedName : name} size={size} color={color} />
  );

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 65,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: Colors.secondary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarIcon: tabIcon('home-outline', 'home') }}
      />
      <Tab.Screen
        name="Documents"
        component={DocumentVaultScreen}
        options={{ tabBarIcon: tabIcon('folder-outline', 'folder'), tabBarLabel: 'Docs' }}
      />
      <Tab.Screen
        name="IFTA"
        component={IFTAScreen}
        options={{ tabBarIcon: tabIcon('map-outline', 'map') }}
      />
      <Tab.Screen
        name="Fuel"
        component={FuelScreen}
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
