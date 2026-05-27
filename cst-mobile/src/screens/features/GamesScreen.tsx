import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { MainStackParamList } from '../../navigation/MainStack';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const games = [
  {
    icon: 'grid-outline',
    label: 'Trucker Crossword',
    desc: 'Test your trucking knowledge',
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
  const navigation = useNavigation<Nav>();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.subtitle}>Beat the wait at the dock — play & learn trucking facts.</Text>

      <View style={styles.grid}>
        {games.map((g) => (
          <TouchableOpacity
            key={g.label}
            style={styles.card}
            onPress={() => navigation.navigate(g.screen as any)}
            activeOpacity={0.75}
          >
            <View style={[styles.iconCircle, { backgroundColor: g.color + '22' }]}>
              <Ionicons name={g.icon as any} size={36} color={g.color} />
            </View>
            <Text style={styles.cardLabel}>{g.label}</Text>
            <Text style={styles.cardDesc}>{g.desc}</Text>
            <View style={[styles.playBtn, { backgroundColor: g.color }]}>
              <Text style={styles.playBtnText}>Play</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20 },
  subtitle: { color: Colors.textMuted, fontSize: 14, marginBottom: 24, lineHeight: 20 },
  grid: { gap: 16 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 16,
    padding: 24, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', gap: 10,
  },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center',
  },
  cardLabel: { color: Colors.white, fontSize: 18, fontWeight: '800' },
  cardDesc: { color: Colors.textMuted, fontSize: 13 },
  playBtn: {
    marginTop: 6, paddingHorizontal: 32, paddingVertical: 10,
    borderRadius: 20,
  },
  playBtnText: { color: Colors.white, fontWeight: '800', fontSize: 14 },
});
