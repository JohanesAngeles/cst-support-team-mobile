import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../constants/colors';

export default function MaintenanceScreen({ message }: { message: string }) {
  const Colors = useColors();
  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <Ionicons name="construct" size={40} color={Colors.secondary} />
      <Text style={[styles.title, { color: Colors.text }]}>Road Ready Network is under maintenance</Text>
      <Text style={[styles.message, { color: Colors.textMuted }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  message: { fontSize: 13, textAlign: 'center', maxWidth: 300 },
});
