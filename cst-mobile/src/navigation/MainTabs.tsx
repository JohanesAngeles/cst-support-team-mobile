import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import DocumentVaultScreen from '../screens/features/DocumentVaultScreen';
import FeaturesScreen from '../screens/features/FeaturesScreen';
import FuelLogScreen from '../screens/features/FuelLogScreen';
import ProfileScreen from '../screens/features/ProfileScreen';

export type MainTabParamList = {
  Dashboard: undefined;
  Documents: undefined;
  Tools:     undefined;
  Fuel:      undefined;
  Profile:   undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

type TabMeta = { outline: IoniconsName; filled: IoniconsName; tKey: string };
const TAB_META: Record<string, TabMeta> = {
  Dashboard: { outline: 'home-outline',   filled: 'home',   tKey: 'tabs.dashboard' },
  Documents: { outline: 'folder-outline', filled: 'folder', tKey: 'tabs.docs'      },
  Tools:     { outline: 'grid-outline',   filled: 'grid',   tKey: 'tabs.tools'     },
  Fuel:      { outline: 'water-outline',  filled: 'water',  tKey: 'tabs.fuel'      },
  Profile:   { outline: 'person-outline', filled: 'person', tKey: 'tabs.profile'   },
};

// ─── Floating glass tab bar ────────────────────────────────────────────────────
function GlassTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        bottom: insets.bottom - 4,
        left: 14,
        right: 14,
      }}
    >
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 40,
        paddingVertical: 7,
        paddingHorizontal: 6,
        backgroundColor: 'rgba(4, 22, 70, 0.88)',
        borderWidth: 1,
        borderColor: 'rgba(100, 170, 255, 0.22)',
        shadowColor: '#0A2A6E',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.55,
        shadowRadius: 28,
        elevation: 28,
        overflow: 'hidden',
      }}>

        {/* Blue glass sheen — wrapped in View so pointerEvents works correctly */}
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%' }}>
          <LinearGradient
            colors={['rgba(100, 160, 255, 0.12)', 'rgba(100, 160, 255, 0.00)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ flex: 1, borderRadius: 40 }}
          />
        </View>

        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const meta = TAB_META[route.name] ?? {
            outline: 'ellipse-outline' as IoniconsName,
            filled:  'ellipse' as IoniconsName,
            tKey:    route.name,
          };
          const label = t(meta.tKey, { defaultValue: route.name });

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name as any);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.75}
              style={{
                flex: isFocused ? 2 : 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 10,
                paddingHorizontal: isFocused ? 18 : 4,
                borderRadius: 30,
                backgroundColor: isFocused ? 'rgba(100, 170, 255, 0.20)' : 'transparent',
                borderWidth: isFocused ? 1 : 0,
                borderColor: 'rgba(120, 190, 255, 0.25)',
                gap: 7,
              }}
            >
              <Ionicons
                name={isFocused ? meta.filled : meta.outline}
                size={21}
                color={isFocused ? '#FFFFFF' : 'rgba(255,255,255,0.42)'}
              />
              {isFocused && (
                <Text numberOfLines={1} style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700', letterSpacing: 0.1 }}>
                  {label}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Navigator ────────────────────────────────────────────────────────────────
export default function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={props => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' }, // hide default bar — GlassTabBar replaces it
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Documents" component={DocumentVaultScreen} />
      <Tab.Screen name="Tools"     component={FeaturesScreen} />
      <Tab.Screen name="Fuel"      component={FuelLogScreen} />
      <Tab.Screen name="Profile"   component={ProfileScreen} />
    </Tab.Navigator>
  );
}
