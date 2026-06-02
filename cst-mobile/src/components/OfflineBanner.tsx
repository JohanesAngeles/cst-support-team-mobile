import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useConnectivity } from '../hooks/useConnectivity';

export default function OfflineBanner() {
  const isOnline = useConnectivity();
  const [showBackOnline, setShowBackOnline] = useState(false);
  const prevOnline = useRef(true);
  const translateY = useRef(new Animated.Value(-60)).current;
  const visible = !isOnline || showBackOnline;

  useEffect(() => {
    // Came back online after being offline → flash "Back online"
    if (isOnline && prevOnline.current === false) {
      setShowBackOnline(true);
      const timer = setTimeout(() => setShowBackOnline(false), 2500);
      prevOnline.current = true;
      return () => clearTimeout(timer);
    }
    prevOnline.current = isOnline;
  }, [isOnline]);

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : -60,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible) return null;

  const isBack = isOnline && showBackOnline;

  return (
    <Animated.View style={[s.banner, { backgroundColor: isBack ? '#27AE60' : '#636E72' }, { transform: [{ translateY }] }]}>
      <Ionicons
        name={isBack ? 'checkmark-circle-outline' : 'cloud-offline-outline'}
        size={15}
        color="#FFFFFF"
      />
      <Text style={s.text}>
        {isBack ? 'Back online — syncing your data' : 'No connection — changes will sync when reconnected'}
      </Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 9, paddingHorizontal: 16,
  },
  text: { color: '#FFFFFF', fontSize: 12, fontWeight: '600', flex: 1 },
});
