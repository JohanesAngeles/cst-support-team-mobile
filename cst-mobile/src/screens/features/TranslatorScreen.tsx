import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Clipboard,
  FlatList, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useColors } from '../../constants/colors';
import client from '../../api/client';

// ─── Supported languages ──────────────────────────────────────────────────────
const LANGUAGES = [
  { code: 'en', label: 'English',    native: 'English',    flag: '🇺🇸' },
  { code: 'es', label: 'Spanish',    native: 'Español',    flag: '🇪🇸' },
  { code: 'fr', label: 'French',     native: 'Français',   flag: '🇫🇷' },
  { code: 'de', label: 'German',     native: 'Deutsch',    flag: '🇩🇪' },
  { code: 'it', label: 'Italian',    native: 'Italiano',   flag: '🇮🇹' },
  { code: 'zh', label: 'Chinese',    native: '中文',        flag: '🇨🇳' },
  { code: 'ru', label: 'Russian',    native: 'Русский',    flag: '🇷🇺' },
  { code: 'pt', label: 'Portuguese', native: 'Português',  flag: '🇧🇷' },
  { code: 'pl', label: 'Polish',     native: 'Polski',     flag: '🇵🇱' },
  { code: 'nl', label: 'Dutch',      native: 'Nederlands', flag: '🇳🇱' },
  { code: 'ja', label: 'Japanese',   native: '日本語',      flag: '🇯🇵' },
  { code: 'ko', label: 'Korean',     native: '한국어',      flag: '🇰🇷' },
  { code: 'tr', label: 'Turkish',    native: 'Türkçe',     flag: '🇹🇷' },
  { code: 'uk', label: 'Ukrainian',  native: 'Українська', flag: '🇺🇦' },
  { code: 'sv', label: 'Swedish',    native: 'Svenska',    flag: '🇸🇪' },
  { code: 'ro', label: 'Romanian',   native: 'Română',     flag: '🇷🇴' },
] as const;

type LangCode = typeof LANGUAGES[number]['code'];

// ─── Quick trucker phrases ─────────────────────────────────────────────────────
const QUICK_PHRASES = [
  'Where is the dock?',
  'I have a delivery',
  'Please sign here',
  'How long is the wait?',
  'I need to unload',
  'I need to load',
  'Can I park here?',
  'Where is the scale?',
  'I need fuel',
  'Is there a truck stop nearby?',
  'What time can I deliver?',
  'I need directions',
  'The load is damaged',
  'I need a receipt',
  'What is the weight limit?',
  'I am lost',
  'Call the dispatcher',
  'Emergency — call 911',
];

// ─── Language picker ──────────────────────────────────────────────────────────
function LanguagePicker({
  visible, selected, onSelect, onClose, exclude,
}: {
  visible: boolean;
  selected: LangCode;
  onSelect: (c: LangCode) => void;
  onClose: () => void;
  exclude?: LangCode;
}) {
  const [search, setSearch] = useState('');
  const filtered = LANGUAGES.filter(l =>
    l.code !== exclude &&
    (l.label.toLowerCase().includes(search.toLowerCase()) ||
     l.native.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={pk.root} edges={['top', 'bottom']}>
        <View style={pk.header}>
          <Text style={pk.title}>Select Language</Text>
          <TouchableOpacity onPress={() => { setSearch(''); onClose(); }}>
            <Ionicons name="close" size={24} color="#1A1A2E" />
          </TouchableOpacity>
        </View>

        <View style={pk.searchWrap}>
          <Ionicons name="search-outline" size={16} color="#8E8E93" style={{ marginRight: 8 }} />
          <TextInput
            style={pk.searchInput}
            placeholder="Search language..."
            placeholderTextColor="#AEAEB2"
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={i => i.code}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, gap: 6 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[pk.row, item.code === selected && pk.rowSelected]}
              onPress={() => { setSearch(''); onSelect(item.code); onClose(); }}
              activeOpacity={0.8}
            >
              <Text style={pk.flag}>{item.flag}</Text>
              <View style={{ flex: 1 }}>
                <Text style={pk.langLabel}>{item.label}</Text>
                <Text style={pk.langNative}>{item.native}</Text>
              </View>
              {item.code === selected && <Ionicons name="checkmark-circle" size={20} color="#021B3A" />}
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const pk = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderColor: '#F0F0F0',
  },
  title:      { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    margin: 16, backgroundColor: '#F2F2F7',
    borderRadius: 12, paddingHorizontal: 12, height: 44,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#1A1A2E' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 12, gap: 12,
    backgroundColor: '#F8F8FA',
  },
  rowSelected: { backgroundColor: '#EEF3F8', borderWidth: 1.5, borderColor: '#021B3A' },
  flag:       { fontSize: 26 },
  langLabel:  { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  langNative: { fontSize: 12, color: '#8E8E93', marginTop: 1 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function TranslatorScreen() {
  const Colors = useColors();

  const [fromLang,    setFromLang]    = useState<LangCode>('en');
  const [toLang,      setToLang]      = useState<LangCode>('es');
  const [inputText,   setInputText]   = useState('');
  const [translated,  setTranslated]  = useState('');
  const [detectedLang,setDetectedLang]= useState('');
  const [loading,     setLoading]     = useState(false);
  const [speaking,    setSpeaking]    = useState(false);
  const [showFrom,    setShowFrom]    = useState(false);
  const [showTo,      setShowTo]      = useState(false);

  const inputRef = useRef<TextInput>(null);

  const fromLangObj = LANGUAGES.find(l => l.code === fromLang)!;
  const toLangObj   = LANGUAGES.find(l => l.code === toLang)!;

  const handleTranslate = useCallback(async (text?: string) => {
    const source = (text ?? inputText).trim();
    if (!source) return;
    setLoading(true);
    setTranslated('');
    setDetectedLang('');
    try {
      const res = await client.post('/translate', {
        text: source,
        fromLang,
        toLang,
      });
      setTranslated(res.data.translatedText);
      setDetectedLang(res.data.detectedSourceLang ?? '');
    } catch (err: any) {
      Alert.alert('Translation Failed', err?.response?.data?.message ?? err.message);
    } finally {
      setLoading(false);
    }
  }, [inputText, fromLang, toLang]);

  const handleSwap = () => {
    setFromLang(toLang);
    setToLang(fromLang);
    setInputText(translated);
    setTranslated(inputText);
    setDetectedLang('');
  };

  const handleCopy = (text: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied', 'Text copied to clipboard.');
  };

  const handleSpeak = async (text: string, langCode: string) => {
    if (speaking) { await Speech.stop(); setSpeaking(false); return; }
    setSpeaking(true);
    Speech.speak(text, {
      language: langCode,
      onDone: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  const handleQuickPhrase = (phrase: string) => {
    setInputText(phrase);
    handleTranslate(phrase);
  };

  const handleClear = () => {
    setInputText('');
    setTranslated('');
    setDetectedLang('');
    inputRef.current?.focus();
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: Colors.background }]} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Language pair bar ─────────────────────────────────────── */}
          <View style={[s.langBar, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            <TouchableOpacity style={s.langBtn} onPress={() => setShowFrom(true)} activeOpacity={0.8}>
              <Text style={s.langFlag}>{fromLangObj.flag}</Text>
              <View>
                <Text style={[s.langName, { color: Colors.text }]}>{fromLangObj.label}</Text>
                {detectedLang ? <Text style={[s.detectedBadge, { color: Colors.textMuted }]}>Detected</Text> : null}
              </View>
              <Ionicons name="chevron-down" size={14} color={Colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={[s.swapBtn, { backgroundColor: Colors.primary + '15' }]} onPress={handleSwap}>
              <Ionicons name="swap-horizontal" size={20} color={Colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity style={[s.langBtn, { justifyContent: 'flex-end' }]} onPress={() => setShowTo(true)} activeOpacity={0.8}>
              <Ionicons name="chevron-down" size={14} color={Colors.textMuted} />
              <Text style={[s.langName, { color: Colors.text }]}>{toLangObj.label}</Text>
              <Text style={s.langFlag}>{toLangObj.flag}</Text>
            </TouchableOpacity>
          </View>

          {/* ── Input box ─────────────────────────────────────────────── */}
          <View style={[s.card, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
            <View style={s.cardHeader}>
              <Text style={[s.cardLang, { color: Colors.textMuted }]}>{fromLangObj.label}</Text>
              <View style={s.cardActions}>
                {inputText.length > 0 && (
                  <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <TextInput
              ref={inputRef}
              style={[s.textArea, { color: Colors.text }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Enter text to translate..."
              placeholderTextColor={Colors.textMuted}
              multiline
              textAlignVertical="top"
              maxLength={5000}
            />

            <View style={s.cardFooter}>
              <Text style={[s.charCount, { color: Colors.textMuted }]}>{inputText.length}/5000</Text>
              <TouchableOpacity
                style={[s.translateBtn, { backgroundColor: Colors.primary }, (loading || !inputText.trim()) && s.translateBtnDisabled]}
                onPress={() => handleTranslate()}
                disabled={loading || !inputText.trim()}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator size="small" color="#FFFFFF" />
                  : <><Ionicons name="language-outline" size={16} color="#FFFFFF" /><Text style={s.translateBtnTxt}>Translate</Text></>
                }
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Result box ────────────────────────────────────────────── */}
          {(translated || loading) ? (
            <View style={[s.card, s.resultCard, { backgroundColor: Colors.primary + '08', borderColor: Colors.primary + '30' }]}>
              <View style={s.cardHeader}>
                <Text style={[s.cardLang, { color: Colors.primary }]}>{toLangObj.label}</Text>
                <View style={s.cardActions}>
                  {translated && (
                    <>
                      <TouchableOpacity onPress={() => handleCopy(translated)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="copy-outline" size={20} color={Colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleSpeak(translated, toLang)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name={speaking ? 'stop-circle-outline' : 'volume-high-outline'} size={22} color={Colors.primary} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>

              {loading
                ? <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
                : <Text style={[s.resultText, { color: Colors.text }]} selectable>{translated}</Text>
              }
            </View>
          ) : null}

          {/* ── Quick phrases ─────────────────────────────────────────── */}
          <View style={s.phrasesSection}>
            <View style={s.phrasesTitleRow}>
              <Ionicons name="flash-outline" size={16} color={Colors.primary} />
              <Text style={[s.phrasesTitle, { color: Colors.text }]}>Quick Trucker Phrases</Text>
            </View>
            <View style={s.phrasesGrid}>
              {QUICK_PHRASES.map(phrase => (
                <TouchableOpacity
                  key={phrase}
                  style={[s.phraseChip, { backgroundColor: Colors.surface, borderColor: Colors.border }]}
                  onPress={() => handleQuickPhrase(phrase)}
                  activeOpacity={0.75}
                >
                  <Text style={[s.phraseChipTxt, { color: Colors.text }]}>{phrase}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── DeepL attribution ─────────────────────────────────────── */}
          <View style={s.attribution}>
            <Text style={[s.attributionTxt, { color: Colors.textMuted }]}>
              Powered by DeepL — world's most accurate translator
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Language pickers */}
      <LanguagePicker
        visible={showFrom}
        selected={fromLang}
        onSelect={setFromLang}
        onClose={() => setShowFrom(false)}
        exclude={toLang}
      />
      <LanguagePicker
        visible={showTo}
        selected={toLang}
        onSelect={setToLang}
        onClose={() => setShowTo(false)}
        exclude={fromLang}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { padding: 16, gap: 14, paddingBottom: 32 },

  // Language bar
  langBar: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  langBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  langFlag: { fontSize: 22 },
  langName: { fontSize: 15, fontWeight: '700' },
  detectedBadge: { fontSize: 10, fontWeight: '600', marginTop: 1 },
  swapBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 4,
  },

  // Cards
  card: {
    borderRadius: 16, borderWidth: 1,
    padding: 14, gap: 10,
  },
  resultCard: { },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLang:   { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  cardActions:{ flexDirection: 'row', gap: 12 },

  textArea: {
    fontSize: 17, lineHeight: 24,
    minHeight: 100, maxHeight: 200,
  },
  resultText: { fontSize: 17, lineHeight: 24, minHeight: 60 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  charCount: { fontSize: 12 },

  translateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
  },
  translateBtnDisabled: { opacity: 0.45 },
  translateBtnTxt: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  // Quick phrases
  phrasesSection: { gap: 10 },
  phrasesTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  phrasesTitle:   { fontSize: 14, fontWeight: '700' },
  phrasesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  phraseChip: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
  },
  phraseChipTxt: { fontSize: 13, fontWeight: '500' },

  // Attribution
  attribution: { alignItems: 'center', paddingVertical: 8 },
  attributionTxt: { fontSize: 11 },
});
