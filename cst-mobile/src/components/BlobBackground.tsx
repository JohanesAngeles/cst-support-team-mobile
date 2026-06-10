import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

// Simulates the landing site's ambient blob orbs.
// CSS filter:blur() doesn't exist in React Native, so each "blob" is built
// from 3 concentric ovals at increasing opacity — outer ring faintest,
// core brightest — which reproduces the soft radial glow without a blur filter.

interface BlobProps {
  color: string;
  width: number;
  height: number;
  style?: ViewStyle;
}

function Blob({ color, width, height, style }: BlobProps) {
  return (
    <View style={[{ position: 'absolute', width, height }, style]} pointerEvents="none">
      {/* Outer halo */}
      <View style={[StyleSheet.absoluteFillObject, {
        borderRadius: width / 2,
        backgroundColor: color,
        opacity: 0.18,
      }]} />
      {/* Mid glow */}
      <View style={{
        position: 'absolute',
        top: '15%', left: '15%', right: '15%', bottom: '15%',
        borderRadius: width * 0.35,
        backgroundColor: color,
        opacity: 0.22,
      }} />
      {/* Core */}
      <View style={{
        position: 'absolute',
        top: '30%', left: '30%', right: '30%', bottom: '30%',
        borderRadius: width * 0.2,
        backgroundColor: color,
        opacity: 0.28,
      }} />
    </View>
  );
}

interface Props {
  children?: React.ReactNode;
  style?: ViewStyle;
}

// Blob positions match the landing site layout:
//   Orange — left side, mid-height
//   Blue   — top right corner
//   Indigo — bottom right
export default function BlobBackground({ children, style }: Props) {
  return (
    <View style={[{ flex: 1, backgroundColor: '#FAFBFF' }, style]}>
      {/* Blob layer — rendered first so it sits behind all children */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <Blob color="#F97316" width={360} height={320} style={{ top: 80,  left: -80 }} />
        <Blob color="#6382F6" width={340} height={300} style={{ top: -60, right: -60 }} />
        <Blob color="#8B5CF6" width={320} height={280} style={{ bottom: 100, right: -50 }} />
      </View>
      {children}
    </View>
  );
}
