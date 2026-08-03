import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { useColors } from '../../constants/colors';
import client from '../../api/client';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'PartnerApplication'> };

const CATEGORIES = [
  'Mechanic', 'Tire Shop', 'Fuel Station', 'Hotel / Motel',
  'Restaurant', 'Truck Wash', 'Compliance Service', 'Towing',
  'Weigh Station Services', 'Other',
];

export default function PartnerApplicationScreen({ navigation }: Props) {
  const Colors = useColors();
  const s = getStyles(Colors);
  const [businessName,  setBusinessName]  = useState('');
  const [category,      setCategory]      = useState('');
  const [contactName,   setContactName]   = useState('');
  const [email,         setEmail]         = useState('');
  const [phone,         setPhone]         = useState('');
  const [city,          setCity]          = useState('');
  const [state,         setState]         = useState('');
  const [website,       setWebsite]       = useState('');
  const [description,   setDescription]   = useState('');
  const [referralCode,  setReferralCode]  = useState('');
  const [focused,       setFocused]       = useState<string | null>(null);
  const [loading,       setLoading]       = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);

  const inputStyle = (field: string) => [
    s.inputBox,
    focused === field && s.inputFocused,
  ];

  const handleSubmit = async () => {
    if (!businessName.trim() || !category || !contactName.trim() || !email.trim() || !phone.trim() || !city.trim() || !state.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all required fields marked with *.');
      return;
    }
    try {
      setLoading(true);
      await client.post('/partner-applications', {
        businessName: businessName.trim(),
        category,
        contactName: contactName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        city: city.trim(),
        state: state.trim().toUpperCase(),
        website: website.trim() || undefined,
        description: description.trim() || undefined,
        referralCode: referralCode.trim() || undefined,
      });
      navigation.replace('PartnerApplicationSuccess');
    } catch (err: any) {
      Alert.alert('Submission Failed', err.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

          {/* Header bar */}
          <View style={s.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
              <Ionicons name="chevron-back" size={22} color={Colors.text} />
            </TouchableOpacity>
            <Text style={s.topBarTitle}>Partner Application</Text>
            <View style={{ width: 32 }} />
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.scroll}
          >
            <Text style={s.pageTitle}>Tell us about your business</Text>
            <Text style={s.pageSub}>Fields marked with * are required. We'll review your application and reach out within 2–3 business days.</Text>

            {/* Business Info */}
            <Text style={s.sectionLabel}>BUSINESS INFO</Text>

            <View style={s.field}>
              <Text style={s.label}>Business Name *</Text>
              <View style={inputStyle('businessName')}>
                <TextInput
                  style={s.input}
                  placeholder="e.g. Mike's Truck Repair"
                  placeholderTextColor={Colors.textMuted}
                  value={businessName}
                  onChangeText={setBusinessName}
                  onFocus={() => setFocused('businessName')}
                  onBlur={() => setFocused(null)}
                />
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>Business Category *</Text>
              <TouchableOpacity
                style={[inputStyle('category'), s.pickerRow]}
                onPress={() => setShowCatPicker(v => !v)}
                activeOpacity={0.8}
              >
                <Text style={[s.input, !category && { color: Colors.textMuted }]}>
                  {category || 'Select a category'}
                </Text>
                <Ionicons name={showCatPicker ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
              </TouchableOpacity>
              {showCatPicker && (
                <View style={s.catList}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[s.catItem, category === cat && s.catItemSelected]}
                      onPress={() => { setCategory(cat); setShowCatPicker(false); }}
                      activeOpacity={0.75}
                    >
                      <Text style={[s.catItemText, category === cat && s.catItemTextSelected]}>
                        {cat}
                      </Text>
                      {category === cat && <Ionicons name="checkmark" size={16} color={Colors.secondary} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={s.row}>
              <View style={[s.field, { flex: 1 }]}>
                <Text style={s.label}>City *</Text>
                <View style={inputStyle('city')}>
                  <TextInput
                    style={s.input}
                    placeholder="Los Angeles"
                    placeholderTextColor={Colors.textMuted}
                    value={city}
                    onChangeText={setCity}
                    onFocus={() => setFocused('city')}
                    onBlur={() => setFocused(null)}
                  />
                </View>
              </View>
              <View style={[s.field, { width: 80 }]}>
                <Text style={s.label}>State *</Text>
                <View style={inputStyle('state')}>
                  <TextInput
                    style={s.input}
                    placeholder="CA"
                    placeholderTextColor={Colors.textMuted}
                    value={state}
                    onChangeText={v => setState(v.toUpperCase())}
                    autoCapitalize="characters"
                    maxLength={2}
                    onFocus={() => setFocused('state')}
                    onBlur={() => setFocused(null)}
                  />
                </View>
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>Website (optional)</Text>
              <View style={inputStyle('website')}>
                <TextInput
                  style={s.input}
                  placeholder="https://yourbusiness.com"
                  placeholderTextColor={Colors.textMuted}
                  value={website}
                  onChangeText={setWebsite}
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setFocused('website')}
                  onBlur={() => setFocused(null)}
                />
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>Referral Code (optional)</Text>
              <View style={inputStyle('referralCode')}>
                <TextInput
                  style={s.input}
                  placeholder="Were you referred by a driver or partner?"
                  placeholderTextColor={Colors.textMuted}
                  value={referralCode}
                  onChangeText={(t) => setReferralCode(t.toUpperCase())}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  onFocus={() => setFocused('referralCode')}
                  onBlur={() => setFocused(null)}
                />
              </View>
            </View>

            {/* Contact Info */}
            <Text style={s.sectionLabel}>CONTACT INFO</Text>

            <View style={s.field}>
              <Text style={s.label}>Contact Name *</Text>
              <View style={inputStyle('contactName')}>
                <TextInput
                  style={s.input}
                  placeholder="Full name"
                  placeholderTextColor={Colors.textMuted}
                  value={contactName}
                  onChangeText={setContactName}
                  onFocus={() => setFocused('contactName')}
                  onBlur={() => setFocused(null)}
                />
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>Email Address *</Text>
              <View style={inputStyle('email')}>
                <TextInput
                  style={s.input}
                  placeholder="business@email.com"
                  placeholderTextColor={Colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                />
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>Phone Number *</Text>
              <View style={inputStyle('phone')}>
                <TextInput
                  style={s.input}
                  placeholder="+1 (555) 000-0000"
                  placeholderTextColor={Colors.textMuted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  onFocus={() => setFocused('phone')}
                  onBlur={() => setFocused(null)}
                />
              </View>
            </View>

            {/* About */}
            <Text style={s.sectionLabel}>ABOUT YOUR BUSINESS</Text>

            <View style={s.field}>
              <Text style={s.label}>Short Description (optional)</Text>
              <View style={[inputStyle('description'), { height: 100, alignItems: 'flex-start', paddingTop: 14 }]}>
                <TextInput
                  style={[s.input, { textAlignVertical: 'top' }]}
                  placeholder="What services do you offer? What makes your business stand out?"
                  placeholderTextColor={Colors.textMuted}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  onFocus={() => setFocused('description')}
                  onBlur={() => setFocused(null)}
                />
              </View>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[s.submitBtn, loading && s.disabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color={Colors.white} />
                : (
                  <>
                    <Ionicons name="send-outline" size={18} color={Colors.white} />
                    <Text style={s.submitBtnText}>Submit Application</Text>
                  </>
                )
              }
            </TouchableOpacity>

            <Text style={s.note}>
              By submitting, you agree that your business information will be reviewed by our team. You'll receive an email with next steps within 2–3 business days.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const getStyles = (Colors: ReturnType<typeof useColors>) => StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn:      { padding: 4 },
  topBarTitle:  { fontSize: 16, fontWeight: '700', color: Colors.text },

  pageTitle: { fontSize: 26, fontWeight: '800', color: Colors.text, marginTop: 20, marginBottom: 6 },
  pageSub:   { fontSize: 13, color: Colors.textMuted, lineHeight: 19, marginBottom: 24 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    letterSpacing: 1, textTransform: 'uppercase',
    marginBottom: 12, marginTop: 8,
  },

  field:  { gap: 6, marginBottom: 14 },
  row:    { flexDirection: 'row', gap: 10 },
  label:  { fontSize: 14, fontWeight: '600', color: Colors.text },

  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, paddingHorizontal: 16, height: 52,
    backgroundColor: Colors.inputBg, borderWidth: 1.5, borderColor: Colors.border,
  },
  inputFocused: { borderColor: Colors.primary, backgroundColor: Colors.background },
  input:        { flex: 1, fontSize: 15, color: Colors.text },

  pickerRow: { justifyContent: 'space-between' },

  catList: {
    backgroundColor: Colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden', marginTop: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  catItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  catItemSelected:     { backgroundColor: Colors.surfaceLight },
  catItemText:         { fontSize: 15, color: Colors.text },
  catItemTextSelected: { fontWeight: '700', color: Colors.secondary },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 56, borderRadius: 28,
    backgroundColor: Colors.primary,
    gap: 10, marginTop: 12,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22, shadowRadius: 10, elevation: 5,
  },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
  disabled:      { opacity: 0.55 },

  note: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', marginTop: 16, lineHeight: 17 },
});
