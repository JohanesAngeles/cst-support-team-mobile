import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from '@react-navigation/native';
import { useColors } from '../../constants/colors';
import { getMyReferral, applyReferralCode } from '../../api/features';

export default function ReferralScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    content: { padding: 16, paddingBottom: 40, gap: 14 },
    heroCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 20, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: Colors.secondary + '33' },
    heroIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.secondary + '22', alignItems: 'center', justifyContent: 'center' },
    heroTitle: { color: Colors.text, fontSize: 20, fontWeight: '900', textAlign: 'center' },
    heroSub: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 19 },
    codeCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 20, alignItems: 'center', gap: 10, borderWidth: 2, borderColor: Colors.secondary + '44' },
    codeLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
    codeValue: { color: Colors.secondary, fontSize: 32, fontWeight: '900', letterSpacing: 3 },
    codeActions: { flexDirection: 'row', gap: 10, width: '100%' },
    codeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.secondary, borderRadius: 10, paddingVertical: 12 },
    codeBtnText: { color: Colors.textDark, fontWeight: '800', fontSize: 14 },
    statsRow: { flexDirection: 'row', gap: 10 },
    statBox: { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, gap: 4 },
    statNum: { color: Colors.secondary, fontSize: 28, fontWeight: '900' },
    statLabel: { color: Colors.textMuted, fontSize: 12 },
    howCard: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 16, gap: 12 },
    howTitle: { color: Colors.text, fontSize: 15, fontWeight: '800', marginBottom: 4 },
    howRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    stepBubble: { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.secondary, alignItems: 'center', justifyContent: 'center' },
    stepNum: { color: Colors.textDark, fontSize: 12, fontWeight: '900' },
    howText: { flex: 1, color: Colors.text, fontSize: 13, lineHeight: 18 },
    applyCard: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 16, gap: 8 },
    applyTitle: { color: Colors.text, fontSize: 15, fontWeight: '800' },
    applySub: { color: Colors.textMuted, fontSize: 12 },
    applyRow: { flexDirection: 'row', gap: 8 },
    applyInput: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 11, color: Colors.text, fontSize: 14, letterSpacing: 1 },
    applyBtn: { backgroundColor: Colors.secondary, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
    applyBtnText: { color: Colors.textDark, fontWeight: '800', fontSize: 14 },
  }), [Colors]);
  const [referralCode, setReferralCode] = useState('');
  const [referralCount, setReferralCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [applyCode, setApplyCode] = useState('');
  const [applying, setApplying] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getMyReferral();
      setReferralCode(data.referralCode ?? '');
      setReferralCount(data.referralCount ?? 0);
    } catch {
      Alert.alert('Error', 'Could not load referral info');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleCopy = async () => {
    await Clipboard.setStringAsync(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join me on CST — the #1 app for truck drivers! Use my referral code ${referralCode} when you sign up and we both save.\n\nDownload CST now!`,
        title: 'Join CST Driver App',
      });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleApply = async () => {
    if (!applyCode.trim()) { Alert.alert('Error', 'Enter a referral code'); return; }
    setApplying(true);
    try {
      const data = await applyReferralCode(applyCode.trim().toUpperCase());
      Alert.alert('Success!', `Referral code applied! You were referred by ${data.referrerName}.`);
      setApplyCode('');
      load();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message ?? err.message);
    } finally {
      setApplying(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>;


  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="gift-outline" size={40} color={Colors.secondary} />
          </View>
          <Text style={styles.heroTitle}>Refer a Fellow Driver</Text>
          <Text style={styles.heroSub}>Share CST with other drivers. When they join, you both get rewarded — every month they stay is money in your pocket.</Text>
        </View>

        {/* Your code */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>YOUR REFERRAL CODE</Text>
          <Text style={styles.codeValue}>{referralCode || '—'}</Text>
          <View style={styles.codeActions}>
            <TouchableOpacity style={styles.codeBtn} onPress={handleCopy}>
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={Colors.textDark} />
              <Text style={styles.codeBtnText}>{copied ? 'Copied!' : 'Copy Code'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.codeBtn, { backgroundColor: Colors.primary }]} onPress={handleShare}>
              <Ionicons name="share-outline" size={16} color={Colors.white} />
              <Text style={[styles.codeBtnText, { color: Colors.text }]}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{referralCount}</Text>
            <Text style={styles.statLabel}>Drivers Referred</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{referralCount > 0 ? `${referralCount}mo` : '—'}</Text>
            <Text style={styles.statLabel}>Discount Earned</Text>
          </View>
        </View>

        {/* How it works */}
        <View style={styles.howCard}>
          <Text style={styles.howTitle}>How It Works</Text>
          {[
            { icon: 'share-social-outline', step: '1', text: 'Share your code with another truck driver' },
            { icon: 'person-add-outline', step: '2', text: 'They sign up and enter your referral code' },
            { icon: 'gift-outline', step: '3', text: 'You both get 1 month free on your subscription' },
            { icon: 'infinite-outline', step: '4', text: 'No limit — refer as many drivers as you want' },
          ].map(({ icon, step, text }) => (
            <View key={step} style={styles.howRow}>
              <View style={styles.stepBubble}>
                <Text style={styles.stepNum}>{step}</Text>
              </View>
              <Ionicons name={icon as any} size={20} color={Colors.secondary} />
              <Text style={styles.howText}>{text}</Text>
            </View>
          ))}
        </View>

        {/* Apply a code */}
        <View style={styles.applyCard}>
          <Text style={styles.applyTitle}>Have a Referral Code?</Text>
          <Text style={styles.applySub}>Enter a code from another driver to get your first month free.</Text>
          <View style={styles.applyRow}>
            <TextInput
              style={styles.applyInput}
              value={applyCode}
              onChangeText={v => setApplyCode(v.toUpperCase())}
              placeholder="Enter code (e.g. CSTABC123)"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
              maxLength={12}
            />
            <TouchableOpacity
              style={[styles.applyBtn, applying && { opacity: 0.6 }]}
              onPress={handleApply}
              disabled={applying}
            >
              {applying ? <ActivityIndicator size="small" color={Colors.textDark} /> : <Text style={styles.applyBtnText}>Apply</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
