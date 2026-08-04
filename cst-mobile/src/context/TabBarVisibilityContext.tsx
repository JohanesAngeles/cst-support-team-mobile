import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated } from 'react-native';

type TabBarVisibilityContextValue = {
  translateY: Animated.Value;
  hidden: boolean;
  show: () => void;
  hide: () => void;
};

const TabBarVisibilityContext = createContext<TabBarVisibilityContextValue | null>(null);

// Lets a full-screen bottom sheet (e.g. the Dashboard map) slide the floating
// tab bar out of the way while expanded, and bring it back on collapse —
// the tab bar is rendered by MainTabs, several levels above the sheet.
export function TabBarVisibilityProvider({ children }: { children: React.ReactNode }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const [hidden, setHidden] = useState(false);

  const show = useCallback(() => {
    setHidden(false);
    Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }).start();
  }, [translateY]);

  const hide = useCallback(() => {
    setHidden(true);
    Animated.timing(translateY, { toValue: 140, duration: 220, useNativeDriver: true }).start();
  }, [translateY]);

  return (
    <TabBarVisibilityContext.Provider value={{ translateY, hidden, show, hide }}>
      {children}
    </TabBarVisibilityContext.Provider>
  );
}

export function useTabBarVisibility() {
  const ctx = useContext(TabBarVisibilityContext);
  if (!ctx) throw new Error('useTabBarVisibility must be used within a TabBarVisibilityProvider');
  return ctx;
}
