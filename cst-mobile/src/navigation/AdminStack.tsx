import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import AdminApplicationsScreen from '../screens/admin/AdminApplicationsScreen';
import AdminListingsScreen from '../screens/admin/AdminListingsScreen';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          elevation: 0,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={60}
            tint="light"
            style={{
              ...Platform.select({ ios: {}, android: { backgroundColor: 'rgba(255,255,255,0.92)' } }),
              flex: 1,
              borderTopWidth: 1,
              borderTopColor: 'rgba(0,0,0,0.08)',
            }}
          />
        ),
        tabBarActiveTintColor:   '#021B3A',
        tabBarInactiveTintColor: '#AEAEB2',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginBottom: 4 },
        tabBarIcon: ({ color, focused }) => {
          const icons: Record<string, any> = {
            Applications: focused ? 'document-text' : 'document-text-outline',
            Listings:     focused ? 'business'      : 'business-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Applications" component={AdminApplicationsScreen} />
      <Tab.Screen name="Listings"     component={AdminListingsScreen} />
    </Tab.Navigator>
  );
}

export default function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminTabs" component={AdminTabs} />
    </Stack.Navigator>
  );
}
