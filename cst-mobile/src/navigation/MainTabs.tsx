import React from 'react';
import { View, Text, TouchableOpacity, Image, Animated } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { GestureDetector, Gesture, Directions } from 'react-native-gesture-handler';
import { useColors } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { TabBarVisibilityProvider, useTabBarVisibility } from '../context/TabBarVisibilityContext';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import DocumentVaultScreen from '../screens/features/DocumentVaultScreen';
import FeaturesScreen from '../screens/features/FeaturesScreen';
import FuelLogScreen from '../screens/features/FuelLogScreen';
import ProfileScreen from '../screens/features/ProfileScreen';
import RoadReadyScreen from '../screens/features/RoadReadyScreen';

const TAB_ORDER = ['Dashboard', 'Documents', 'Game', 'Tools', 'Fuel', 'Profile'];

// Wraps a screen with left/right fling gestures to swipe between tabs
function makeSwipeable(Screen: React.ComponentType<any>, tabIndex: number) {
  return function SwipeableScreen(props: any) {
    const flingLeft = Gesture.Fling()
      .direction(Directions.LEFT)
      .runOnJS(true)
      .onEnd(() => {
        if (tabIndex < TAB_ORDER.length - 1) {
          props.navigation.navigate(TAB_ORDER[tabIndex + 1] as any);
        }
      });

    const flingRight = Gesture.Fling()
      .direction(Directions.RIGHT)
      .runOnJS(true)
      .onEnd(() => {
        if (tabIndex > 0) {
          props.navigation.navigate(TAB_ORDER[tabIndex - 1] as any);
        }
      });

    return (
      <GestureDetector gesture={Gesture.Exclusive(flingLeft, flingRight)}>
        <View style={{ flex: 1 }}>
          <Screen {...props} />
        </View>
      </GestureDetector>
    );
  };
}

export type MainTabParamList = {
  Dashboard: undefined;
  Documents: undefined;
  Game:      undefined;
  Tools:     undefined;
  Fuel:      undefined;
  Profile:   undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

type TabMeta = { outline: IoniconsName; filled: IoniconsName; tKey: string };
const TAB_META: Record<string, TabMeta> = {
  Dashboard: { outline: 'home-outline',            filled: 'home',            tKey: 'tabs.dashboard' },
  Documents: { outline: 'folder-outline',           filled: 'folder',          tKey: 'tabs.docs'      },
  Game:      { outline: 'game-controller-outline',  filled: 'game-controller', tKey: 'tabs.game'      },
  Tools:     { outline: 'grid-outline',             filled: 'grid',            tKey: 'tabs.tools'     },
  Fuel:      { outline: 'water-outline',            filled: 'water',           tKey: 'tabs.fuel'      },
  Profile:   { outline: 'person-outline',           filled: 'person',          tKey: 'tabs.profile'   },
};

// ─── Solid tab bar ──────────────────────────────────────────────────────────────
function GlassTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const Colors = useColors();
  const { user } = useAuth();
  const { translateY, hidden } = useTabBarVisibility();
  const initials = (user?.name ?? 'D').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Animated.View
      pointerEvents={hidden ? 'none' : 'box-none'}
      style={{
        position: 'absolute',
        bottom: insets.bottom - 4,
        left: 14,
        right: 14,
        transform: [{ translateY }],
      }}
    >
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 40,
        paddingVertical: 7,
        paddingHorizontal: 6,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.10,
        shadowRadius: 24,
        elevation: 16,
        overflow: 'hidden',
      }}>

        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const isProfile = route.name === 'Profile';
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
                backgroundColor: isFocused ? Colors.surfaceLight : 'transparent',
                borderWidth: isFocused ? 1 : 0,
                borderColor: Colors.border,
                gap: 7,
              }}
            >
              {isProfile ? (
                <View style={{
                  width: 22, height: 22, borderRadius: 11, overflow: 'hidden',
                  justifyContent: 'center', alignItems: 'center',
                  backgroundColor: isFocused ? Colors.primary : Colors.surfaceLight,
                }}>
                  {user?.avatarUrl
                    ? <Image source={{ uri: user.avatarUrl }} style={{ width: 22, height: 22 }} />
                    : <Text style={{ fontSize: 8, fontWeight: '800', color: isFocused ? Colors.white : Colors.textMuted }}>{initials}</Text>
                  }
                </View>
              ) : (
                <Ionicons
                  name={isFocused ? meta.filled : meta.outline}
                  size={21}
                  color={isFocused ? Colors.secondary : Colors.textMuted}
                />
              )}
              {isFocused && (
                <Text numberOfLines={1} style={{ color: Colors.secondary, fontSize: 13, fontWeight: '700', letterSpacing: 0.1 }}>
                  {label}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
}

// ─── Navigator ────────────────────────────────────────────────────────────────
export default function MainTabs() {
  return (
    <TabBarVisibilityProvider>
      <Tab.Navigator
        tabBar={props => <GlassTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
          sceneStyle: { backgroundColor: 'transparent' },
        }}
      >
        <Tab.Screen name="Dashboard" component={makeSwipeable(DashboardScreen,     0)} />
        <Tab.Screen name="Documents" component={makeSwipeable(DocumentVaultScreen, 1)} />
        <Tab.Screen name="Game"      component={makeSwipeable(RoadReadyScreen,     2)} />
        <Tab.Screen name="Tools"     component={makeSwipeable(FeaturesScreen,      3)} />
        <Tab.Screen name="Fuel"      component={makeSwipeable(FuelLogScreen,       4)} />
        <Tab.Screen name="Profile"   component={makeSwipeable(ProfileScreen,       5)} />
      </Tab.Navigator>
    </TabBarVisibilityProvider>
  );
}
