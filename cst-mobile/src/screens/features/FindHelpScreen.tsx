import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Linking, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useColors } from '../../constants/colors';

interface HelpCategory {
  icon: string;
  label: string;
  sublabel: string;
  color: string;
  query: string;
}

const CATEGORIES: HelpCategory[] = [
  { icon: 'business-outline',   label: 'Truck Stops',        sublabel: 'Flying J, Loves, Pilot',    color: '#3498DB', query: 'truck+stop' },
  { icon: 'water-outline',      label: 'Diesel Fuel',         sublabel: 'Fuel stations near me',     color: '#1ABC9C', query: 'diesel+fuel+station' },
  { icon: 'construct-outline',  label: 'Truck Repair',        sublabel: 'Mechanics & service shops', color: '#E67E22', query: 'semi+truck+repair+shop' },
  { icon: 'scale-outline',      label: 'Weigh Stations',      sublabel: 'DOT inspection stations',   color: '#9B59B6', query: 'weigh+station+truck' },
  { icon: 'medical-outline',    label: 'Hospitals / Urgent',  sublabel: 'Emergency medical care',    color: '#E74C3C', query: 'hospital+emergency+room' },
  { icon: 'bed-outline',        label: 'Rest Areas',          sublabel: 'Rest stops & parking',      color: '#F39C12', query: 'rest+area+truck+parking' },
  { icon: 'car-outline',        label: 'Tire Shops',          sublabel: 'Truck tire repair',         color: '#2ECC71', query: 'semi+truck+tire+shop' },
  { icon: 'shield-outline',     label: 'DOT / Inspections',   sublabel: 'DOT offices near me',       color: '#1A3A5C', query: 'DOT+truck+inspection+station' },
  { icon: 'restaurant-outline', label: 'Restaurants',         sublabel: 'Truck-friendly dining',     color: '#2C6EBD', query: 'truck+friendly+restaurant' },
  { icon: 'home-outline',       label: 'Truck Parking',       sublabel: 'Safe overnight parking',    color: '#8E44AD', query: 'semi+truck+parking' },
  { icon: 'people-outline',     label: 'CAT Scale',           sublabel: 'Certified scales',          color: '#16A085', query: 'CAT+Scale+truck' },
  { icon: 'briefcase-outline',  label: 'Freight / Brokers',   sublabel: 'Load boards & brokers',     color: '#C0392B', query: 'freight+broker+office' },
];

export default function FindHelpScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: 16, paddingBottom: 36 },
    banner: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: Colors.surface, borderRadius: 14, padding: 16,
      borderWidth: 1, borderColor: Colors.secondary + '44', marginBottom: 20,
    },
    bannerTitle: { color: Colors.text, fontSize: 15, fontWeight: '800' },
    bannerSub: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
    locBtn: { backgroundColor: Colors.secondary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    locBtnText: { color: Colors.textDark, fontSize: 12, fontWeight: '800' },
    sectionLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    card: {
      width: '47%', backgroundColor: Colors.surface, borderRadius: 14,
      padding: 14, borderWidth: 1, borderColor: Colors.border,
    },
    iconCircle: {
      width: 52, height: 52, borderRadius: 26,
      justifyContent: 'center', alignItems: 'center', marginBottom: 10,
    },
    cardLabel: { color: Colors.text, fontSize: 13, fontWeight: '700' },
    cardSub: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
    openBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      marginTop: 8, backgroundColor: Colors.secondary + '18',
      paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4,
      alignSelf: 'flex-start', borderWidth: 1, borderColor: Colors.secondary + '44',
    },
    openBadgeText: { color: Colors.secondary, fontSize: 9, fontWeight: '800' },
    tipCard: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 10,
      backgroundColor: Colors.secondary + '12', borderRadius: 12, padding: 14,
      borderWidth: 1, borderColor: Colors.secondary + '30',
    },
    tipText: { color: Colors.secondary, fontSize: 12, flex: 1, lineHeight: 18 },
  }), [Colors]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);

  const getLocation = useCallback(async (): Promise<{ lat: number; lng: number } | null> => {
    if (location) return location;
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Required', 'Enable location to find nearby services.');
        return null;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setLocation(coords);
      return coords;
    } catch {
      Alert.alert('Error', 'Could not get your location. Please try again.');
      return null;
    } finally {
      setLocLoading(false);
    }
  }, [location]);

  const openMap = async (category: HelpCategory) => {
    const coords = await getLocation();
    if (!coords) return;

    const { lat, lng } = coords;
    let url: string;

    if (Platform.OS === 'ios') {
      url = `maps://maps.apple.com/?q=${category.query}&sll=${lat},${lng}&z=12`;
    } else {
      url = `geo:${lat},${lng}?q=${category.query}`;
    }

    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      // Fallback to Google Maps web
      const webUrl = `https://www.google.com/maps/search/${category.query}/@${lat},${lng},12z`;
      await Linking.openURL(webUrl);
    }
  };


  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.banner}>
          <Ionicons name="location" size={20} color={Colors.secondary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Find Help Near You</Text>
            <Text style={styles.bannerSub}>
              {location
                ? `Location ready · ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
                : 'Tap any category to auto-detect your location'}
            </Text>
          </View>
          {locLoading
            ? <ActivityIndicator size="small" color={Colors.secondary} />
            : location
              ? <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              : <TouchableOpacity style={styles.locBtn} onPress={getLocation}>
                  <Text style={styles.locBtnText}>Get Location</Text>
                </TouchableOpacity>
          }
        </View>

        <Text style={styles.sectionLabel}>SERVICES</Text>
        <View style={styles.grid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.label}
              style={styles.card}
              onPress={() => openMap(cat)}
              activeOpacity={0.75}
            >
              <View style={[styles.iconCircle, { backgroundColor: cat.color + '22' }]}>
                <Ionicons name={cat.icon as any} size={28} color={cat.color} />
              </View>
              <Text style={styles.cardLabel}>{cat.label}</Text>
              <Text style={styles.cardSub}>{cat.sublabel}</Text>
              <View style={styles.openBadge}>
                <Ionicons name="map-outline" size={10} color={Colors.secondary} />
                <Text style={styles.openBadgeText}>OPEN MAPS</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tipCard}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.secondary} />
          <Text style={styles.tipText}>
            Tapping any service opens your phone's Maps app and searches near your current GPS location. Make sure location services are enabled for best results.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
