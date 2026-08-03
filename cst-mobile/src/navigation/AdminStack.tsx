import React from 'react';
import { View, Text, TouchableOpacity, Platform, Alert } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import AdminApplicationsScreen from '../screens/admin/AdminApplicationsScreen';
import AdminUniversityApplicationsScreen from '../screens/admin/AdminUniversityApplicationsScreen';
import AdminListingsScreen from '../screens/admin/AdminListingsScreen';
import AdminCashAppScreen from '../screens/admin/AdminCashAppScreen';
import { useAuth } from '../context/AuthContext';
import { useColors } from '../constants/colors';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function LogoutScreen() {
  const { logout } = useAuth();
  const Colors = useColors();
  React.useEffect(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  }, []);
  return <View style={{ flex: 1, backgroundColor: Colors.background }} />;
}

function AdminTabs() {
  const Colors = useColors();
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
            tint="dark"
            style={{
              ...Platform.select({ ios: {}, android: { backgroundColor: 'rgba(5,11,24,0.92)' } }),
              flex: 1,
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,255,255,0.08)',
            }}
          />
        ),
        tabBarActiveTintColor:   Colors.secondary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginBottom: 4 },
        tabBarIcon: ({ color, focused }) => {
          const icons: Record<string, any> = {
            Applications: focused ? 'document-text' : 'document-text-outline',
            University:   focused ? 'school'         : 'school-outline',
            Listings:     focused ? 'business'      : 'business-outline',
            CashApp:      focused ? 'cash'           : 'cash-outline',
            Logout:       'log-out-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={route.name === 'Logout' ? '#E53935' : color} />;
        },
      })}
    >
      <Tab.Screen name="Applications" component={AdminApplicationsScreen} />
      <Tab.Screen name="University"   component={AdminUniversityApplicationsScreen} />
      <Tab.Screen name="Listings"     component={AdminListingsScreen} />
      <Tab.Screen
        name="CashApp"
        component={AdminCashAppScreen}
        options={{ tabBarLabel: 'Cash App' }}
      />
      <Tab.Screen
        name="Logout"
        component={LogoutScreen}
        options={{
          tabBarLabel: 'Sign Out',
          tabBarActiveTintColor: '#E53935',
        }}
      />
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
