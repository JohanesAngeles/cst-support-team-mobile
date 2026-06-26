import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useColors } from '../../constants/colors';
import { MainStackParamList } from '../../navigation/MainStack';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const FREE_FEATURES = [
  'Basic Trip & Fuel Logging',
  'HOS Tracker (manual)',
  'State Law Reference',
  'Axle Weight Calculator',
  'Rate Tools',
  'Driver Calendar',
  'Emergency Contacts',
  'Basic Maintenance Tracker',
];

const PREMIUM_FEATURES = [
  { icon: 'shield-checkmark-outline', label: 'AI Legal Assistant', desc: 'Unlimited legal Q&A powered by AI' },
  { icon: 'folder-outline', label: 'Document Vault', desc: 'Unlimited cloud document storage' },
  { icon: 'chatbubbles-outline', label: 'Driver-to-Driver Chat', desc: 'Community channels & private messaging' },
  { icon: 'warning-outline', label: 'Broker Blacklist', desc: 'Access & submit community broker warnings' },
  { icon: 'people-outline', label: 'Owner-Operator Network', desc: 'Posts, replies & load opportunities' },
  { icon: 'receipt-outline', label: 'Invoice Generator', desc: 'Create & export professional invoices to PDF' },
  { icon: 'clipboard-outline', label: 'DVIR Reports', desc: 'Pre/post-trip inspections with PDF export' },
  { icon: 'flask-outline', label: 'Drug Test Log', desc: 'Full FMCSA compliance tracking' },
  { icon: 'notifications-outline', label: 'HOS Push Alerts', desc: 'Real-time driving limit notifications' },
  { icon: 'moon-outline', label: 'Sleep & Fatigue Log', desc: 'Fatigue compliance tracking & scoring' },
  { icon: 'business-outline', label: 'Shipper Directory', desc: 'Personal address book with dock details' },
  { icon: 'car-outline', label: 'Parking Tracker', desc: 'Manage truck stop reservations' },
  { icon: 'gift-outline', label: 'Referral Rewards', desc: 'Earn free months by referring other drivers' },
  { icon: 'bar-chart-outline', label: 'Advanced P&L', desc: 'Full profit & loss with export to PDF' },
];

export default function PremiumGateScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: 16, paddingBottom: 40, gap: 14 },
    heroCard: {
      backgroundColor: Colors.surface, borderRadius: 20, padding: 20,
      alignItems: 'center', gap: 10, borderWidth: 2, borderColor: Colors.secondary + '55',
    },
    crownContainer: {
      width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.secondary + '22',
      alignItems: 'center', justifyContent: 'center',
    },
    heroTitle: { color: Colors.text, fontSize: 22, fontWeight: '900', textAlign: 'center' },
    heroSub: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 19 },
    priceRow: { flexDirection: 'row', gap: 0, width: '100%', marginTop: 6 },
    priceBox: { flex: 1, alignItems: 'center', gap: 2 },
    priceSep: { width: 1, backgroundColor: Colors.border, marginVertical: 8 },
    priceAmount: { color: Colors.secondary, fontSize: 24, fontWeight: '900' },
    pricePeriod: { color: Colors.textMuted, fontSize: 11 },
    saveBadge: { backgroundColor: Colors.success + '22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 2 },
    saveText: { color: Colors.success, fontSize: 10, fontWeight: '700' },
    sectionCard: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 16, gap: 2 },
    sectionTitle: { color: Colors.text, fontSize: 15, fontWeight: '800', marginBottom: 8 },
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border },
    featureIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.secondary + '18', alignItems: 'center', justifyContent: 'center' },
    featureInfo: { flex: 1 },
    featureLabel: { color: Colors.text, fontSize: 13, fontWeight: '700' },
    featureDesc: { color: Colors.textMuted, fontSize: 11, marginTop: 1 },
    freeCard: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 16, gap: 8 },
    freeTitle: { color: Colors.textMuted, fontSize: 13, fontWeight: '700' },
    freeGrid: { gap: 6 },
    freeItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    freeText: { color: Colors.textMuted, fontSize: 12 },
    ctaBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: Colors.secondary, borderRadius: 14, paddingVertical: 16,
    },
    ctaBtnText: { color: Colors.textDark, fontWeight: '900', fontSize: 16 },
    learnMore: { alignItems: 'center', paddingVertical: 4 },
    learnMoreText: { color: Colors.secondary, fontSize: 13, textDecorationLine: 'underline' },
    guarantee: {
      flexDirection: 'row', gap: 8, alignItems: 'flex-start',
      backgroundColor: Colors.surface, borderRadius: 10, padding: 12,
      borderWidth: 1, borderColor: Colors.border,
    },
    guaranteeText: { flex: 1, color: Colors.textMuted, fontSize: 11, lineHeight: 16 },
  }), [Colors]);
  const navigation = useNavigation<Nav>();


  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Hero */}
        <View style={styles.heroCard}>
          <View style={styles.crownContainer}>
            <Ionicons name="star" size={36} color={Colors.secondary} />
          </View>
          <Text style={styles.heroTitle}>Upgrade to Road Ready Pro</Text>
          <Text style={styles.heroSub}>Everything a professional truck driver needs in one app. No hidden fees, no per-feature charges.</Text>

          <View style={styles.priceRow}>
            <View style={styles.priceBox}>
              <Text style={styles.priceAmount}>$10.00</Text>
              <Text style={styles.pricePeriod}>per month</Text>
            </View>
            <View style={styles.priceSep} />
            <View style={styles.priceBox}>
              <Text style={styles.priceAmount}>$100.00</Text>
              <Text style={styles.pricePeriod}>per year</Text>
              <View style={styles.saveBadge}>
                <Text style={styles.saveText}>Save 17%</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Premium features */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Everything in Pro</Text>
          {PREMIUM_FEATURES.map(f => (
            <View key={f.label} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon as any} size={18} color={Colors.secondary} />
              </View>
              <View style={styles.featureInfo}>
                <Text style={styles.featureLabel}>{f.label}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
            </View>
          ))}
        </View>

        {/* Free tier */}
        <View style={styles.freeCard}>
          <Text style={styles.freeTitle}>Free Tier Includes</Text>
          <View style={styles.freeGrid}>
            {FREE_FEATURES.map(f => (
              <View key={f} style={styles.freeItem}>
                <Ionicons name="checkmark-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.freeText}>{f}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.navigate('Subscription')}>
          <Ionicons name="star" size={18} color={Colors.textDark} />
          <Text style={styles.ctaBtnText}>Start Pro — First 7 Days Free</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.learnMore} onPress={() => navigation.navigate('Subscription')}>
          <Text style={styles.learnMoreText}>View subscription details & manage billing</Text>
        </TouchableOpacity>

        <View style={styles.guarantee}>
          <Ionicons name="shield-checkmark-outline" size={16} color={Colors.textMuted} />
          <Text style={styles.guaranteeText}>Cancel anytime. No contracts. 100% refund if you're unsatisfied in your first 7 days.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
