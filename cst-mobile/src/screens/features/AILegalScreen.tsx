import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useColors } from '../../constants/colors';
import client from '../../api/client';
import { useAnalytics, EVENTS } from '../../utils/analytics';
import { MainStackParamList } from '../../navigation/MainStack';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_QUESTIONS = [
  'What are my rights if I get a ticket?',
  'How do I dispute a broker non-payment?',
  'What is coercion under FMCSA rules?',
  'How long can I drive per HOS rules?',
  'What do I need for a cargo claim?',
];

type Nav = NativeStackNavigationProp<MainStackParamList>;

export default function AILegalScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    banner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, paddingHorizontal: 16, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
    bannerText: { color: Colors.textMuted, fontSize: 12 },
    messageList: { padding: 16, gap: 12, paddingBottom: 8 },
    bubble: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4 },
    userBubble: { justifyContent: 'flex-end' },
    assistantBubble: { justifyContent: 'flex-start', gap: 8 },
    avatarIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.secondary, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
    bubbleContent: { maxWidth: '80%', borderRadius: 16, padding: 12 },
    userContent: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
    assistantContent: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderBottomLeftRadius: 4 },
    bubbleText: { color: Colors.text, fontSize: 14, lineHeight: 20 },
    userText: { color: Colors.text },
    quickWrap: { paddingVertical: 10 },
    quickTitle: { color: Colors.textMuted, fontSize: 12, fontWeight: '600', paddingHorizontal: 16, marginBottom: 8 },
    chip: { backgroundColor: Colors.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: Colors.border },
    chipText: { color: Colors.text, fontSize: 13 },
    typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 6 },
    typingText: { color: Colors.textMuted, fontSize: 13 },
    inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, paddingHorizontal: 16, gap: 10, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
    input: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: Colors.text, fontSize: 14, maxHeight: 100, borderWidth: 1, borderColor: Colors.border },
    sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.secondary, justifyContent: 'center', alignItems: 'center' },
    sendBtnDisabled: { backgroundColor: Colors.border },
    premiumGate: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
    premiumIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.secondary + '1A', borderWidth: 2, borderColor: Colors.secondary + '44', justifyContent: 'center', alignItems: 'center' },
    premiumTitle: { color: Colors.text, fontSize: 22, fontWeight: '900', textAlign: 'center' },
    premiumSub: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22 },
    upgradeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.secondary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28, marginTop: 8 },
    upgradeBtnText: { color: Colors.textDark, fontSize: 16, fontWeight: '800' },
    premiumNote: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 4 },
  }), [Colors]);
  const { track } = useAnalytics();
  const navigation = useNavigation<Nav>();
  const [premiumRequired, setPremiumRequired] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: 'Hello! I\'m your AI Legal Assistant, specialized in trucking law, FMCSA regulations, and driver rights. Ask me anything — tickets, broker disputes, HOS rules, cargo claims, and more.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  const sendMessage = async (text: string) => {
    const userText = text.trim();
    if (!userText || loading) return;

    track(EVENTS.AI_QUERY_SENT, { queryLength: userText.length });
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: userText };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    const history = updatedMessages
      .filter((m) => m.id !== '0')
      .slice(0, -1)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await client.post('/ai/legal', { message: userText, history });
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.data.reply,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      if (err?.status === 403 || err?.code === 'PREMIUM_REQUIRED') {
        setPremiumRequired(true);
      } else {
        const errContent = err?.status === 503
          ? 'The AI service is temporarily unavailable. Please try again in a few minutes.'
          : 'Connection error. Please check your internet and try again.';
        setMessages((prev) => [
          ...prev,
          { id: (Date.now() + 1).toString(), role: 'assistant', content: errContent },
        ]);
      }
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        {!isUser && (
          <View style={styles.avatarIcon}>
            <Ionicons name="shield-checkmark" size={14} color={Colors.secondary} />
          </View>
        )}
        <View style={[styles.bubbleContent, isUser ? styles.userContent : styles.assistantContent]}>
          <Text style={[styles.bubbleText, isUser && styles.userText]}>{item.content}</Text>
        </View>
      </View>
    );
  };

  if (premiumRequired) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.premiumGate}>
          <View style={styles.premiumIcon}>
            <Ionicons name="star" size={36} color={Colors.secondary} />
          </View>
          <Text style={styles.premiumTitle}>Road Ready Pro Required</Text>
          <Text style={styles.premiumSub}>
            The AI Legal Assistant is included in your Road Ready Pro subscription. Upgrade to get unlimited access to trucking law guidance, FMCSA regulations, and driver rights advice.
          </Text>
          <TouchableOpacity
            style={styles.upgradeBtn}
            onPress={() => navigation.navigate('Subscription')}
          >
            <Ionicons name="arrow-up-circle-outline" size={18} color={Colors.textDark} />
            <Text style={styles.upgradeBtnText}>View Plans</Text>
          </TouchableOpacity>
          <Text style={styles.premiumNote}>
            Already subscribed? Make sure your payment is active in the Subscription screen.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.banner}>
        <Ionicons name="shield-checkmark" size={18} color={Colors.secondary} />
        <Text style={styles.bannerText}>AI Legal Assistant · Not a substitute for legal counsel</Text>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Quick questions shown until first user message */}
      {messages.length === 1 && (
        <View style={styles.quickWrap}>
          <Text style={styles.quickTitle}>Common Questions</Text>
          <ScrollHorizontalChips items={QUICK_QUESTIONS} onPress={sendMessage} />
        </View>
      )}

      {loading && (
        <View style={styles.typingRow}>
          <ActivityIndicator size="small" color={Colors.secondary} />
          <Text style={styles.typingText}>Thinking...</Text>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask a legal question..."
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || loading}
          >
            <Ionicons name="send" size={18} color={Colors.textDark} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ScrollHorizontalChips({ items, onPress }: { items: string[]; onPress: (s: string) => void }) {
  const Colors = useColors();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 16 }}>
      {items.map((q) => (
        <TouchableOpacity
          key={q}
          style={{ backgroundColor: Colors.secondary + '18', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, borderWidth: 1, borderColor: Colors.secondary + '44' }}
          onPress={() => onPress(q)}
        >
          <Text style={{ color: Colors.secondary, fontSize: 12, fontWeight: '600' }}>{q}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
