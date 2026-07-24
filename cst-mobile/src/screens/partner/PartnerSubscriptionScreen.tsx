import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Linking, Alert, ActivityIndicator, TextInput, Image, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useIAP, ErrorCode } from 'react-native-iap';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import { billingAPI } from '../../api/billing';

const CASHTAG   = '$roadreadyapp';
const CASHAPP_URL = 'https://cash.app/$roadreadyapp';

const APPLE_SKUS: Record<'monthly' | 'annual', string> = {
  monthly: 'com.cst.driver.partner.monthly',
  annual:  'com.cst.driver.partner.annual',
};

const PLANS = [
  {
    id: 'monthly' as const,
    label: 'Monthly',
    price: '$10',
    per: '/ month',
    note: 'Cancel anytime',
    amount: 10,
    saveBadge: null,
  },
  {
    id: 'annual' as const,
    label: 'Annual',
    price: '$100',
    per: '/ year',
    note: null,
    amount: 100,
    saveBadge: '2 months free',
  },
];

const FEATURES = [
  'Your business listed on the driver map',
  'Appear in driver searches by city & category',
  'Receive ratings and reviews from drivers',
  'View analytics — views & tap-to-calls',
  'Direct call button for drivers',
  'Business hours & website link displayed',
];

export default function PartnerSubscriptionScreen() {
  const { user, updateUser } = useAuth();
  const isIOS = Platform.OS === 'ios';

  const status      = (user as any)?.subscriptionStatus ?? 'free';
  const activePlan  = (user as any)?.subscriptionPlan   ?? null;
  const isActive    = status === 'active';
  const isFree      = status === 'free';
  const cashPending = (user as any)?.cashAppPending ?? false;

  const [selectedPlan, setSelectedPlan]   = useState<'monthly' | 'annual' | null>(null);
  const [submitted, setSubmitted]         = useState(cashPending);
  const [submitting, setSubmitting]       = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [senderCashtag, setSenderCashtag]     = useState('');
  const [screenshotUri, setScreenshotUri]     = useState<string | null>(null);
  const [applePurchasing, setApplePurchasing] = useState(false);

  const {
    connected: iapConnected,
    subscriptions: appleSubscriptions,
    fetchProducts,
    requestPurchase,
    finishTransaction,
    restorePurchases,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      try {
        if (!purchase.purchaseToken) throw new Error('Missing purchase token');
        await billingAPI.verifyApplePurchase(purchase.purchaseToken);
        const plan = purchase.productId === APPLE_SKUS.annual ? 'annual' : 'monthly';
        updateUser({ subscriptionStatus: 'active', subscriptionPlan: plan });
        await finishTransaction({ purchase, isConsumable: false });
        Alert.alert('Success', 'Your subscription is now active.');
      } catch (err: any) {
        Alert.alert('Error', 'Could not verify your purchase. Please contact support if you were charged.');
      } finally {
        setApplePurchasing(false);
      }
    },
    onPurchaseError: (error) => {
      setApplePurchasing(false);
      if (error.code !== ErrorCode.UserCancelled) {
        Alert.alert('Error', error.message ?? 'Purchase failed. Please try again.');
      }
    },
  });

  useEffect(() => {
    if (isIOS && iapConnected) {
      fetchProducts({ skus: Object.values(APPLE_SKUS), type: 'subs' });
    }
  }, [isIOS, iapConnected, fetchProducts]);

  const handleApplePurchase = async (plan: 'monthly' | 'annual') => {
    setApplePurchasing(true);
    try {
      await requestPurchase({ request: { apple: { sku: APPLE_SKUS[plan] } }, type: 'subs' });
    } catch {
      setApplePurchasing(false);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      await restorePurchases();
    } catch {
      Alert.alert('Error', 'Could not restore purchases. Please try again.');
    }
  };

  // Pre-select plan if already pending
  useEffect(() => {
    const pendingPlan = (user as any)?.cashAppPendingPlan;
    if (pendingPlan) setSelectedPlan(pendingPlan);
  }, [user]);

  const openCashApp = () => {
    Linking.canOpenURL(CASHAPP_URL).then(can =>
      Linking.openURL(can ? CASHAPP_URL : `https://cash.app/${CASHTAG.replace('$', '%24')}`)
    );
  };

  const pickScreenshot = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'We need photo library access to attach your payment screenshot.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled && result.assets?.length) setScreenshotUri(result.assets[0].uri);
  };

  const handleSubmitPayment = async () => {
    if (!selectedPlan) return;
    if (!referenceNumber.trim()) {
      Alert.alert('Missing Info', 'Enter the Cash App reference number from your payment confirmation.'); return;
    }
    if (!senderCashtag.trim()) {
      Alert.alert('Missing Info', 'Enter your Cash App $cashtag so we can match your payment.'); return;
    }
    if (!screenshotUri) {
      Alert.alert('Missing Info', 'Attach a screenshot of your Cash App payment confirmation.'); return;
    }
    setSubmitting(true);
    try {
      const ext = screenshotUri.split('.').pop() ?? 'jpg';
      const form = new FormData();
      form.append('plan', selectedPlan);
      form.append('referenceNumber', referenceNumber.trim());
      form.append('senderCashtag', senderCashtag.trim());
      form.append('screenshot', { uri: screenshotUri, type: `image/${ext}`, name: `cashapp.${ext}` } as any);
      await client.post('/billing/cashapp-request', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSubmitted(true);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Could not submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const chosenPlan = PLANS.find(p => p.id === selectedPlan);

  return (
    <View style={s.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

          {/* ── Header ──────────────────────────────────────────────── */}
          <View style={s.topBar}>
            <View style={s.topBarIcon}>
              <Ionicons name="card" size={20} color="#021B3A" />
            </View>
            <Text style={s.topBarTitle}>Billing & Subscription</Text>
          </View>

          {/* ── Status banner ───────────────────────────────────────── */}
          <LinearGradient
            colors={isActive ? ['#021B3A', '#03306B'] : submitted ? ['#1B5E20', '#2E7D32'] : ['#B8860B', '#D4A017']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.statusBanner}
          >
            <View style={s.statusIcon}>
              <Ionicons
                name={isActive ? 'shield-checkmark' : submitted ? 'time-outline' : 'time-outline'}
                size={28}
                color={isActive || submitted ? '#FFFFFF' : '#021B3A'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.statusTitle, !isActive && !submitted && { color: '#021B3A' }]}>
                {isActive
                  ? `${activePlan === 'annual' ? 'Annual' : 'Monthly'} Plan — Active`
                  : submitted
                    ? 'Payment Submitted — Pending Review'
                    : isFree
                      ? '30-Day Free Trial'
                      : 'Subscription Inactive'}
              </Text>
              <Text style={[s.statusSub, !isActive && !submitted && { color: 'rgba(2,27,58,0.7)' }]}>
                {isActive
                  ? 'Your listing is live and active.'
                  : submitted
                    ? "We've received your payment request. Your listing will be activated within 24–48 hours."
                    : isFree
                      ? 'Your listing is live and free for your first 30 days.'
                      : 'Renew your subscription to keep your listing visible.'}
              </Text>
            </View>
          </LinearGradient>

          {/* ── What's included ─────────────────────────────────────── */}
          <Text style={s.sectionLabel}>WHAT'S INCLUDED</Text>
          <View style={s.featuresCard}>
            {FEATURES.map((f, i) => (
              <View key={i} style={[s.featureRow, i < FEATURES.length - 1 && s.featureBorder]}>
                <View style={s.checkCircle}>
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                </View>
                <Text style={s.featureText}>{f}</Text>
              </View>
            ))}
          </View>

          {/* ── Plan selection ───────────────────────────────────────── */}
          {!isActive && (
            <>
              <Text style={s.sectionLabel}>CHOOSE A PLAN</Text>

              {PLANS.map(plan => {
                const isSelected = selectedPlan === plan.id;
                const isCurrent  = activePlan === plan.id && isActive;
                return (
                  <TouchableOpacity
                    key={plan.id}
                    style={[s.planCard, isSelected && s.planCardSelected]}
                    onPress={() => setSelectedPlan(plan.id)}
                    activeOpacity={0.8}
                    disabled={submitted}
                  >
                    <View style={s.planLeft}>
                      <Text style={s.planName}>{plan.label}</Text>
                      <Text style={s.planPrice}>
                        {plan.price}{' '}
                        <Text style={s.planPer}>{plan.per}</Text>
                      </Text>
                      {plan.note && <Text style={s.planNote}>{plan.note}</Text>}
                    </View>
                    <View style={s.planRight}>
                      {plan.saveBadge && (
                        <View style={s.saveBadge}>
                          <Text style={s.saveBadgeText}>{plan.saveBadge}</Text>
                        </View>
                      )}
                      {isCurrent && (
                        <View style={s.currentBadge}>
                          <Text style={s.currentBadgeText}>Current Plan</Text>
                        </View>
                      )}
                      <View style={[s.radioOuter, isSelected && s.radioOuterSelected]}>
                        {isSelected && <View style={s.radioInner} />}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* ── Cash App payment section (Android only — iOS must use Apple IAP) ── */}
              {selectedPlan && !submitted && !isIOS && (
                <View style={s.cashAppCard}>
                  {/* Green Cash App header */}
                  <View style={s.cashAppHeader}>
                    <View style={s.cashAppIconWrap}>
                      <Ionicons name="cash" size={22} color="#FFFFFF" />
                    </View>
                    <View>
                      <Text style={s.cashAppHeaderTitle}>Pay with Cash App</Text>
                      <Text style={s.cashAppHeaderSub}>Quick, easy, secure</Text>
                    </View>
                  </View>

                  {/* Amount + cashtag */}
                  <View style={s.cashAppAmountRow}>
                    <View style={s.cashAppAmountBox}>
                      <Text style={s.cashAppAmountLabel}>SEND EXACTLY</Text>
                      <Text style={s.cashAppAmount}>${chosenPlan?.amount}</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={20} color="#8E8E93" />
                    <View style={s.cashAppTagBox}>
                      <Text style={s.cashAppTagLabel}>TO</Text>
                      <Text style={s.cashAppTag}>{CASHTAG}</Text>
                    </View>
                  </View>

                  {/* Note instruction */}
                  <View style={s.cashAppNoteBox}>
                    <Ionicons name="chatbubble-outline" size={14} color="#8E8E93" />
                    <Text style={s.cashAppNoteText}>
                      In the note, include:{' '}
                      <Text style={{ fontWeight: '700', color: '#1A1A2E' }}>
                        "{chosenPlan?.label} Plan — {(user as any)?.name ?? 'Partner'}"
                      </Text>
                    </Text>
                  </View>

                  {/* Open Cash App button */}
                  <TouchableOpacity style={s.openCashAppBtn} onPress={openCashApp} activeOpacity={0.85}>
                    <Ionicons name="open-outline" size={17} color="#FFFFFF" />
                    <Text style={s.openCashAppTxt}>Open Cash App</Text>
                  </TouchableOpacity>

                  <View style={s.divider} />

                  {/* Reference number + cashtag + screenshot — required so admin can verify */}
                  <View style={{ paddingHorizontal: 16, gap: 10, marginBottom: 4 }}>
                    <Text style={s.confirmInstruction}>
                      After sending payment, fill in the details below exactly as shown in your Cash App confirmation.
                    </Text>
                    <View style={s.fieldGroup}>
                      <Text style={s.fieldLabel}>Cash App Reference Number *</Text>
                      <TextInput
                        style={s.textInput}
                        placeholder="e.g. 8F3KDX92"
                        placeholderTextColor="#AEAEB2"
                        value={referenceNumber}
                        onChangeText={setReferenceNumber}
                        autoCapitalize="characters"
                      />
                    </View>
                    <View style={s.fieldGroup}>
                      <Text style={s.fieldLabel}>Your Cash App $cashtag *</Text>
                      <TextInput
                        style={s.textInput}
                        placeholder="$yourcashtag"
                        placeholderTextColor="#AEAEB2"
                        value={senderCashtag}
                        onChangeText={setSenderCashtag}
                        autoCapitalize="none"
                      />
                    </View>
                    <TouchableOpacity style={s.screenshotBtn} onPress={pickScreenshot} activeOpacity={0.85}>
                      {screenshotUri ? (
                        <Image source={{ uri: screenshotUri }} style={s.screenshotThumb} />
                      ) : (
                        <Ionicons name="image-outline" size={18} color="#8E8E93" />
                      )}
                      <Text style={s.screenshotBtnText}>
                        {screenshotUri ? 'Screenshot attached — tap to change' : 'Attach Payment Screenshot *'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* I've sent payment */}
                  <Text style={s.confirmInstruction}>
                    Once the details above are filled in, tap below so our team knows to verify and activate your listing.
                  </Text>
                  <TouchableOpacity
                    style={[s.sentBtn, submitting && { opacity: 0.6 }]}
                    onPress={handleSubmitPayment}
                    disabled={submitting}
                    activeOpacity={0.85}
                  >
                    {submitting
                      ? <ActivityIndicator size="small" color="#FFFFFF" />
                      : <>
                          <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                          <Text style={s.sentBtnTxt}>I've Sent My Payment</Text>
                        </>
                    }
                  </TouchableOpacity>
                </View>
              )}

              {/* ── Apple In-App Purchase section (iOS only) ────────────── */}
              {selectedPlan && isIOS && (
                <View style={s.appleCard}>
                  <View style={s.appleHeader}>
                    <Ionicons name="logo-apple" size={22} color="#FFFFFF" />
                    <Text style={s.appleHeaderTitle}>Subscribe with Apple</Text>
                  </View>
                  <Text style={s.confirmInstruction}>
                    You'll be charged {chosenPlan?.price}{chosenPlan?.per} through your Apple ID. Your listing activates immediately after purchase.
                  </Text>
                  <TouchableOpacity
                    style={[s.sentBtn, applePurchasing && { opacity: 0.6 }]}
                    onPress={() => handleApplePurchase(selectedPlan)}
                    disabled={applePurchasing || !iapConnected}
                    activeOpacity={0.85}
                  >
                    {applePurchasing
                      ? <ActivityIndicator size="small" color="#FFFFFF" />
                      : <Text style={s.sentBtnTxt}>
                          Subscribe — {appleSubscriptions.find(p => p.id === APPLE_SKUS[selectedPlan])?.displayPrice ?? chosenPlan?.price}
                        </Text>
                    }
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleRestorePurchases} style={{ paddingVertical: 12, alignItems: 'center' }}>
                    <Text style={s.restoreLink}>Restore Purchases</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Already submitted state */}
              {submitted && !isIOS && (
                <View style={s.pendingCard}>
                  <Ionicons name="time-outline" size={24} color="#27AE60" />
                  <View style={{ flex: 1 }}>
                    <Text style={s.pendingTitle}>Payment Under Review</Text>
                    <Text style={s.pendingSub}>
                      Your {selectedPlan} plan payment is being verified. We'll activate your listing within 24–48 hours.
                      Questions? Email{' '}
                      <Text
                        style={s.pendingEmail}
                        onPress={() => Linking.openURL('mailto:support@roadreadynetwork.com')}
                      >
                        support@roadreadynetwork.com
                      </Text>
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}

          {/* Already active */}
          {isActive && (
            <View style={s.activeNote}>
              <Ionicons name="information-circle-outline" size={16} color="#8E8E93" />
              <Text style={s.activeNoteText}>
                To change or cancel your plan, email{' '}
                <Text
                  style={s.contactLink}
                  onPress={() => Linking.openURL('mailto:support@roadreadynetwork.com')}
                >
                  support@roadreadynetwork.com
                </Text>
              </Text>
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const CASHAPP_GREEN = '#00D64F';

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 100 },

  topBar:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F5', gap: 10, marginBottom: 4 },
  topBarIcon:  { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  topBarTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: '#1A1A2E' },

  statusBanner: { borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 16, marginBottom: 20 },
  statusIcon:   { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  statusTitle:  { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  statusSub:    { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4, lineHeight: 18 },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#8E8E93', letterSpacing: 1, marginBottom: 12, marginTop: 4 },

  featuresCard:  { backgroundColor: '#F8F8FA', borderRadius: 18, borderWidth: 1, borderColor: '#EBEBEF', overflow: 'hidden', marginBottom: 24 },
  featureRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  featureBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F0F5' },
  checkCircle:   { width: 22, height: 22, borderRadius: 11, backgroundColor: '#021B3A', justifyContent: 'center', alignItems: 'center' },
  featureText:   { flex: 1, fontSize: 14, color: '#1A1A2E', lineHeight: 19 },

  planCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, padding: 18, marginBottom: 10,
    borderWidth: 1.5, borderColor: '#EBEBEF', backgroundColor: '#F8F8FA',
  },
  planCardSelected: { borderColor: '#021B3A', backgroundColor: '#EEF2FF' },
  planLeft:    { flex: 1, gap: 4 },
  planRight:   { alignItems: 'flex-end', gap: 8 },
  planName:    { fontSize: 17, fontWeight: '800', color: '#1A1A2E' },
  planPrice:   { fontSize: 22, fontWeight: '800', color: '#021B3A' },
  planPer:     { fontSize: 14, fontWeight: '500', color: '#8E8E93' },
  planNote:    { fontSize: 12, color: '#8E8E93' },
  saveBadge:   { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#A5D6A7' },
  saveBadgeText: { fontSize: 11, fontWeight: '700', color: '#2E7D32' },
  currentBadge: { backgroundColor: '#021B3A', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  currentBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  radioOuter:   { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#C8C8D0', justifyContent: 'center', alignItems: 'center' },
  radioOuterSelected: { borderColor: '#021B3A' },
  radioInner:   { width: 11, height: 11, borderRadius: 6, backgroundColor: '#021B3A' },

  // ── Apple IAP card ───────────────────────────────────────────────────────────
  appleCard: {
    marginTop: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#EBEBEF',
    backgroundColor: '#F8F8FA', overflow: 'hidden', marginBottom: 16, padding: 16,
  },
  appleHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
    backgroundColor: '#000000', alignSelf: 'flex-start', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  appleHeaderTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  restoreLink: { color: '#021B3A', fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },

  // ── Cash App card ────────────────────────────────────────────────────────────
  cashAppCard: {
    marginTop: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#C8F7D9',
    backgroundColor: '#F0FFF6', overflow: 'hidden', marginBottom: 16,
  },
  cashAppHeader: {
    backgroundColor: CASHAPP_GREEN, flexDirection: 'row', alignItems: 'center',
    gap: 12, paddingHorizontal: 18, paddingVertical: 14,
  },
  cashAppIconWrap: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  cashAppHeaderTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  cashAppHeaderSub:   { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 1 },

  cashAppAmountRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 20, gap: 12,
  },
  cashAppAmountBox: { alignItems: 'center', flex: 1 },
  cashAppAmountLabel: { fontSize: 10, fontWeight: '700', color: '#8E8E93', letterSpacing: 1, marginBottom: 4 },
  cashAppAmount:  { fontSize: 36, fontWeight: '900', color: '#1A1A2E' },
  cashAppTagBox:  { alignItems: 'center', flex: 1 },
  cashAppTagLabel:{ fontSize: 10, fontWeight: '700', color: '#8E8E93', letterSpacing: 1, marginBottom: 4 },
  cashAppTag:     { fontSize: 22, fontWeight: '900', color: CASHAPP_GREEN },

  cashAppNoteBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFFFFF', marginHorizontal: 16, borderRadius: 12,
    padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#E8F5E9',
  },
  cashAppNoteText: { flex: 1, fontSize: 13, color: '#8E8E93', lineHeight: 18 },

  openCashAppBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: CASHAPP_GREEN, marginHorizontal: 16, borderRadius: 14,
    paddingVertical: 14, marginBottom: 16,
  },
  openCashAppTxt: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },

  divider: { height: 1, backgroundColor: '#D4F5E0', marginHorizontal: 16, marginBottom: 16 },

  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#1A1A2E' },
  textInput: {
    height: 46, borderRadius: 12, paddingHorizontal: 14,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D4F5E0',
    fontSize: 14, color: '#1A1A2E',
  },
  screenshotBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    height: 48, borderRadius: 12, paddingHorizontal: 14,
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#D4F5E0', borderStyle: 'dashed',
  },
  screenshotThumb: { width: 28, height: 28, borderRadius: 6 },
  screenshotBtnText: { fontSize: 13, fontWeight: '600', color: '#1A1A2E', flexShrink: 1 },

  confirmInstruction: {
    fontSize: 13, color: '#8E8E93', textAlign: 'center',
    lineHeight: 18, paddingHorizontal: 16, marginBottom: 12,
  },
  sentBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#021B3A', marginHorizontal: 16, borderRadius: 14,
    paddingVertical: 14, marginBottom: 20,
  },
  sentBtnTxt: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },

  // ── Pending / active states ───────────────────────────────────────────────
  pendingCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#F0FFF6', borderRadius: 16, padding: 16, marginTop: 8, marginBottom: 16,
    borderWidth: 1, borderColor: '#C8F7D9',
  },
  pendingTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  pendingSub:   { fontSize: 13, color: '#8E8E93', lineHeight: 18 },
  pendingEmail: { color: '#021B3A', fontWeight: '600', textDecorationLine: 'underline' },

  activeNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginTop: 16, padding: 14, backgroundColor: '#F8F8FA',
    borderRadius: 14, borderWidth: 1, borderColor: '#EBEBEF',
  },
  activeNoteText: { flex: 1, fontSize: 13, color: '#8E8E93', lineHeight: 18 },
  contactLink:    { color: '#021B3A', fontWeight: '600', textDecorationLine: 'underline' },
});
