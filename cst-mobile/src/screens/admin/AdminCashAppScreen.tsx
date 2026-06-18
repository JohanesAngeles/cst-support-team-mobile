import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import client from '../../api/client';

const NAVY = '#021B3A';

export default function AdminCashAppScreen() {
  const [requests,   setRequests]   = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [approving,  setApproving]  = useState<string | null>(null);

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

  const handleApprove = (userId: string, name: string, plan: string) => {
    Alert.alert(
      'Approve Payment',
      `Activate the ${plan === 'annual' ? 'Annual ($100.00)' : 'Monthly ($10.00)'} plan for ${name}?\n\nOnly approve after confirming payment received in Cash App.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate Subscription',
          onPress: async () => {
            setApproving(userId);
            try {
              await client.post(`/admin/cashapp-approve/${userId}`, { plan });
              setRequests(prev => prev.filter(r => r._id !== userId));
              Alert.alert('Activated', `${name}'s ${plan} subscription is now active.`);
            } catch {
              Alert.alert('Error', 'Could not approve request. Try again.');
            } finally {
              setApproving(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F7FA', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={NAVY} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F7FA' }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#EBEBEF', backgroundColor: '#FFFFFF' }}>
          <Text style={{ fontSize: 22, fontWeight: '900', color: NAVY }}>Cash App Requests</Text>
          <Text style={{ fontSize: 13, color: '#8E8E93', marginTop: 3 }}>
            {requests.length === 0
              ? 'No pending approvals'
              : `${requests.length} partner${requests.length > 1 ? 's' : ''} awaiting activation`}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={NAVY} />
          }
        >
          {requests.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 10 }}>
              <Ionicons name="checkmark-circle-outline" size={52} color="#C7C7CC" />
              <Text style={{ color: '#8E8E93', fontSize: 15, fontWeight: '700' }}>All caught up!</Text>
              <Text style={{ color: '#AEAEB2', fontSize: 13, textAlign: 'center' }}>
                No pending Cash App approvals.{'\n'}Pull down to refresh.
              </Text>
            </View>
          ) : (
            requests.map(r => (
              <RequestCard
                key={r._id}
                request={r}
                approving={approving}
                onApprove={handleApprove}
              />
            ))
          )}
        </ScrollView>

      </SafeAreaView>
    </View>
  );
}

function RequestCard({ request: r, approving, onApprove }: {
  request: any;
  approving: string | null;
  onApprove: (id: string, name: string, plan: string) => void;
}) {
  const isApproving = approving === r._id;
  const planLabel   = r.cashAppPendingPlan === 'annual' ? 'Annual — $100.00' : 'Monthly — $10.00';
  const planColor   = r.cashAppPendingPlan === 'annual' ? '#8E44AD' : '#2980B9';
  const submittedAt = r.cashAppPendingAt
    ? new Date(r.cashAppPendingAt).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : '—';

  return (
    <View style={{
      backgroundColor: '#FFFFFF', borderRadius: 16,
      borderWidth: 1, borderColor: '#EBEBEF',
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
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#1A1A2E' }}>{r.name ?? 'Unknown'}</Text>
          <Text style={{ fontSize: 13, color: '#8E8E93' }}>{r.email}</Text>
          <Text style={{ fontSize: 11, color: '#AEAEB2', marginTop: 2 }}>Submitted {submittedAt}</Text>
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

      {/* Reminder */}
      <View style={{ backgroundColor: '#FFFDE7', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#FFF9C4' }}>
        <Text style={{ fontSize: 11, color: '#795548', lineHeight: 16 }}>
          Verify payment in your Cash App account before activating. Once approved, the partner's subscription starts immediately.
        </Text>
      </View>

      {/* Approve button */}
      <TouchableOpacity
        style={{
          backgroundColor: isApproving ? '#A5D6A7' : '#27AE60',
          borderRadius: 12, height: 46,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
        onPress={() => onApprove(r._id, r.name ?? 'this partner', r.cashAppPendingPlan)}
        disabled={!!approving}
        activeOpacity={0.8}
      >
        {isApproving
          ? <ActivityIndicator size="small" color="#FFFFFF" />
          : <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
        }
        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
          {isApproving ? 'Activating…' : 'Approve & Activate'}
        </Text>
      </TouchableOpacity>

    </View>
  );
}
