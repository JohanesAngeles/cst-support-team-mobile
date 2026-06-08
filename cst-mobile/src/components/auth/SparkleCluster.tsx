import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useColors } from '../../constants/colors';

type Size = 'sm' | 'md' | 'lg';

const SIZES: Record<Size, { w: number; h: number; d: [number, number, number]; r: [number, number, number] }> = {
  sm: { w: 94,  h: 70,  d: [54, 38, 24], r: [6, 5, 3] },
  md: { w: 102, h: 80,  d: [60, 42, 26], r: [7, 5, 3] },
  lg: { w: 120, h: 92,  d: [70, 50, 32], r: [8, 6, 4] },
};

export default function SparkleCluster({ size = 'md' }: { size?: Size }) {
  const Colors = useColors();
  const cfg = SIZES[size];

  const diamond = (idx: number, left: number, top: number) => ({
    position: 'absolute' as const,
    width: cfg.d[idx], height: cfg.d[idx],
    left, top,
    borderRadius: cfg.r[idx],
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    transform: [{ rotate: '45deg' }],
  });

  const offsets: [number, number][] = size === 'lg'
    ? [[0, 20], [42, 10], [76, 2]]
    : size === 'sm'
    ? [[0, 14], [34, 8], [62, 2]]
    : [[0, 16], [38, 8], [68, 2]];

  return (
    <View style={{ width: cfg.w, height: cfg.h }}>
      <View style={diamond(0, offsets[0][0], offsets[0][1])} />
      <View style={diamond(1, offsets[1][0], offsets[1][1])} />
      <View style={diamond(2, offsets[2][0], offsets[2][1])} />
    </View>
  );
}
