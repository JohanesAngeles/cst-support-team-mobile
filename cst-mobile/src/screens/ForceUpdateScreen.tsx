import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../constants/colors';

export default function ForceUpdateScreen({ storeUrl }: { storeUrl?: string }) {
  const Colors = useColors();
  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <Ionicons name="cloud-download" size={40} color={Colors.secondary} />
      <Text style={[styles.title, { color: Colors.text }]}>Update Required</Text>
      <Text style={[styles.message, { color: Colors.textMuted }]}>
        A new version of Road Ready Network is required to continue. Please update from the{' '}
        {Platform.OS === 'ios' ? 'App Store' : 'Play Store'}.
      </Text>
      {storeUrl ? (
        <TouchableOpacity style={[styles.button, { backgroundColor: Colors.secondary }]} onPress={() => Linking.openURL(storeUrl)}>
          <Text style={styles.buttonText}>Update Now</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  message: { fontSize: 13, textAlign: 'center', maxWidth: 300 },
  button: { marginTop: 8, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24 },
  buttonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});
