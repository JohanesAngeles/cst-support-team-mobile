import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import client from '../../api/client';
import { useColors } from '../../constants/colors';

export default function AdminCashAppScreen() {
  const Colors = useColors();
  const [requests,   setRequests]   = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId,     setBusyId]     = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const { data } = await client.get('/admin/cashapp-requests');
      setRequests(data);
    } catch {
      Alert.alert('Error', 'Could not load Cash App requests.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleApprove = (paymentId: string, name: string, plan: string) => {
    Alert.alert(
      'Approve Payment',
      `Activate the ${plan === 'annual' ? 'Annual ($100.00)' : 'Monthly ($10.00)'} plan for ${name}?\n\nOnly approve after confirming the reference number, sender, and amount match a real transaction in your own Cash App activity feed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate Subscription',
          onPress: async () => {
            setBusyId(paymentId);
            try {
              await client.post(`/admin/cashapp-approve/${paymentId}`, {});
              setRequests(prev => prev.filter(r => r._id !== paymentId));
              Alert.alert('Activated', `${name}'s ${plan} subscription is now active.`);
            } catch {
              Alert.alert('Error', 'Could not approve request. Try again.');
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  const handleReject = (paymentId: string, name: string) => {
    Alert.alert(
      'Reject Payment',
      `Reject ${name}'s Cash App submission? Use this if no matching transaction is found in your Cash App activity.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject', style: 'destructive',
          onPress: async () => {
            setBusyId(paymentId);
            try {
              await client.post(`/admin/cashapp-reject/${paymentId}`, {});
              setRequests(prev => prev.filter(r => r._id !== paymentId));
            } catch {
              Alert.alert('Error', 'Could not reject request. Try again.');
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.secondary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface }}>
          <Text style={{ fontSize: 22, fontWeight: '900', color: Colors.text }}>Cash App Requests</Text>
          <Text style={{ fontSize: 13, color: Colors.textMuted, marginTop: 3 }}>
            {requests.length === 0
              ? 'No pending approvals'
              : `${requests.length} partner${requests.length > 1 ? 's' : ''} awaiting activation`}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.secondary} />
          }
        >
          {requests.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 10 }}>
              <Ionicons name="checkmark-circle-outline" size={52} color={Colors.textMuted} />
              <Text style={{ color: Colors.textMuted, fontSize: 15, fontWeight: '700' }}>All caught up!</Text>
              <Text style={{ color: Colors.textMuted, fontSize: 13, textAlign: 'center' }}>
                No pending Cash App approvals.{'\n'}Pull down to refresh.
              </Text>
            </View>
          ) : (
            requests.map(r => (
              <RequestCard
                key={r._id}
                request={r}
                busyId={busyId}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))
          )}
        </ScrollView>

      </SafeAreaView>
    </View>
  );
}

function RequestCard({ request: r, busyId, onApprove, onReject }: {
  request: any;
  busyId: string | null;
  onApprove: (id: string, name: string, plan: string) => void;
  onReject: (id: string, name: string) => void;
}) {
  const Colors = useColors();
  const isBusy      = busyId === r._id;
  const partnerName = r.userId?.name ?? 'Unknown';
  const partnerEmail = r.userId?.email ?? '';
  const planLabel   = r.plan === 'annual' ? 'Annual — $100.00' : 'Monthly — $10.00';
  const planColor   = r.plan === 'annual' ? '#8E44AD' : '#2980B9';
  const submittedAt = r.createdAt
    ? new Date(r.createdAt).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : '—';

  return (
    <View style={{
      backgroundColor: Colors.surface, borderRadius: 16,
      borderWidth: 1, borderColor: Colors.border,
      padding: 16, gap: 12,
    }}>

      {/* Partner info */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{
          width: 46, height: 46, borderRadius: 23,
          backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center',
        }}>
          <Ionicons name="person-outline" size={22} color="#27AE60" />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: Colors.text }}>{partnerName}</Text>
          <Text style={{ fontSize: 13, color: Colors.textMuted }}>{partnerEmail}</Text>
          <Text style={{ fontSize: 11, color: Colors.textMuted, marginTop: 2 }}>Submitted {submittedAt}</Text>
        </View>
      </View>

      {/* Plan badge + status */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{
          backgroundColor: planColor + '18', borderRadius: 8,
          paddingHorizontal: 10, paddingVertical: 5,
          borderWidth: 1, borderColor: planColor + '44',
        }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: planColor }}>{planLabel}</Text>
        </View>
        <View style={{
          backgroundColor: '#FFF3E0', borderRadius: 8,
          paddingHorizontal: 10, paddingVertical: 5,
          borderWidth: 1, borderColor: '#FFE0B2',
        }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#E65100' }}>⏳ Pending</Text>
        </View>
      </View>

      {/* Verification details — what admin needs to match against their own Cash App activity */}
      <View style={{ backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: Colors.border, gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.textMuted }}>REFERENCE #</Text>
          <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.text, fontFamily: 'monospace' }}>{r.referenceNumber ?? '—'}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.textMuted }}>SENDER $CASHTAG</Text>
          <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.text }}>{r.senderCashtag ?? '—'}</Text>
        </View>
        {r.screenshotUrl && (
          <Image source={{ uri: r.screenshotUrl }} style={{ width: '100%', height: 160, borderRadius: 8, marginTop: 4 }} resizeMode="contain" />
        )}
      </View>

      {/* Reminder */}
      <View style={{ backgroundColor: '#FFFDE7', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#FFF9C4' }}>
        <Text style={{ fontSize: 11, color: '#795548', lineHeight: 16 }}>
          Verify against your own Cash App activity — matching sender, amount, and timestamp — before activating. Don't rely on the screenshot alone.
        </Text>
      </View>

      {/* Approve / Reject buttons */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          style={{
            flex: 1, backgroundColor: isBusy ? '#A5D6A7' : '#27AE60',
            borderRadius: 12, height: 46,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
          onPress={() => onApprove(r._id, partnerName, r.plan)}
          disabled={!!busyId}
          activeOpacity={0.8}
        >
          {isBusy
            ? <ActivityIndicator size="small" color="#FFFFFF" />
            : <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
          }
          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
            {isBusy ? 'Working…' : 'Approve'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            width: 46, height: 46, borderRadius: 12,
            backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: '#FFCDD2',
            justifyContent: 'center', alignItems: 'center',
          }}
          onPress={() => onReject(r._id, partnerName)}
          disabled={!!busyId}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={20} color="#E53935" />
        </TouchableOpacity>
      </View>

    </View>
  );
}
