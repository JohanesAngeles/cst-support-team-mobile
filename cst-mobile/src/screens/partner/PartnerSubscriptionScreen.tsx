import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';

const PLAN_FEATURES = [
  'Your business listed on the driver map',
  'Appear in driver searches by city & category',
  'Receive ratings and reviews from drivers',
  'View analytics (views & tap-to-calls)',
  'Direct call button for drivers',
  'Business hours & website link displayed',
];

export default function PartnerSubscriptionScreen() {
  const { user } = useAuth();

  const status = user?.subscriptionStatus ?? 'free';
  const plan   = user?.subscriptionPlan   ?? null;

  const isActive = status === 'active';
  const isFree   = status === 'free';

  return (
    <View style={s.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

          {/* Header */}
          <View style={s.topBar}>
            <View style={s.topBarIcon}>
              <Ionicons name="card" size={20} color="#021B3A" />
            </View>
            <Text style={s.topBarTitle}>Billing & Subscription</Text>
          </View>

          {/* Current status banner */}
          <LinearGradient
            colors={isActive ? ['#021B3A', '#03306B'] : ['#B8860B', '#D4A017']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.statusBanner}
          >
            <View style={s.statusIcon}>
              <Ionicons name={isActive ? 'shield-checkmark' : 'time-outline'} size={28} color={isActive ? '#FFFFFF' : '#021B3A'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.statusTitle, !isActive && { color: '#021B3A' }]}>
                {isFree ? '30-Day Free Trial' : isActive ? `${plan === 'annual' ? 'Annual' : 'Monthly'} Plan` : 'Subscription Inactive'}
              </Text>
              <Text style={[s.statusSub, !isActive && { color: 'rgba(2,27,58,0.7)' }]}>
                {isFree
                  ? 'Your listing is live and free for your first 30 days.'
                  : isActive
                    ? 'Your listing is live and active.'
                    : 'Renew your subscription to keep your listing visible.'
                }
              </Text>
            </View>
          </LinearGradient>

          {/* What's included */}
          <Text style={s.sectionLabel}>WHAT'S INCLUDED</Text>
          <View style={s.featuresCard}>
            {PLAN_FEATURES.map((feature, i) => (
              <View key={i} style={[s.featureRow, i < PLAN_FEATURES.length - 1 && s.featureBorder]}>
                <View style={s.checkCircle}>
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                </View>
                <Text style={s.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          {/* Plans */}
          <Text style={s.sectionLabel}>CHOOSE A PLAN</Text>

          {/* Monthly */}
          <View style={[s.planCard, plan === 'monthly' && s.planCardActive]}>
            <View style={s.planLeft}>
              <Text style={s.planName}>Monthly</Text>
              <Text style={s.planPrice}>$10 <Text style={s.planPer}>/ month</Text></Text>
            </View>
            <View style={s.planRight}>
              {plan === 'monthly' && isActive
                ? <View style={s.currentBadge}><Text style={s.currentBadgeText}>Current Plan</Text></View>
                : <Text style={s.planNote}>Cancel anytime</Text>
              }
            </View>
          </View>

          {/* Annual */}
          <View style={[s.planCard, plan === 'annual' && s.planCardActive]}>
            <View style={s.planLeft}>
              <Text style={s.planName}>Annual</Text>
              <Text style={s.planPrice}>$100 <Text style={s.planPer}>/ year</Text></Text>
            </View>
            <View style={s.planRight}>
              <View style={s.saveBadge}><Text style={s.saveBadgeText}>2 months free</Text></View>
              {plan === 'annual' && isActive
                ? <View style={s.currentBadge}><Text style={s.currentBadgeText}>Current Plan</Text></View>
                : null
              }
            </View>
          </View>

          {/* Payment coming soon */}
          <View style={s.comingSoon}>
            <Ionicons name="lock-closed-outline" size={20} color="#8E8E93" />
            <View style={{ flex: 1 }}>
              <Text style={s.comingSoonTitle}>Payment Setup In Progress</Text>
              <Text style={s.comingSoonSub}>
                Our team is finalizing the payment system. You'll be notified by email as soon as billing is ready. Your free trial continues in the meantime.
              </Text>
            </View>
          </View>

          {/* Contact */}
          <View style={s.contactRow}>
            <Ionicons name="mail-outline" size={16} color="#8E8E93" />
            <Text style={s.contactText}>Questions? Email us at <Text style={s.contactLink}>support@roadreadynetwork.com</Text></Text>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 100 },

  topBar: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F5', gap: 10, marginBottom: 4 },
  topBarIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  topBarTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: '#1A1A2E' },

  statusBanner: { borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 16, marginBottom: 20 },
  statusIcon:   { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  statusTitle:  { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  statusSub:    { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4, lineHeight: 18 },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#8E8E93', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, marginTop: 4 },

  featuresCard: { backgroundColor: '#F8F8FA', borderRadius: 18, borderWidth: 1, borderColor: '#EBEBEF', overflow: 'hidden', marginBottom: 24 },
  featureRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  featureBorder:{ borderBottomWidth: 1, borderBottomColor: '#F0F0F5' },
  checkCircle:  { width: 22, height: 22, borderRadius: 11, backgroundColor: '#021B3A', justifyContent: 'center', alignItems: 'center' },
  featureText:  { flex: 1, fontSize: 14, color: '#1A1A2E', lineHeight: 19 },

  planCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, padding: 18, marginBottom: 10,
    borderWidth: 1.5, borderColor: '#EBEBEF', backgroundColor: '#F8F8FA',
  },
  planCardActive: { borderColor: '#021B3A', backgroundColor: '#EEF2FF' },
  planLeft:    { flex: 1, gap: 4 },
  planRight:   { alignItems: 'flex-end', gap: 6 },
  planName:    { fontSize: 17, fontWeight: '800', color: '#1A1A2E' },
  planPrice:   { fontSize: 22, fontWeight: '800', color: '#021B3A' },
  planPer:     { fontSize: 14, fontWeight: '500', color: '#8E8E93' },
  planNote:    { fontSize: 12, color: '#8E8E93' },
  saveBadge:   { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#A5D6A7' },
  saveBadgeText: { fontSize: 11, fontWeight: '700', color: '#2E7D32' },
  currentBadge: { backgroundColor: '#021B3A', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  currentBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },

  comingSoon: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#F8F8FA', borderRadius: 16, padding: 16, marginTop: 8, marginBottom: 16,
    borderWidth: 1, borderColor: '#EBEBEF',
  },
  comingSoonTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  comingSoonSub:   { fontSize: 13, color: '#8E8E93', lineHeight: 18 },

  contactRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  contactText: { fontSize: 13, color: '#8E8E93' },
  contactLink: { color: '#021B3A', fontWeight: '600', textDecorationLine: 'underline' },
});
