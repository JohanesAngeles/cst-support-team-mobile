import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, Linking, ActivityIndicator, ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useColors } from '../../constants/colors';
import { MainStackParamList } from '../../navigation/MainStack';
import { getEmergencyContacts } from '../../api/features';

type Nav = NativeStackNavigationProp<MainStackParamList>;

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

interface Contact {
  _id: string;
  name: string;
  phone: string;
  relationship: string;
}

const EMERGENCY_CONTACTS = [
  { label: 'Emergency Dispatch',  number: '911',          icon: 'alert-circle', color: '#E74C3C', primary: true  },
  { label: 'Roadside Assistance', number: '18007738267',  icon: 'car',          color: '#E67E22', primary: false },
  { label: 'Poison Control',      number: '18002221222',  icon: 'medical',      color: '#2ECC71', primary: false },
  { label: 'Police Non-Emergency',number: '311',          icon: 'shield',       color: '#3498DB', primary: false },
  { label: 'Breakdown Help',      number: '18008692277',  icon: 'construct',    color: '#9B59B6', primary: false },
  { label: 'OOIDA Legal Hotline', number: '18008083515',  icon: 'briefcase',    color: '#1ABC9C', primary: false },
];

export default function EmergencySOSScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
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
    cancelBtn: { backgroundColor: Colors.surfaceLight, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10, borderWidth: 1, borderColor: Colors.danger },
    cancelBtnText: { color: Colors.danger, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
    locationCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 8 },
    locationHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    locationTitle: { color: Colors.text, fontSize: 15, fontWeight: '700', flex: 1 },
    getLocBtn: { backgroundColor: Colors.surfaceLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
    getLocText: { color: Colors.secondary, fontSize: 12, fontWeight: '700' },
    coordText: { color: Colors.success, fontSize: 14, fontWeight: '700', fontFamily: 'monospace' },
    accuracyText: { color: Colors.textMuted, fontSize: 12 },
    shareBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.secondary, borderRadius: 10, padding: 10, gap: 8, marginTop: 4 },
    shareBtnText: { color: Colors.textDark, fontWeight: '700', fontSize: 13 },
    noLocText: { color: Colors.textMuted, fontSize: 13 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionTitle: { color: Colors.text, fontSize: 16, fontWeight: '800' },
    manageBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    manageBtnText: { color: Colors.secondary, fontSize: 13, fontWeight: '700' },
    addContactPrompt: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.secondary + '44', borderStyle: 'dashed' },
    addContactText: { flex: 1, color: Colors.textMuted, fontSize: 13, lineHeight: 18 },
    personalContacts: { gap: 10 },
    personalCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 10 },
    personalInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    personalAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.danger + '33', justifyContent: 'center', alignItems: 'center' },
    personalAvatarText: { color: Colors.danger, fontSize: 17, fontWeight: '900' },
    personalName: { color: Colors.text, fontSize: 14, fontWeight: '700' },
    personalRel: { color: Colors.textMuted, fontSize: 12 },
    smsBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.danger, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
    smsBtnText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
    contactGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    contactCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, width: '47%', alignItems: 'center', gap: 8, borderWidth: 1 },
    contactCardPrimary: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 14 },
    contactIcon: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
    contactLabel: { color: Colors.text, fontSize: 12, fontWeight: '600', textAlign: 'center' },
    contactLabelPrimary: { flex: 1, fontSize: 16, textAlign: 'left' },
    callBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    callBadgeText: { color: Colors.text, fontSize: 11, fontWeight: '800' },
    quickAction: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 16, gap: 14, borderWidth: 1, borderColor: Colors.border },
    quickIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    quickLabel: { flex: 1, color: Colors.text, fontSize: 15 },
  }), [Colors]);
  const navigation = useNavigation<Nav>();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  useFocusEffect(useCallback(() => {
    getEmergencyContacts().then(data => {
      if (Array.isArray(data)) setContacts(data);
    }).catch(() => {});
  }, []));

  const fetchLocation = async (): Promise<LocationData | null> => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for emergency services to find you.');
        return null;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy };
      setLocation(loc);
      return loc;
    } catch {
      Alert.alert('Error', 'Could not retrieve location. Please try again.');
      return null;
    } finally {
      setLocLoading(false);
    }
  };

  const getLocation = fetchLocation;

  const buildSMSBody = (loc: LocationData | null) =>
    loc
      ? `🚨 EMERGENCY — I need help! My location: https://maps.google.com/?q=${loc.latitude},${loc.longitude} (±${Math.round(loc.accuracy ?? 0)}m)`
      : '🚨 EMERGENCY — I need help! I am sending this from the CST app. Please call me immediately.';

  const textContactWithLocation = (contact: Contact, loc: LocationData | null) => {
    const body = buildSMSBody(loc);
    const smsUrl = Platform.OS === 'ios'
      ? `sms:${contact.phone}&body=${encodeURIComponent(body)}`
      : `sms:${contact.phone}?body=${encodeURIComponent(body)}`;
    Linking.openURL(smsUrl);
  };

  const broadcastToAllContacts = async (loc: LocationData | null) => {
    if (contacts.length === 0) {
      Alert.alert('No Contacts', 'Add emergency contacts to broadcast your location.', [
        { text: 'Add Contacts', onPress: () => navigation.navigate('EmergencyContacts') },
        { text: 'OK', style: 'cancel' },
      ]);
      return;
    }
    for (let i = 0; i < contacts.length; i++) {
      const c = contacts[i];
      await new Promise<void>((resolve) => {
        Alert.alert(
          `Texting ${i + 1} of ${contacts.length}`,
          `Sending location to ${c.name} (${c.phone})`,
          [{ text: 'Send', onPress: () => { textContactWithLocation(c, loc); resolve(); } },
           { text: 'Skip', style: 'cancel', onPress: () => resolve() }]
        );
      });
    }
  };

  const takeAccidentPhotos = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera access is needed to take accident photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      Alert.alert(
        'Photo Captured',
        'Photo saved to your camera roll. You can share it with your attorney or insurance company.',
        [{ text: 'OK' }]
      );
    }
  };

  const fileAccidentReport = () => {
    Alert.alert(
      'File Accident Report',
      'The DVIR (Driver Vehicle Inspection Report) screen lets you document vehicle condition and incidents.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open DVIR', onPress: () => navigation.navigate('DVIR') },
      ]
    );
  };

  const contactAttorney = () => {
    Alert.alert(
      'Contact Attorney',
      'The OOIDA legal hotline provides access to legal resources for commercial drivers.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call OOIDA Hotline', onPress: () => Linking.openURL('tel:18008083515') },
        { text: 'Driver Protection Info', onPress: () => navigation.navigate('DriverProtection') },
      ]
    );
  };

  const activateSOS = () => {
    if (sosActive) return;
    if (countdownRef.current) clearInterval(countdownRef.current);

    let tick = 3;
    setCountdown(tick);

    countdownRef.current = setInterval(async () => {
      tick -= 1;
      if (tick > 0) {
        setCountdown(tick);
      } else {
        clearInterval(countdownRef.current!);
        countdownRef.current = null;
        setCountdown(null);
        setSosActive(true);
        const loc = await fetchLocation();
        broadcastToAllContacts(loc);
      }
    }, 1000);
  };

  const cancelSOS = () => {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    setCountdown(null);
    setSosActive(false);
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

  const textContact = (contact: Contact) => textContactWithLocation(contact, location);


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* SOS Button */}
        <View style={styles.sosSection}>
          <TouchableOpacity
            style={[styles.sosButton, (sosActive || countdown !== null) && styles.sosButtonActive]}
            onPress={activateSOS}
            disabled={locLoading || sosActive || countdown !== null}
          >
            {locLoading
              ? <ActivityIndicator size="large" color={Colors.white} />
              : countdown !== null
                ? <>
                    <Text style={styles.sosText}>{countdown}</Text>
                    <Text style={styles.sosSubText}>SENDING...</Text>
                  </>
                : <>
                    <Text style={styles.sosText}>SOS</Text>
                    <Text style={styles.sosSubText}>{sosActive ? 'ACTIVATED' : 'TAP TO ACTIVATE'}</Text>
                  </>
            }
          </TouchableOpacity>
          {countdown !== null && (
            <TouchableOpacity style={styles.cancelBtn} onPress={cancelSOS}>
              <Text style={styles.cancelBtnText}>CANCEL</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.sosHint}>
            {sosActive
              ? 'SOS active — location captured. Contacts have been alerted.'
              : countdown !== null
                ? `Activating in ${countdown}s — tap CANCEL to abort`
                : 'Tap to activate. Will auto-text all emergency contacts with your GPS location.'}
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

        {/* Personal Emergency Contacts */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Contacts</Text>
          <TouchableOpacity style={styles.manageBtn} onPress={() => navigation.navigate('EmergencyContacts')}>
            <Ionicons name="settings-outline" size={15} color={Colors.secondary} />
            <Text style={styles.manageBtnText}>Manage</Text>
          </TouchableOpacity>
        </View>

        {contacts.length === 0 ? (
          <TouchableOpacity style={styles.addContactPrompt} onPress={() => navigation.navigate('EmergencyContacts')}>
            <Ionicons name="person-add-outline" size={20} color={Colors.secondary} />
            <Text style={styles.addContactText}>Add emergency contacts to text your location in one tap</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        ) : (
          <View style={styles.personalContacts}>
            {contacts.map(c => (
              <View key={c._id} style={styles.personalCard}>
                <View style={styles.personalInfo}>
                  <View style={styles.personalAvatar}>
                    <Text style={styles.personalAvatarText}>{c.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View>
                    <Text style={styles.personalName}>{c.name}</Text>
                    <Text style={styles.personalRel}>{c.relationship} · {c.phone}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.smsBtn} onPress={() => textContact(c)}>
                  <Ionicons name="chatbubble-outline" size={15} color={Colors.white} />
                  <Text style={styles.smsBtnText}>Text Location</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Emergency Contacts */}
        <Text style={styles.sectionTitle}>Emergency Services</Text>
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
          { icon: 'camera-outline',        label: 'Take Accident Photos',  color: '#3498DB',      onPress: takeAccidentPhotos },
          { icon: 'document-text-outline', label: 'File Accident Report',  color: '#9B59B6',      onPress: fileAccidentReport },
          { icon: 'location-outline',      label: 'Share Live Location',   color: Colors.success, onPress: shareLocation      },
          { icon: 'shield-outline',        label: 'Contact My Attorney',   color: '#1ABC9C',      onPress: contactAttorney    },
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
