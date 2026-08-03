import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';

interface Props {
  onFinish: () => void;
}

const BG = '#000000';
const SILVER = '#C8D2DC';

export default function SplashScreen({ onFinish }: Props) {
  const logoOpacity   = useRef(new Animated.Value(0)).current;
  const logoScale     = useRef(new Animated.Value(0.82)).current;
  const tagOpacity    = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale,   { toValue: 1,   useNativeDriver: true, tension: 55, friction: 8 }),
        Animated.timing(logoOpacity, { toValue: 1,   duration: 500,         useNativeDriver: true }),
      ]),
      Animated.timing(tagOpacity, { toValue: 1, duration: 400, delay: 80, useNativeDriver: true }),
      Animated.delay(1100),
      Animated.timing(screenOpacity, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start(() => onFinish());
  }, []);

  return (
    <Animated.View style={[s.container, { opacity: screenOpacity }]}>

      {/* Logo */}
      <Animated.View style={[s.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <Image
          source={require('../../assets/logo/road_ready_logo.jpeg')}
          style={s.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Tagline */}
      <Animated.View style={[s.tagWrap, { opacity: tagOpacity }]}>
        <View style={s.divider} />
        <Text style={s.tagline}>Built for Truckers. Built to Win.</Text>
      </Animated.View>

      {/* Version */}
      <Animated.Text style={[s.version, { opacity: tagOpacity }]}>v1.0.0</Animated.Text>

    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  logoWrap: {
    alignItems: 'center',
  },
  logo: {
    width: 240,
    height: 120,
  },
  tagWrap: {
    alignItems: 'center',
    marginTop: 36,
    gap: 14,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: SILVER + '66',
    borderRadius: 1,
  },
  tagline: {
    color: '#8FA0B3',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.6,
  },
  version: {
    position: 'absolute',
    bottom: 48,
    color: '#4F6178',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});


