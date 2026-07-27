import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import client from '../../api/client';

const STATUS_COLOR: Record<string, string> = {
  pending:  '#FF9500',
  approved: '#27AE60',
  rejected: '#FF3B30',
};

export default function AdminApplicationsScreen() {
  const [apps,       setApps]       = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting,     setActing]     = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const { data } = await client.get('/admin/applications');
      setApps(data);
    } catch {
      Alert.alert('Error', 'Could not load applications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const decide = async (id: string, status: 'approved' | 'rejected') => {
    Alert.alert(
      status === 'approved' ? 'Approve Application' : 'Reject Application',
      `Are you sure you want to ${status === 'approved' ? 'approve' : 'reject'} this application?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: status === 'approved' ? 'Approve' : 'Reject',
          style: status === 'approved' ? 'default' : 'destructive',
          onPress: async () => {
            setActing(id);
            try {
              const { data } = await client.patch(`/admin/applications/${id}`, { status });
              setApps(prev => prev.map(a => a._id === id ? data : a));
            } catch {
              Alert.alert('Error', 'Could not update application.');
            } finally {
              setActing(null);
            }
          },
        },
      ]
    );
  };

  const pending  = apps.filter(a => a.status === 'pending');
  const resolved = apps.filter(a => a.status !== 'pending');

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F7FA' }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        <View style={{ paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#EBEBEF', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF3E0', justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="document-text-outline" size={18} color="#FF9500" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#1A1A2E' }}>Partner Applications</Text>
            <Text style={{ fontSize: 12, color: '#8E8E93', marginTop: 1 }}>{pending.length} pending review</Text>
          </View>
        </View>

        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#021B3A" />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
            showsVerticalScrollIndicator={false}
          >
            {apps.length === 0 && (
              <View style={{ alignItems: 'center', paddingTop: 60, gap: 10 }}>
                <Ionicons name="checkmark-circle-outline" size={48} color="#C7C7CC" />
                <Text style={{ color: '#8E8E93', fontSize: 15, fontWeight: '600' }}>No applications yet</Text>
              </View>
            )}

            {pending.length > 0 && (
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#8E8E93', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
                NEEDS REVIEW ({pending.length})
              </Text>
            )}

            {pending.map(app => (
              <AppCard key={app._id} app={app} acting={acting} onDecide={decide} />
            ))}

            {resolved.length > 0 && (
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#8E8E93', letterSpacing: 1, textTransform: 'uppercase', marginTop: 8, marginBottom: 4 }}>
                RESOLVED ({resolved.length})
              </Text>
            )}

            {resolved.map(app => (
              <AppCard key={app._id} app={app} acting={acting} onDecide={decide} />
            ))}
          </ScrollView>
        )}

      </SafeAreaView>
    </View>
  );
}

function AppCard({ app, acting, onDecide }: { app: any; acting: string | null; onDecide: (id: string, s: 'approved' | 'rejected') => void }) {
  const isPending = app.status === 'pending';
  const isActing  = acting === app._id;

  return (
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#EBEBEF', overflow: 'hidden' }}>
      {/* Status stripe */}
      <View style={{ height: 4, backgroundColor: STATUS_COLOR[app.status] ?? '#C7C7CC' }} />

      <View style={{ padding: 16, gap: 12 }}>
        {/* Business name + status */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1A1A2E' }}>{app.businessName}</Text>
            <Text style={{ fontSize: 13, color: '#8E8E93', marginTop: 2 }}>{app.category} · {app.city}, {app.state}</Text>
          </View>
          <View style={{ backgroundColor: STATUS_COLOR[app.status] + '20', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: STATUS_COLOR[app.status] + '50' }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: STATUS_COLOR[app.status], textTransform: 'uppercase', letterSpacing: 0.5 }}>{app.status}</Text>
          </View>
        </View>

        {/* Contact details */}
        <View style={{ gap: 4 }}>
          {[
            { icon: 'person-outline',  val: app.contactName },
            { icon: 'mail-outline',    val: app.email },
            { icon: 'call-outline',    val: app.phone },
            app.website && { icon: 'globe-outline', val: app.website },
          ].filter(Boolean).map((row: any, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name={row.icon} size={14} color="#8E8E93" />
              <Text style={{ fontSize: 13, color: '#555', flex: 1 }} numberOfLines={1}>{row.val}</Text>
            </View>
          ))}
        </View>

        {app.description ? (
          <Text style={{ fontSize: 13, color: '#8E8E93', lineHeight: 19 }} numberOfLines={3}>{app.description}</Text>
        ) : null}

        {app.referralCode ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF8E1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' }}>
            <Ionicons name="pricetag-outline" size={13} color="#D4A017" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#8A6D0B' }}>Referred by: {app.referralCode}</Text>
          </View>
        ) : null}

        {/* Action buttons — only for pending */}
        {isPending && (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            <TouchableOpacity
              style={{ flex: 1, height: 42, borderRadius: 12, backgroundColor: '#27AE60', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6, opacity: isActing ? 0.6 : 1 }}
              onPress={() => onDecide(app._id, 'approved')}
              disabled={isActing}
              activeOpacity={0.8}
            >
              {isActing ? <ActivityIndicator size="small" color="#FFF" /> : (
                <>
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, height: 42, borderRadius: 12, backgroundColor: '#FFF5F5', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6, borderWidth: 1, borderColor: '#FFCDD2', opacity: isActing ? 0.6 : 1 }}
              onPress={() => onDecide(app._id, 'rejected')}
              disabled={isActing}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={16} color="#E53935" />
              <Text style={{ color: '#E53935', fontWeight: '700', fontSize: 14 }}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}
