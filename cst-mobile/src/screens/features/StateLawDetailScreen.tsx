import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp } from '@react-navigation/native';
import { useColors } from '../../constants/colors';
import { MainStackParamList } from '../../navigation/MainStack';
import { STATE_LAWS } from '../../data/stateLaws';

type Props = { route: RouteProp<MainStackParamList, 'StateLawDetail'> };

export default function StateLawDetailScreen({ route }: Props) {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: 16, paddingBottom: 40 },
    notFound: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    notFoundText: { color: Colors.textMuted, fontSize: 16 },

    hero: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: Colors.surface, borderRadius: 14,
      padding: 16, marginBottom: 12,
      borderWidth: 1, borderColor: Colors.border,
    },
    heroAbbrBox: {
      width: 60, height: 60, borderRadius: 12,
      backgroundColor: Colors.secondary + '22',
      borderWidth: 2, borderColor: Colors.secondary,
      justifyContent: 'center', alignItems: 'center', marginRight: 14,
    },
    heroAbbr: { color: Colors.secondary, fontSize: 20, fontWeight: '900' },
    heroBody: { flex: 1 },
    heroState: { color: Colors.text, fontSize: 20, fontWeight: '800' },
    heroSub: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },

    quickRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    quickCard: {
      flex: 1, backgroundColor: Colors.surface, borderRadius: 12,
      padding: 16, alignItems: 'center', gap: 4,
      borderWidth: 1, borderColor: Colors.border,
    },
    quickValue: { color: Colors.secondary, fontSize: 22, fontWeight: '900' },
    quickLabel: { color: Colors.textMuted, fontSize: 11, textAlign: 'center' },

    card: {
      backgroundColor: Colors.surface, borderRadius: 12,
      borderWidth: 1, borderColor: Colors.border,
      borderLeftWidth: 4, padding: 14, marginBottom: 12,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    cardIconBox: {
      width: 34, height: 34, borderRadius: 8,
      justifyContent: 'center', alignItems: 'center',
    },
    cardTitle: { color: Colors.text, fontSize: 15, fontWeight: '800', flex: 1 },
    ruleRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
      paddingVertical: 6, borderTopWidth: 1, borderTopColor: Colors.border,
    },
    ruleLabel: { color: Colors.textMuted, fontSize: 13, flex: 1, paddingRight: 8 },
    ruleValue: { color: Colors.text, fontSize: 13, fontWeight: '600', textAlign: 'right', flex: 1 },

    disclaimer: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 6,
      backgroundColor: Colors.surface, borderRadius: 10, padding: 12,
      borderWidth: 1, borderColor: Colors.border, marginTop: 4,
    },
    disclaimerText: { color: Colors.textMuted, fontSize: 11, flex: 1, lineHeight: 16 },
  }), [Colors]);
  const entry = STATE_LAWS.find((s) => s.abbr === route.params.abbr);

  if (!entry) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notFound}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.notFoundText}>State not found</Text>
        </View>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroAbbrBox}>
            <Text style={styles.heroAbbr}>{entry.abbr}</Text>
          </View>
          <View style={styles.heroBody}>
            <Text style={styles.heroState}>{entry.state}</Text>
            <Text style={styles.heroSub}>Trucking Laws & Regulations</Text>
          </View>
        </View>

        {/* Quick stats */}
        <View style={styles.quickRow}>
          <View style={styles.quickCard}>
            <Ionicons name="speedometer-outline" size={22} color={Colors.secondary} />
            <Text style={styles.quickValue}>{entry.truckSpeed} mph</Text>
            <Text style={styles.quickLabel}>Truck Speed</Text>
          </View>
          <View style={styles.quickCard}>
            <Ionicons name="water-outline" size={22} color="#3498DB" />
            <Text style={[styles.quickValue, { color: '#3498DB' }]}>{entry.dieselTax}</Text>
            <Text style={styles.quickLabel}>Diesel Tax/gal</Text>
          </View>
        </View>

        {/* Category cards */}
        {entry.categories.map((cat) => (
          <View key={cat.title} style={[styles.card, { borderLeftColor: cat.color }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBox, { backgroundColor: cat.color + '22' }]}>
                <Ionicons name={cat.icon as any} size={20} color={cat.color} />
              </View>
              <Text style={styles.cardTitle}>{cat.title}</Text>
            </View>
            {cat.rules.map((rule) => (
              <View key={rule.label} style={styles.ruleRow}>
                <Text style={styles.ruleLabel}>{rule.label}</Text>
                <Text style={styles.ruleValue}>{rule.value}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.disclaimerText}>
            For reference only. Laws change — always verify with official state DOT sources before operating.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
