import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../constants/colors';

export default function DeveloperScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: 20, paddingBottom: 40 },
    hero: {
      backgroundColor: '#021B3A', borderRadius: 20, padding: 28,
      alignItems: 'center', gap: 10, marginBottom: 24,
    },
    avatarCircle: {
      width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(255,255,255,0.12)',
      borderWidth: 2, borderColor: '#F4C430', justifyContent: 'center', alignItems: 'center', marginBottom: 6,
    },
    name: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', textAlign: 'center' },
    roleBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: '#F4C430', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginTop: 4,
    },
    roleBadgeText: { color: '#021B3A', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
    titleText: { color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center', marginTop: 4 },
    card: {
      backgroundColor: Colors.surface, borderRadius: 16, padding: 18,
      borderWidth: 1, borderColor: Colors.border, gap: 10, marginBottom: 16,
    },
    cardTitle: { color: Colors.text, fontSize: 15, fontWeight: '800', marginBottom: 2 },
    cardBody: { color: Colors.textMuted, fontSize: 13, lineHeight: 20 },
    footer: { color: Colors.border, fontSize: 12, textAlign: 'center', marginTop: 12 },
  }), [Colors]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={40} color="#F4C430" />
          </View>
          <Text style={styles.name}>Otis L. Cooper</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="construct" size={13} color="#021B3A" />
            <Text style={styles.roleBadgeText}>APP DEVELOPER</Text>
          </View>
          <Text style={styles.titleText}>Bounty Hunter Trucker</Text>
        </View>

        {/* About */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>About the Developer</Text>
          <Text style={styles.cardBody}>
            Otis L. Cooper built the Road Ready Network app to give truckers a single place to log
            hours, track expenses, find help on the road, and stay protected — built by someone who
            knows the life behind the wheel firsthand.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>A Note From the Road</Text>
          <Text style={styles.cardBody}>
            Every tool in this app comes from real problems faced by real drivers. If something
            doesn't work the way it should, that feedback goes straight into making the next update
            better.
          </Text>
        </View>

        <Text style={styles.footer}>Road Ready Network · Built for truckers, by truckers</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
