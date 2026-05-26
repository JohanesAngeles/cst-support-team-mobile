import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import client from '../../api/client';

interface SubStatus {
  status: 'free' | 'active' | 'cancelled' | 'past_due';
  plan: 'monthly' | 'annual' | null;
  expiresAt: string | null;
  isActive: boolean;
}

const FEATURES = [
  'AI Legal Assistant (unlimited)',
  'IFTA Tracker + PDF Export',
  'One-Button Tax Prep Report',
  'HOS & Detention Tracker',
  'Document Vault (cloud storage)',
  'Emergency SOS + contacts',
  'Find Help Map',
  'Driver Calendar & reminders',
  'Broker Notes & Rate Tools',
  'Smart Forms & Ticket Dispute',
  'Profit & Loss Dashboard',
  'Push notification reminders',
];

export default function SubscriptionScreen() {
  const [status, setStatus] = useState<SubStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<'monthly' | 'annual' | 'portal' | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await client.get('/billing/status');
      setStatus(res.data);
    } catch {
      setStatus({ status: 'free', plan: null, expiresAt: null, isActive: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadStatus(); }, [loadStatus]));

  const startCheckout = async (plan: 'monthly' | 'annual') => {
    setCheckoutLoading(plan);
    try {
      const res = await client.post('/billing/checkout', {
        plan,
        successUrl: 'cst://subscription?success=true',
        cancelUrl: 'cst://subscription?cancelled=true',
      });
      if (res.data.url) {
        await Linking.openURL(res.data.url);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Could not start checkout. Try again.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const openPortal = async () => {
    setCheckoutLoading('portal');
    try {
      const res = await client.post('/billing/portal', { returnUrl: 'cst://subscription' });
      if (res.data.url) await Linking.openURL(res.data.url);
    } catch {
      Alert.alert('Error', 'Could not open billing portal. Try again.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const statusColor = {
    active: Colors.success,
    free: Colors.textMuted,
    cancelled: Colors.danger,
    past_due: '#E67E22',
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>
      </SafeAreaView>
    );
  }

  const isActive = status?.isActive ?? false;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Status card */}
        <View style={styles.statusCard}>
          <View style={styles.statusLeft}>
            <Text style={styles.statusLabel}>SUBSCRIPTION STATUS</Text>
            <Text style={[styles.statusValue, { color: statusColor[status?.status ?? 'free'] }]}>
              {status?.status?.toUpperCase() ?? 'FREE'}
            </Text>
            {status?.plan && <Text style={styles.statusPlan}>{status.plan === 'monthly' ? 'Monthly Plan' : 'Annual Plan'}</Text>}
            {status?.expiresAt && (
              <Text style={styles.statusExpiry}>
                {status.status === 'cancelled' ? 'Access until' : 'Renews'}: {new Date(status.expiresAt).toLocaleDateString()}
              </Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: (statusColor[status?.status ?? 'free']) + '22' }]}>
            <Ionicons
              name={isActive ? 'shield-checkmark' : 'shield-outline'}
              size={32}
              color={statusColor[status?.status ?? 'free']}
            />
          </View>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>CST Full Access</Text>
          <Text style={styles.heroSub}>Every tool. Total protection. Built for truckers.</Text>
        </View>

        {/* Features list */}
        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>Everything included</Text>
          {FEATURES.map((f) => (
            <View key={f} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        {!isActive ? (
          <>
            {/* Monthly plan */}
            <TouchableOpacity
              style={styles.planCard}
              onPress={() => startCheckout('monthly')}
              disabled={checkoutLoading !== null}
            >
              <View style={styles.planLeft}>
                <Text style={styles.planName}>Monthly</Text>
                <Text style={styles.planDesc}>Billed monthly, cancel anytime</Text>
              </View>
              <View style={styles.planRight}>
                <Text style={styles.planPrice}>$29.99</Text>
                <Text style={styles.planPer}>/month</Text>
              </View>
              {checkoutLoading === 'monthly'
                ? <ActivityIndicator size="small" color={Colors.secondary} style={{ marginLeft: 12 }} />
                : <Ionicons name="chevron-forward" size={20} color={Colors.secondary} />}
            </TouchableOpacity>

            {/* Annual plan */}
            <TouchableOpacity
              style={[styles.planCard, styles.planCardFeatured]}
              onPress={() => startCheckout('annual')}
              disabled={checkoutLoading !== null}
            >
              <View style={styles.saveBadge}>
                <Text style={styles.saveBadgeText}>SAVE 30%</Text>
              </View>
              <View style={styles.planLeft}>
                <Text style={[styles.planName, { color: Colors.textDark }]}>Annual</Text>
                <Text style={[styles.planDesc, { color: Colors.textDark + 'BB' }]}>$20.83/mo — billed annually</Text>
              </View>
              <View style={styles.planRight}>
                <Text style={[styles.planPrice, { color: Colors.textDark }]}>$249.99</Text>
                <Text style={[styles.planPer, { color: Colors.textDark }]}>/year</Text>
              </View>
              {checkoutLoading === 'annual'
                ? <ActivityIndicator size="small" color={Colors.textDark} style={{ marginLeft: 12 }} />
                : <Ionicons name="chevron-forward" size={20} color={Colors.textDark} />}
            </TouchableOpacity>

            <Text style={styles.secureNote}>
              <Ionicons name="lock-closed-outline" size={12} color={Colors.textMuted} /> Secure checkout via Stripe. Cancel anytime.
            </Text>
          </>
        ) : (
          <TouchableOpacity
            style={styles.portalBtn}
            onPress={openPortal}
            disabled={checkoutLoading !== null}
          >
            {checkoutLoading === 'portal'
              ? <ActivityIndicator size="small" color={Colors.textDark} />
              : <>
                  <Ionicons name="settings-outline" size={18} color={Colors.textDark} />
                  <Text style={styles.portalBtnText}>Manage Subscription</Text>
                </>
            }
          </TouchableOpacity>
        )}

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            Subscriptions automatically renew. Manage or cancel anytime through the billing portal or your App Store account. By subscribing you agree to our Terms of Service.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  statusCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: Colors.border,
  },
  statusLeft: { gap: 4 },
  statusLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  statusValue: { fontSize: 22, fontWeight: '900' },
  statusPlan: { color: Colors.textMuted, fontSize: 13 },
  statusExpiry: { color: Colors.textMuted, fontSize: 12 },
  statusBadge: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  hero: { alignItems: 'center', paddingVertical: 8 },
  heroTitle: { color: Colors.white, fontSize: 28, fontWeight: '900', textAlign: 'center' },
  heroSub: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: 6 },
  featuresCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: Colors.border, gap: 10 },
  featuresTitle: { color: Colors.white, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { color: Colors.textMuted, fontSize: 14, flex: 1 },
  planCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: Colors.border, gap: 12,
  },
  planCardFeatured: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  saveBadge: { position: 'absolute', top: -10, right: 16, backgroundColor: Colors.danger, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  saveBadgeText: { color: Colors.white, fontSize: 10, fontWeight: '900' },
  planLeft: { flex: 1 },
  planName: { color: Colors.white, fontSize: 17, fontWeight: '800' },
  planDesc: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  planRight: { alignItems: 'flex-end' },
  planPrice: { color: Colors.white, fontSize: 20, fontWeight: '900' },
  planPer: { color: Colors.textMuted, fontSize: 11 },
  secureNote: { color: Colors.textMuted, fontSize: 12, textAlign: 'center' },
  portalBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.secondary, borderRadius: 14, padding: 16,
  },
  portalBtnText: { color: Colors.textDark, fontSize: 15, fontWeight: '800' },
  disclaimer: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border },
  disclaimerText: { color: Colors.textMuted, fontSize: 11, lineHeight: 17, textAlign: 'center' },
});
