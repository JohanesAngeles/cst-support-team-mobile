import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useColors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { getChatMessages, deleteChatMessage } from '../../api/features';
import { getSocket, disconnectSocket } from '../../utils/socketClient';
import type { Socket } from 'socket.io-client';

const CHANNELS = [
  { id: 'general',   label: 'General',   icon: 'chatbubbles-outline' },
  { id: 'northeast', label: 'Northeast', icon: 'navigate-outline' },
  { id: 'southeast', label: 'Southeast', icon: 'navigate-outline' },
  { id: 'midwest',   label: 'Midwest',   icon: 'navigate-outline' },
  { id: 'west',      label: 'West',      icon: 'navigate-outline' },
  { id: 'south',     label: 'South',     icon: 'navigate-outline' },
];

interface ChatMsg {
  _id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  message: string;
  createdAt: string;
}

const fmtTime = (d: string) =>
  new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

export default function DriverChatScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container:          { flex: 1, backgroundColor: Colors.background },
    center:             { flex: 1, justifyContent: 'center', alignItems: 'center' },
    channelBar:         { maxHeight: 48, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
    channelBarContent:  { paddingHorizontal: 12, gap: 6, alignItems: 'center', flexDirection: 'row', paddingVertical: 8 },
    channelTab:         { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.surfaceLight },
    channelTabActive:   { backgroundColor: Colors.secondary },
    channelTabText:     { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
    channelTabTextActive: { color: Colors.textDark },
    statusBar:          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 5, backgroundColor: Colors.surface },
    statusDot:          { width: 7, height: 7, borderRadius: 4 },
    statusText:         { color: Colors.textMuted, fontSize: 11 },
    messageList:        { flex: 1 },
    messageContent:     { padding: 12, paddingBottom: 8, gap: 8 },
    emptyChat:          { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 10 },
    emptyText:          { color: Colors.textMuted, fontSize: 14, textAlign: 'center' },
    bubble:             { maxWidth: '80%', borderRadius: 16, padding: 10, paddingHorizontal: 14, gap: 2 },
    bubbleMe:           { backgroundColor: Colors.secondary, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
    bubbleThem:         { backgroundColor: Colors.surface, alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.border },
    senderName:         { color: Colors.secondary, fontSize: 11, fontWeight: '700', marginBottom: 2 },
    msgText:            { color: Colors.text, fontSize: 14, lineHeight: 20 },
    msgTextMe:          { color: Colors.textDark },
    msgTime:            { color: Colors.textMuted, fontSize: 10, alignSelf: 'flex-end' },
    msgTimeMe:          { color: Colors.textDark + 'AA' },
    inputBar:           {
      flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10,
      backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
    },
    input:              {
      flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 20, borderWidth: 1,
      borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 10,
      color: Colors.text, fontSize: 14, maxHeight: 100,
    },
    sendBtn:            {
      width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.secondary,
      alignItems: 'center', justifyContent: 'center',
    },
  }), [Colors]);
  const { user } = useAuth();
  const [channel, setChannel] = useState('general');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [text, setText] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const socketRef = useRef<Socket | null>(null);
  const currentChannel = useRef(channel);

  // Keep ref in sync so socket listeners always use the latest channel
  useEffect(() => { currentChannel.current = channel; }, [channel]);

  // Load message history for the active channel (REST)
  const loadHistory = useCallback(async (ch: string) => {
    setLoading(true);
    try {
      const data = await getChatMessages(ch);
      setMessages(data.messages ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  // Connect socket and register listeners once
  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      (async () => {
        try {
          const sock = await getSocket();
          if (!mounted) return;
          socketRef.current = sock;

          setConnected(sock.connected);

          sock.on('connect', () => {
            if (!mounted) return;
            setConnected(true);
            sock.emit('join_channel', currentChannel.current);
          });

          sock.on('disconnect', () => {
            if (mounted) setConnected(false);
          });

          sock.on('new_message', (msg: ChatMsg) => {
            if (!mounted || msg.channelId !== currentChannel.current) return;
            setMessages(prev => {
              // deduplicate in case REST history already has it
              if (prev.some(m => m._id === msg._id)) return prev;
              return [...prev, msg];
            });
          });

          sock.on('message_deleted', (id: string) => {
            if (mounted) setMessages(prev => prev.filter(m => m._id !== id));
          });

          // Join current channel
          if (sock.connected) {
            sock.emit('join_channel', currentChannel.current);
          } else {
            sock.connect();
          }

          await loadHistory(currentChannel.current);
        } catch (err: any) {
          if (mounted) Alert.alert('Chat', 'Could not connect to chat server');
        }
      })();

      return () => {
        mounted = false;
        // Leave channel but keep socket alive for re-focus
        socketRef.current?.emit('leave_channel', currentChannel.current);
        socketRef.current?.off('new_message');
        socketRef.current?.off('message_deleted');
        socketRef.current?.off('connect');
        socketRef.current?.off('disconnect');
        disconnectSocket();
      };
    }, [loadHistory])
  );

  // Switch channel: re-join and reload history
  const switchChannel = useCallback(async (ch: string) => {
    if (ch === channel) return;
    socketRef.current?.emit('leave_channel', channel);
    setChannel(ch);
    setMessages([]);
    socketRef.current?.emit('join_channel', ch);
    await loadHistory(ch);
  }, [channel, loadHistory]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages]);

  const handleSend = () => {
    const msg = text.trim();
    if (!msg || sending) return;
    setText('');
    setSending(true);
    const sock = socketRef.current;
    if (!sock?.connected) {
      Alert.alert('Not connected', 'Reconnecting…');
      sock?.connect();
      setSending(false);
      return;
    }
    sock.emit('send_message', { channelId: channel, message: msg });
    setSending(false);
  };

  const handleDelete = (msg: ChatMsg) => {
    if (msg.senderId !== user?._id) return;
    Alert.alert('Delete Message', 'Remove this message?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          socketRef.current?.emit('delete_message', msg._id);
          // also call REST so DB is authoritative
          await deleteChatMessage(msg._id).catch(() => null);
        },
      },
    ]);
  };

  const isMe = (senderId: string) => senderId === user?._id;


  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Channel tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.channelBar}
        contentContainerStyle={styles.channelBarContent}
      >
        {CHANNELS.map(ch => (
          <TouchableOpacity
            key={ch.id}
            style={[styles.channelTab, channel === ch.id && styles.channelTabActive]}
            onPress={() => switchChannel(ch.id)}
          >
            <Text style={[styles.channelTabText, channel === ch.id && styles.channelTabTextActive]}>
              {ch.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Connection status dot */}
      <View style={styles.statusBar}>
        <View style={[styles.statusDot, { backgroundColor: connected ? '#2ECC71' : '#E74C3C' }]} />
        <Text style={styles.statusText}>{connected ? 'Live' : 'Connecting…'}</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.secondary} />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.messageList}
            contentContainerStyle={styles.messageContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 && (
              <View style={styles.emptyChat}>
                <Ionicons name="chatbubble-ellipses-outline" size={40} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No messages yet — start the conversation</Text>
              </View>
            )}
            {messages.map(msg => (
              <TouchableOpacity
                key={msg._id}
                style={[styles.bubble, isMe(msg.senderId) ? styles.bubbleMe : styles.bubbleThem]}
                onLongPress={() => handleDelete(msg)}
                activeOpacity={0.8}
              >
                {!isMe(msg.senderId) && (
                  <Text style={styles.senderName}>{msg.senderName}</Text>
                )}
                <Text style={[styles.msgText, isMe(msg.senderId) && styles.msgTextMe]}>
                  {msg.message}
                </Text>
                <Text style={[styles.msgTime, isMe(msg.senderId) && styles.msgTimeMe]}>
                  {fmtTime(msg.createdAt)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Message..."
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={1000}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.5 }]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            {sending
              ? <ActivityIndicator size="small" color={Colors.textDark} />
              : <Ionicons name="send" size={18} color={Colors.textDark} />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
