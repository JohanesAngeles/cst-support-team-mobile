import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';

const CATEGORIES = [
  'Mechanic', 'Tire Shop', 'Fuel Station', 'Hotel / Motel',
  'Restaurant', 'Truck Wash', 'Compliance Service', 'Towing',
  'Weigh Station Services', 'Other',
];

interface Listing {
  businessName: string;
  category: string;
  phone: string;
  city: string;
  state: string;
  website: string;
  description: string;
  hours: string;
  isActive: boolean;
}

export default function MyListingScreen() {
  const [form,          setForm]          = useState<Listing>({ businessName: '', category: '', phone: '', city: '', state: '', website: '', description: '', hours: '', isActive: true });
  const [focused,       setFocused]       = useState<string | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [exists,        setExists]        = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await client.get('/partner/listing');
      if (res.data) {
        setExists(true);
        setForm({
          businessName: res.data.businessName ?? '',
          category:     res.data.category     ?? '',
          phone:        res.data.phone         ?? '',
          city:         res.data.city          ?? '',
          state:        res.data.state         ?? '',
          website:      res.data.website       ?? '',
          description:  res.data.description   ?? '',
          hours:        res.data.hours         ?? '',
          isActive:     res.data.isActive      ?? true,
        });
      }
    } catch { /* no listing yet */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (key: keyof Listing, value: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.businessName.trim() || !form.category || !form.phone.trim() || !form.city.trim() || !form.state.trim()) {
      Alert.alert('Missing Fields', 'Business Name, Category, Phone, City, and State are required.');
      return;
    }
    try {
      setSaving(true);
      await client.put('/partner/listing', {
        businessName: form.businessName.trim(),
        category:     form.category,
        phone:        form.phone.trim(),
        city:         form.city.trim(),
        state:        form.state.trim().toUpperCase(),
        website:      form.website.trim()     || undefined,
        description:  form.description.trim() || undefined,
        hours:        form.hours.trim()        || undefined,
        isActive:     form.isActive,
      });
      setExists(true);
      Alert.alert('Saved', 'Your listing has been updated.');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not save listing.');
    } finally { setSaving(false); }
  };

  const inputStyle = (field: string) => [
    s.inputBox, focused === field && s.inputFocused,
  ];

  if (loading) {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#021B3A" />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

          {/* Header */}
          <View style={s.topBar}>
            <View style={s.topBarIcon}>
              <Ionicons name="storefront" size={22} color="#021B3A" />
            </View>
            <Text style={s.topBarTitle}>My Listing</Text>
            <TouchableOpacity
              style={[s.saveBtn, saving && s.disabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={s.saveBtnText}>Save</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.scroll}
          >
            {/* Live toggle */}
            <View style={s.liveRow}>
              <View>
                <Text style={s.liveTitle}>Listing Status</Text>
                <Text style={s.liveSub}>{form.isActive ? 'Drivers can see your listing on the map' : 'Your listing is hidden from drivers'}</Text>
              </View>
              <TouchableOpacity
                style={[s.toggle, form.isActive && s.toggleOn]}
                onPress={() => set('isActive', !form.isActive)}
                activeOpacity={0.8}
              >
                <View style={[s.toggleKnob, form.isActive && s.toggleKnobOn]} />
              </TouchableOpacity>
            </View>

            {/* Business Info */}
            <Text style={s.sectionLabel}>BUSINESS INFO</Text>

            <View style={s.field}>
              <Text style={s.label}>Business Name *</Text>
              <View style={inputStyle('businessName')}>
                <TextInput style={s.input} placeholder="e.g. Mike's Truck Repair" placeholderTextColor="#C7C7CC"
                  value={form.businessName} onChangeText={v => set('businessName', v)}
                  onFocus={() => setFocused('businessName')} onBlur={() => setFocused(null)} />
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>Category *</Text>
              <TouchableOpacity style={[inputStyle('category'), s.pickerRow]} onPress={() => setShowCatPicker(v => !v)} activeOpacity={0.8}>
                <Text style={[s.input, !form.category && { color: '#C7C7CC' }]}>{form.category || 'Select a category'}</Text>
                <Ionicons name={showCatPicker ? 'chevron-up' : 'chevron-down'} size={18} color="#8E8E93" />
              </TouchableOpacity>
              {showCatPicker && (
                <View style={s.catList}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity key={cat} style={[s.catItem, form.category === cat && s.catItemSelected]}
                      onPress={() => { set('category', cat); setShowCatPicker(false); }} activeOpacity={0.75}>
                      <Text style={[s.catItemText, form.category === cat && s.catItemTextSelected]}>{cat}</Text>
                      {form.category === cat && <Ionicons name="checkmark" size={16} color="#021B3A" />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={s.field}>
              <Text style={s.label}>Phone Number *</Text>
              <View style={inputStyle('phone')}>
                <TextInput style={s.input} placeholder="+1 (555) 000-0000" placeholderTextColor="#C7C7CC"
                  value={form.phone} onChangeText={v => set('phone', v)} keyboardType="phone-pad"
                  onFocus={() => setFocused('phone')} onBlur={() => setFocused(null)} />
              </View>
            </View>

            <View style={s.row}>
              <View style={[s.field, { flex: 1 }]}>
                <Text style={s.label}>City *</Text>
                <View style={inputStyle('city')}>
                  <TextInput style={s.input} placeholder="Los Angeles" placeholderTextColor="#C7C7CC"
                    value={form.city} onChangeText={v => set('city', v)}
                    onFocus={() => setFocused('city')} onBlur={() => setFocused(null)} />
                </View>
              </View>
              <View style={[s.field, { width: 80 }]}>
                <Text style={s.label}>State *</Text>
                <View style={inputStyle('state')}>
                  <TextInput style={s.input} placeholder="CA" placeholderTextColor="#C7C7CC"
                    value={form.state} onChangeText={v => set('state', v.toUpperCase())}
                    autoCapitalize="characters" maxLength={2}
                    onFocus={() => setFocused('state')} onBlur={() => setFocused(null)} />
                </View>
              </View>
            </View>

            {/* Additional Info */}
            <Text style={s.sectionLabel}>ADDITIONAL INFO</Text>

            <View style={s.field}>
              <Text style={s.label}>Business Hours</Text>
              <View style={inputStyle('hours')}>
                <TextInput style={s.input} placeholder="e.g. Mon–Sat 7am–6pm" placeholderTextColor="#C7C7CC"
                  value={form.hours} onChangeText={v => set('hours', v)}
                  onFocus={() => setFocused('hours')} onBlur={() => setFocused(null)} />
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>Website</Text>
              <View style={inputStyle('website')}>
                <TextInput style={s.input} placeholder="https://yourbusiness.com" placeholderTextColor="#C7C7CC"
                  value={form.website} onChangeText={v => set('website', v)}
                  keyboardType="url" autoCapitalize="none" autoCorrect={false}
                  onFocus={() => setFocused('website')} onBlur={() => setFocused(null)} />
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>Description</Text>
              <View style={[inputStyle('description'), { height: 110, alignItems: 'flex-start', paddingTop: 14 }]}>
                <TextInput style={[s.input, { textAlignVertical: 'top' }]}
                  placeholder="Tell drivers what you offer and what makes your business stand out."
                  placeholderTextColor="#C7C7CC" value={form.description}
                  onChangeText={v => set('description', v)} multiline numberOfLines={4}
                  onFocus={() => setFocused('description')} onBlur={() => setFocused(null)} />
              </View>
            </View>

            {/* Driver preview hint */}
            <View style={s.previewHint}>
              <Ionicons name="information-circle-outline" size={18} color="#8E8E93" />
              <Text style={s.previewHintText}>
                Drivers will see your business name, category, city/state, phone number, hours, and rating on the map.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 100 },

  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F5', gap: 10 },
  topBarIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  topBarTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: '#1A1A2E' },
  saveBtn: { paddingHorizontal: 18, paddingVertical: 9, backgroundColor: '#021B3A', borderRadius: 20 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  disabled: { opacity: 0.55 },

  liveRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F8F8FA', borderRadius: 16, padding: 16, marginTop: 16, marginBottom: 20,
    borderWidth: 1, borderColor: '#EBEBEF',
  },
  liveTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  liveSub:   { fontSize: 12, color: '#8E8E93', marginTop: 3, maxWidth: 220 },
  toggle:    { width: 50, height: 28, borderRadius: 14, backgroundColor: '#E0E0E0', justifyContent: 'center', paddingHorizontal: 3 },
  toggleOn:  { backgroundColor: '#021B3A' },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', alignSelf: 'flex-start' },
  toggleKnobOn: { alignSelf: 'flex-end' },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#8E8E93', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, marginTop: 8 },

  field:    { gap: 6, marginBottom: 14 },
  row:      { flexDirection: 'row', gap: 10 },
  label:    { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  inputBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 16, height: 52, backgroundColor: '#F8F8FA', borderWidth: 1.5, borderColor: '#EBEBEF' },
  inputFocused: { borderColor: '#021B3A', backgroundColor: '#FFFFFF' },
  input:    { flex: 1, fontSize: 15, color: '#1A1A2E' },
  pickerRow: { justifyContent: 'space-between' },

  catList: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#EBEBEF', overflow: 'hidden', marginTop: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  catItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F5' },
  catItemSelected: { backgroundColor: '#F0F4FA' },
  catItemText: { fontSize: 15, color: '#1A1A2E' },
  catItemTextSelected: { fontWeight: '700', color: '#021B3A' },

  previewHint: { flexDirection: 'row', gap: 10, backgroundColor: '#F8F8FA', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#EBEBEF', marginTop: 8 },
  previewHintText: { flex: 1, fontSize: 13, color: '#8E8E93', lineHeight: 18 },
});
