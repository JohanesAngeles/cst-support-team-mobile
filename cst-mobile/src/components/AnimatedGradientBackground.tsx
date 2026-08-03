import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

// Each config describes one "state" of the gradient — colors + direction.
// Rotating the direction (NW→SE, NE→SW, SE→NW, SW→NE) across states makes it
// look like the gradient sweeps slowly around the screen.

interface GradConfig {
  colors: [string, string, string];
  start:  { x: number; y: number };
  end:    { x: number; y: number };
}

const LIGHT: GradConfig[] = [
  { colors: ['#D8E0FF', '#F5F7FF', '#FFE8D6'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  { colors: ['#FFE8D6', '#F5F7FF', '#D6EEFF'], start: { x: 1, y: 0 }, end: { x: 0, y: 1 } },
  { colors: ['#D6EEFF', '#F5F7FF', '#E8D6FF'], start: { x: 1, y: 1 }, end: { x: 0, y: 0 } },
  { colors: ['#E8D6FF', '#F5F7FF', '#D8E0FF'], start: { x: 0, y: 1 }, end: { x: 1, y: 0 } },
];

const FADE_DURATION = 2500;  // ms — how long each cross-fade takes
const HOLD_DURATION = 3000;  // ms — how long to hold before next fade

// Isolated component: animation state lives here, does NOT bubble up to parent.
// Children of AnimatedGradientBackground never re-render due to this animation.
function GradientLayer({ configs, baseBg }: { configs: GradConfig[]; baseBg: string }) {
  const [idx, setIdx] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const cycle = () => {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: FADE_DURATION,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return;
        // Advance to next config and reset opacity so new "next" starts invisible
        setIdx(prev => (prev + 1) % configs.length);
        fadeAnim.setValue(0);
        timer.current = setTimeout(cycle, HOLD_DURATION);
      });
    };

    timer.current = setTimeout(cycle, HOLD_DURATION);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      fadeAnim.stopAnimation();
    };
  }, []);

  const curr = configs[idx];
  const next = configs[(idx + 1) % configs.length];

  return (
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: baseBg }]} pointerEvents="none">
      {/* Base layer — always fully visible */}
      <LinearGradient
        colors={curr.colors}
        start={curr.start}
        end={curr.end}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Top layer — fades in to become the new base */}
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: fadeAnim }]}>
        <LinearGradient
          colors={next.colors}
          start={next.start}
          end={next.end}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </View>
  );
}

interface Props {
  children?: React.ReactNode;
  style?: ViewStyle;
}

export default function AnimatedGradientBackground({ children, style }: Props) {
  const { isDark } = useTheme();

  // Dark mode is a flat single color — no animated gradient sweep.
  if (isDark) {
    return (
      <View style={[{ flex: 1, backgroundColor: '#000000' }, style]}>
        {children}
      </View>
    );
  }

  return (
    <View style={[{ flex: 1, backgroundColor: '#F5F7FF' }, style]}>
      <GradientLayer configs={LIGHT} baseBg="#F5F7FF" />
      {children}
    </View>
  );
}
