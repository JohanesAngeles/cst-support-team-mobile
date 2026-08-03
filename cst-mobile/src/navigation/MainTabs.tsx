import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { GestureDetector, Gesture, Directions } from 'react-native-gesture-handler';
import { useColors } from '../constants/colors';
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

// ─── Floating glass tab bar ────────────────────────────────────────────────────
function GlassTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const Colors = useColors();

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
        backgroundColor: 'rgba(10, 27, 51, 0.88)',
        borderWidth: 1,
        borderColor: 'rgba(200, 210, 220, 0.25)',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.10,
        shadowRadius: 24,
        elevation: 16,
        overflow: 'hidden',
      }}>

        {/* White glass sheen */}
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%' }}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.10)', 'rgba(255, 255, 255, 0.00)']}
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
                backgroundColor: isFocused ? 'rgba(200, 210, 220, 0.14)' : 'transparent',
                borderWidth: isFocused ? 1 : 0,
                borderColor: 'rgba(200, 210, 220, 0.30)',
                gap: 7,
              }}
            >
              <Ionicons
                name={isFocused ? meta.filled : meta.outline}
                size={21}
                color={isFocused ? Colors.secondary : 'rgba(255, 255, 255, 0.35)'}
              />
              {isFocused && (
                <Text numberOfLines={1} style={{ color: Colors.secondary, fontSize: 13, fontWeight: '700', letterSpacing: 0.1 }}>
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
  );
}
