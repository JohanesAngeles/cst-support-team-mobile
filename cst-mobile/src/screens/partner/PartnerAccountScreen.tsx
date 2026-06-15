import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';

export default function PartnerAccountScreen() {
  const { user, logout } = useAuth();
  const [showChangePwd,  setShowChangePwd]  = useState(false);
  const [currentPwd,     setCurrentPwd]     = useState('');
  const [newPwd,         setNewPwd]         = useState('');
  const [confirmPwd,     setConfirmPwd]     = useState('');
  const [savingPwd,      setSavingPwd]      = useState(false);
  const [focused,        setFocused]        = useState<string | null>(null);

  const handleChangePassword = async () => {
    if (!currentPwd || !newPwd || !confirmPwd) {
      Alert.alert('Missing Fields', 'Please fill in all password fields.'); return;
    }
    if (newPwd !== confirmPwd) {
      Alert.alert('Mismatch', 'New passwords do not match.'); return;
    }
    if (newPwd.length < 8) {
      Alert.alert('Too Short', 'New password must be at least 8 characters.'); return;
    }
    try {
      setSavingPwd(true);
      await client.put('/auth/change-password', { currentPassword: currentPwd, newPassword: newPwd });
      Alert.alert('Password Changed', 'Your password has been updated successfully.');
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      setShowChangePwd(false);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not change password.');
    } finally { setSavingPwd(false); }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const inputStyle = (field: string) => [
    s.inputBox, focused === field && s.inputFocused,
  ];

  return (
    <View style={s.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

          {/* Header */}
          <View style={s.topBar}>
            <View style={s.topBarIcon}>
              <Ionicons name="person" size={20} color="#021B3A" />
            </View>
            <Text style={s.topBarTitle}>Account</Text>
          </View>

          {/* Profile card */}
          <View style={s.profileCard}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{(user?.name ?? 'P').charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.profileName}>{user?.name}</Text>
              <Text style={s.profileEmail}>{user?.email}</Text>
              <View style={s.roleBadge}>
                <Ionicons name="business-outline" size={11} color="#D4A017" />
                <Text style={s.roleBadgeText}>Founding Partner</Text>
              </View>
            </View>
          </View>

          {/* Account info */}
          <Text style={s.sectionLabel}>ACCOUNT INFO</Text>
          <View style={s.infoCard}>
            {[
              { icon: 'person-outline', label: 'Name',  value: user?.name  ?? '—' },
              { icon: 'mail-outline',   label: 'Email', value: user?.email ?? '—' },
              { icon: 'call-outline',   label: 'Phone', value: user?.phone ?? 'Not set' },
            ].map((item, i) => (
              <View key={i} style={[s.infoRow, i < 2 && s.infoRowBorder]}>
                <Ionicons name={item.icon as any} size={18} color="#8E8E93" />
                <View style={{ flex: 1 }}>
                  <Text style={s.infoLabel}>{item.label}</Text>
                  <Text style={s.infoValue}>{item.value}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Change Password */}
          <Text style={s.sectionLabel}>SECURITY</Text>
          <TouchableOpacity
            style={s.actionRow}
            onPress={() => setShowChangePwd(v => !v)}
            activeOpacity={0.8}
          >
            <View style={s.actionIcon}>
              <Ionicons name="lock-closed-outline" size={20} color="#021B3A" />
            </View>
            <Text style={s.actionLabel}>Change Password</Text>
            <Ionicons name={showChangePwd ? 'chevron-up' : 'chevron-down'} size={16} color="#C7C7CC" />
          </TouchableOpacity>

          {showChangePwd && (
            <View style={s.pwdForm}>
              {[
                { key: 'currentPwd', label: 'Current Password', value: currentPwd, setter: setCurrentPwd },
                { key: 'newPwd',     label: 'New Password',     value: newPwd,     setter: setNewPwd     },
                { key: 'confirmPwd', label: 'Confirm New Password', value: confirmPwd, setter: setConfirmPwd },
              ].map(item => (
                <View key={item.key} style={s.field}>
                  <Text style={s.label}>{item.label}</Text>
                  <View style={inputStyle(item.key)}>
                    <TextInput
                      style={s.input}
                      secureTextEntry
                      placeholderTextColor="#C7C7CC"
                      placeholder="••••••••"
                      value={item.value}
                      onChangeText={item.setter}
                      onFocus={() => setFocused(item.key)}
                      onBlur={() => setFocused(null)}
                    />
                  </View>
                </View>
              ))}
              <TouchableOpacity
                style={[s.savePwdBtn, savingPwd && s.disabled]}
                onPress={handleChangePassword}
                disabled={savingPwd}
                activeOpacity={0.85}
              >
                {savingPwd
                  ? <ActivityIndicator color="#FFFFFF" size="small" />
                  : <Text style={s.savePwdBtnText}>Update Password</Text>
                }
              </TouchableOpacity>
            </View>
          )}

          {/* Sign Out */}
          <Text style={s.sectionLabel}>SESSION</Text>
          <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={20} color="#E53935" />
            <Text style={s.signOutText}>Sign Out</Text>
          </TouchableOpacity>

          {/* Version */}
          <Text style={s.version}>Road Ready Network · Partner v1.0</Text>

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

  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#F8F8FA', borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: '#EBEBEF', marginTop: 16, marginBottom: 24,
  },
  avatar:       { width: 56, height: 56, borderRadius: 28, backgroundColor: '#021B3A', justifyContent: 'center', alignItems: 'center' },
  avatarText:   { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  profileName:  { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  profileEmail: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  roleBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, alignSelf: 'flex-start', backgroundColor: '#FFF8E1', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#FFE082' },
  roleBadgeText: { fontSize: 11, fontWeight: '700', color: '#D4A017' },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#8E8E93', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, marginTop: 8 },

  infoCard:    { backgroundColor: '#F8F8FA', borderRadius: 16, borderWidth: 1, borderColor: '#EBEBEF', overflow: 'hidden', marginBottom: 24 },
  infoRow:     { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F0F5' },
  infoLabel:   { fontSize: 12, color: '#8E8E93', fontWeight: '500' },
  infoValue:   { fontSize: 15, color: '#1A1A2E', fontWeight: '600', marginTop: 1 },

  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#F8F8FA', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#EBEBEF', marginBottom: 8,
  },
  actionIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  actionLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1A1A2E' },

  pwdForm:    { backgroundColor: '#F8F8FA', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#EBEBEF', marginBottom: 8, gap: 12 },
  field:      { gap: 6 },
  label:      { fontSize: 13, fontWeight: '600', color: '#1A1A2E' },
  inputBox:   { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 14, height: 48, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#EBEBEF' },
  inputFocused: { borderColor: '#021B3A' },
  input:      { flex: 1, fontSize: 15, color: '#1A1A2E' },
  savePwdBtn: { height: 48, borderRadius: 24, backgroundColor: '#021B3A', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  savePwdBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  disabled:   { opacity: 0.55 },

  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    height: 52, borderRadius: 14, backgroundColor: '#FFF5F5',
    borderWidth: 1, borderColor: '#FFCDD2', marginBottom: 20,
  },
  signOutText: { fontSize: 15, fontWeight: '700', color: '#E53935' },

  version: { textAlign: 'center', fontSize: 12, color: '#C7C7CC', marginBottom: 8 },
});
