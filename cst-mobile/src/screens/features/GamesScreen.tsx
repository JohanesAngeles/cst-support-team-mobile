import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useColors } from '../../constants/colors';
import { MainStackParamList } from '../../navigation/MainStack';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const games = [
  {
    icon: 'trophy-outline',
    label: "America's Top Trucker™",
    desc: 'Play the Weekly Challenge, earn pts, and climb national leaderboards',
    color: '#FFD700',
    screen: 'AmericasTopTrucker' as const,
    featured: true,
  },
  {
    icon: 'star-outline',
    label: 'Road Ready Score',
    desc: 'Build your 1,000-point driver profile across 4 game modes',
    color: '#2C6EBD',
    screen: 'RoadReady' as const,
  },
  {
    icon: 'stopwatch-outline',
    label: 'CDL Skill Challenge',
    desc: 'Timed CDL knowledge challenges — beat the clock',
    color: '#E74C3C',
    screen: 'CDLChallenge' as const,
  },
  {
    icon: 'grid-outline',
    label: 'Trucker Crossword',
    desc: 'Test your trucking knowledge with a daily crossword',
    color: '#9B59B6',
    screen: 'TruckerCrossword' as const,
  },
  {
    icon: 'help-circle-outline',
    label: 'Trucking Trivia',
    desc: 'How well do you know the road?',
    color: '#F39C12',
    screen: 'TruckingTrivia' as const,
  },
];

export default function GamesScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: 20, paddingBottom: 40 },
    subtitle: { color: Colors.textMuted, fontSize: 14, marginBottom: 24, lineHeight: 20 },
    grid: { gap: 16 },
    card: {
      backgroundColor: Colors.surface, borderRadius: 16,
      padding: 24, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', gap: 10,
    },
    featuredCard: { borderWidth: 2, borderColor: Colors.secondary + '88' },
    featuredBadge: { backgroundColor: Colors.secondary, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
    featuredBadgeText: { color: Colors.text, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    iconCircle: {
      width: 72, height: 72, borderRadius: 36,
      justifyContent: 'center', alignItems: 'center',
    },
    cardLabel: { color: Colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
    cardDesc: { color: Colors.textMuted, fontSize: 13, textAlign: 'center' },
    playBtn: {
      marginTop: 6, paddingHorizontal: 32, paddingVertical: 10,
      borderRadius: 20,
    },
    playBtnText: { color: Colors.text, fontWeight: '800', fontSize: 14 },
  }), [Colors]);
  const navigation = useNavigation<Nav>();


  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.subtitle}>Beat the wait at the dock — play & learn trucking facts.</Text>

      <View style={styles.grid}>
        {games.map((g) => (
          <TouchableOpacity
            key={g.label}
            style={[styles.card, (g as any).featured && styles.featuredCard]}
            onPress={() => navigation.navigate(g.screen as any)}
            activeOpacity={0.75}
          >
            <View style={[styles.iconCircle, { backgroundColor: g.color + '22' }]}>
              <Ionicons name={g.icon as any} size={36} color={g.color} />
            </View>
            {(g as any).featured && (
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredBadgeText}>FEATURED</Text>
              </View>
            )}
            <Text style={styles.cardLabel}>{g.label}</Text>
            <Text style={styles.cardDesc}>{g.desc}</Text>
            <View style={[styles.playBtn, { backgroundColor: g.color }]}>
              <Text style={styles.playBtnText}>{(g as any).featured ? 'Play Now' : 'Play'}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}
