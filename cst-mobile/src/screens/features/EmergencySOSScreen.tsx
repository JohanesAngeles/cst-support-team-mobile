import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, Linking, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

const EMERGENCY_CONTACTS = [
  { label: 'Emergency Dispatch', number: '911', icon: 'alert-circle', color: '#E74C3C', primary: true },
  { label: 'Roadside Assistance', number: '18007738267', icon: 'car', color: '#E67E22', primary: false },
  { label: 'Medical Assistance', number: '18002221222', icon: 'medical', color: '#2ECC71', primary: false },
  { label: 'Police Non-Emergency', number: '311', icon: 'shield', color: '#3498DB', primary: false },
  { label: 'Breakdown Help', number: '18008692277', icon: 'construct', color: '#9B59B6', primary: false },
  { label: 'Attorney Access', number: '18005551234', icon: 'briefcase', color: '#1ABC9C', primary: false },
];

export default function EmergencySOSScreen() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [sosActive, setSosActive] = useState(false);

  const getLocation = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for emergency services to find you.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      });
    } catch {
      Alert.alert('Error', 'Could not retrieve location. Please try again.');
    } finally {
      setLocLoading(false);
    }
  };

  const activateSOS = async () => {
    setSosActive(true);
    await getLocation();
    Alert.alert(
      '🚨 SOS ACTIVATED',
      'Your location has been recorded. Tap a contact below to connect with emergency services.',
      [{ text: 'OK' }]
    );
  };

  const callNumber = (number: string, label: string) => {
    Alert.alert(`Call ${label}?`, `You are about to call ${label}.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call Now', style: 'destructive', onPress: () => Linking.openURL(`tel:${number}`) },
    ]);
  };

  const shareLocation = () => {
    if (!location) {
      Alert.alert('No Location', 'Please activate SOS first to get your location.');
      return;
    }
    const mapsUrl = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
    Linking.openURL(mapsUrl);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* SOS Button */}
        <View style={styles.sosSection}>
          <TouchableOpacity
            style={[styles.sosButton, sosActive && styles.sosButtonActive]}
            onPress={activateSOS}
            disabled={locLoading}
          >
            {locLoading
              ? <ActivityIndicator size="large" color={Colors.white} />
              : <>
                  <Text style={styles.sosText}>SOS</Text>
                  <Text style={styles.sosSubText}>{sosActive ? 'ACTIVATED' : 'PRESS & HOLD'}</Text>
                </>
            }
          </TouchableOpacity>
          <Text style={styles.sosHint}>
            {sosActive ? 'SOS is active — your location is ready to share' : 'Tap to activate emergency mode and get your GPS location'}
          </Text>
        </View>

        {/* Location Card */}
        <View style={styles.locationCard}>
          <View style={styles.locationHeader}>
            <Ionicons name="location" size={20} color={location ? Colors.success : Colors.textMuted} />
            <Text style={styles.locationTitle}>GPS Location</Text>
            {!location && (
              <TouchableOpacity style={styles.getLocBtn} onPress={getLocation} disabled={locLoading}>
                <Text style={styles.getLocText}>Get Location</Text>
              </TouchableOpacity>
            )}
          </View>
          {location ? (
            <>
              <Text style={styles.coordText}>
                {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </Text>
              {location.accuracy && (
                <Text style={styles.accuracyText}>Accuracy: ±{Math.round(location.accuracy)}m</Text>
              )}
              <TouchableOpacity style={styles.shareBtn} onPress={shareLocation}>
                <Ionicons name="share-outline" size={16} color={Colors.textDark} />
                <Text style={styles.shareBtnText}>Share Location on Maps</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.noLocText}>Location not yet retrieved</Text>
          )}
        </View>

        {/* Emergency Contacts */}
        <Text style={styles.sectionTitle}>Emergency Contacts</Text>
        <View style={styles.contactGrid}>
          {EMERGENCY_CONTACTS.map((contact) => (
            <TouchableOpacity
              key={contact.label}
              style={[
                styles.contactCard,
                contact.primary && styles.contactCardPrimary,
                { borderColor: contact.color + '55' },
              ]}
              onPress={() => callNumber(contact.number, contact.label)}
            >
              <View style={[styles.contactIcon, { backgroundColor: contact.color + '22' }]}>
                <Ionicons name={contact.icon as any} size={contact.primary ? 28 : 22} color={contact.color} />
              </View>
              <Text style={[styles.contactLabel, contact.primary && styles.contactLabelPrimary]}>
                {contact.label}
              </Text>
              {contact.primary && (
                <View style={[styles.callBadge, { backgroundColor: contact.color }]}>
                  <Ionicons name="call" size={12} color={Colors.white} />
                  <Text style={styles.callBadgeText}>CALL {contact.number}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        {[
          { icon: 'camera-outline', label: 'Take Accident Photos', color: '#3498DB' },
          { icon: 'document-text-outline', label: 'File Accident Report', color: '#9B59B6' },
          { icon: 'location-outline', label: 'Share Live Location', color: Colors.success, onPress: shareLocation },
          { icon: 'shield-outline', label: 'Contact My Attorney', color: '#1ABC9C' },
        ].map(({ icon, label, color, onPress }) => (
          <TouchableOpacity key={label} style={styles.quickAction} onPress={onPress}>
            <View style={[styles.quickIcon, { backgroundColor: color + '22' }]}>
              <Ionicons name={icon as any} size={22} color={color} />
            </View>
            <Text style={styles.quickLabel}>{label}</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, gap: 16, paddingBottom: 32 },
  sosSection: { alignItems: 'center', gap: 16 },
  sosButton: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: Colors.danger, justifyContent: 'center', alignItems: 'center',
    borderWidth: 6, borderColor: '#FF6B6B',
    shadowColor: Colors.danger, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 20, elevation: 12,
  },
  sosButtonActive: { backgroundColor: '#990000', borderColor: Colors.danger },
  sosText: { color: Colors.white, fontSize: 42, fontWeight: '900', letterSpacing: 2 },
  sosSubText: { color: '#FFB3B3', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  sosHint: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', maxWidth: 280 },
  locationCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  locationHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationTitle: { color: Colors.white, fontSize: 15, fontWeight: '700', flex: 1 },
  getLocBtn: { backgroundColor: Colors.surfaceLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  getLocText: { color: Colors.secondary, fontSize: 12, fontWeight: '700' },
  coordText: { color: Colors.success, fontSize: 14, fontWeight: '700', fontFamily: 'monospace' },
  accuracyText: { color: Colors.textMuted, fontSize: 12 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.secondary, borderRadius: 10, padding: 10, gap: 8, marginTop: 4 },
  shareBtnText: { color: Colors.textDark, fontWeight: '700', fontSize: 13 },
  noLocText: { color: Colors.textMuted, fontSize: 13 },
  sectionTitle: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  contactGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  contactCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, width: '47%', alignItems: 'center', gap: 8, borderWidth: 1 },
  contactCardPrimary: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 14 },
  contactIcon: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  contactLabel: { color: Colors.white, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  contactLabelPrimary: { flex: 1, fontSize: 16, textAlign: 'left' },
  callBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  callBadgeText: { color: Colors.white, fontSize: 11, fontWeight: '800' },
  quickAction: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 16, gap: 14, borderWidth: 1, borderColor: Colors.border },
  quickIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  quickLabel: { flex: 1, color: Colors.white, fontSize: 15 },
});
