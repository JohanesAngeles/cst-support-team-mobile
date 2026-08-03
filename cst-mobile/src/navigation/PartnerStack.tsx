import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PartnerDashboardScreen from '../screens/partner/PartnerDashboardScreen';
import MyListingScreen        from '../screens/partner/MyListingScreen';
import PartnerReviewsScreen   from '../screens/partner/PartnerReviewsScreen';
import PartnerSubscriptionScreen from '../screens/partner/PartnerSubscriptionScreen';
import PartnerAccountScreen   from '../screens/partner/PartnerAccountScreen';
import { useColors } from '../constants/colors';

export type PartnerTabParamList = {
  Dashboard:    undefined;
  MyListing:    undefined;
  Reviews:      undefined;
  Subscription: undefined;
  Account:      undefined;
};

export type PartnerStackParamList = {
  PartnerTabs: undefined;
};

const Tab   = createBottomTabNavigator<PartnerTabParamList>();
const Stack = createNativeStackNavigator<PartnerStackParamList>();

type TabMeta = {
  outline: React.ComponentProps<typeof Ionicons>['name'];
  filled:  React.ComponentProps<typeof Ionicons>['name'];
  label:   string;
};

const TAB_META: Record<string, TabMeta> = {
  Dashboard:    { outline: 'home-outline',        filled: 'home',         label: 'Home'         },
  MyListing:    { outline: 'storefront-outline',   filled: 'storefront',   label: 'My Listing'   },
  Reviews:      { outline: 'star-outline',         filled: 'star',         label: 'Reviews'      },
  Subscription: { outline: 'card-outline',         filled: 'card',         label: 'Billing'      },
  Account:      { outline: 'person-outline',       filled: 'person',       label: 'Account'      },
};

function PartnerTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const Colors = useColors();

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', bottom: insets.bottom - 4, left: 14, right: 14 }}>
      <View style={s.tabBar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const meta = TAB_META[route.name];

          return (
            <TouchableOpacity
              key={route.key}
              onPress={() => { if (!isFocused) navigation.navigate(route.name as any); }}
              activeOpacity={0.75}
              style={[s.tabItem, isFocused && s.tabItemActive]}
            >
              <Ionicons
                name={isFocused ? meta.filled : meta.outline}
                size={21}
                color={isFocused ? Colors.secondary : Colors.textMuted}
              />
              {isFocused && (
                <Text style={s.tabLabel}>{meta.label}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function PartnerTabs() {
  const Colors = useColors();
  return (
    <Tab.Navigator
      tabBar={props => <PartnerTabBar {...props} />}
      screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' }, sceneStyle: { backgroundColor: Colors.background } }}
    >
      <Tab.Screen name="Dashboard"    component={PartnerDashboardScreen} />
      <Tab.Screen name="MyListing"    component={MyListingScreen} />
      <Tab.Screen name="Reviews"      component={PartnerReviewsScreen} />
      <Tab.Screen name="Subscription" component={PartnerSubscriptionScreen} />
      <Tab.Screen name="Account"      component={PartnerAccountScreen} />
    </Tab.Navigator>
  );
}

export default function PartnerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PartnerTabs" component={PartnerTabs} />
    </Stack.Navigator>
  );
}

const s = StyleSheet.create({
  tabBar: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 40, paddingVertical: 7, paddingHorizontal: 6,
    backgroundColor: 'rgba(10,27,51,0.88)',
    borderWidth: 1, borderColor: 'rgba(200,210,220,0.25)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10, shadowRadius: 24, elevation: 16,
  },
  tabItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, paddingHorizontal: 4, borderRadius: 30,
  },
  tabItemActive: {
    flex: 2, paddingHorizontal: 18, gap: 7,
    backgroundColor: 'rgba(200,210,220,0.14)',
    borderWidth: 1, borderColor: 'rgba(200,210,220,0.30)',
  },
  tabLabel: { color: '#C8D2DC', fontSize: 13, fontWeight: '700', letterSpacing: 0.1 },
});
