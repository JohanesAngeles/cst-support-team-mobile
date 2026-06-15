import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../constants/colors';

interface Topic {
  id: string;
  category: string;
  title: string;
  preview: string;
  replies: number;
  timeAgo: string;
  authorInitial: string;
  authorColor: string;
}

const TOPICS: Topic[] = [
  {
    id: '1',
    category: 'Rates & Negotiation',
    title: 'Best counter-offer strategy for Chicago → Dallas lanes right now?',
    preview: 'Broker offered me $2.10/mi yesterday. Market feels soft but I held at $2.60 and…',
    replies: 14,
    timeAgo: '2h ago',
    authorInitial: 'M',
    authorColor: '#3498DB',
  },
  {
    id: '2',
    category: 'HOS & Compliance',
    title: 'Split sleeper berth rule — anyone else getting tripped up at weigh stations?',
    preview: 'Had an inspector in TX who didn\'t seem to understand the split rule correctly. Here\'s what…',
    replies: 27,
    timeAgo: '5h ago',
    authorInitial: 'T',
    authorColor: '#2ECC71',
  },
  {
    id: '3',
    category: 'Broker Talk',
    title: 'Broker added a 10-day payment clause on a spot load — red flag?',
    preview: 'Usually quick pay but this one snuck in extended terms. Here\'s what I found in the…',
    replies: 9,
    timeAgo: '1d ago',
    authorInitial: 'D',
    authorColor: '#E67E22',
  },
  {
    id: '4',
    category: 'O/O Business',
    title: 'Setting up an LLC vs S-Corp for trucking — real cost difference at $200k revenue',
    preview: 'Ran the numbers with my accountant last quarter. S-Corp saved me $11k in self-employment tax…',
    replies: 41,
    timeAgo: '2d ago',
    authorInitial: 'R',
    authorColor: '#9B59B6',
  },
  {
    id: '5',
    category: 'Road Tips',
    title: 'Hidden gem truck stops on I-70 west of Denver — full list',
    preview: 'The Loves at Limon is always packed. Here are 3 alternatives with better food and…',
    replies: 18,
    timeAgo: '3d ago',
    authorInitial: 'J',
    authorColor: '#1ABC9C',
  },
];

const CATEGORIES = [
  { label: 'Rates & Negotiation', icon: 'cash-outline', color: '#2ECC71' },
  { label: 'HOS & Compliance',    icon: 'time-outline',  color: '#3498DB' },
  { label: 'Broker Talk',         icon: 'briefcase-outline', color: '#E67E22' },
  { label: 'O/O Business',        icon: 'trending-up-outline', color: '#9B59B6' },
  { label: 'Road Tips',           icon: 'map-outline',   color: '#1ABC9C' },
  { label: 'Jobs & Loads',        icon: 'cube-outline',  color: '#E74C3C' },
];

export default function TRACCommunityScreen() {
  const Colors = useColors();
  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: 16, paddingBottom: 40, gap: 16 },
    earlyBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: Colors.secondary + '18', borderRadius: 14,
      borderWidth: 1, borderColor: Colors.secondary + '44', padding: 14,
    },
    earlyIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.secondary + '22', justifyContent: 'center', alignItems: 'center' },
    earlyTitle: { color: Colors.text, fontSize: 15, fontWeight: '800' },
    earlySub: { color: Colors.textMuted, fontSize: 12, marginTop: 2, lineHeight: 17 },
    joinBtn: {
      backgroundColor: Colors.secondary, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10, marginTop: 8, alignSelf: 'flex-start',
    },
    joinBtnText: { color: Colors.textDark, fontWeight: '800', fontSize: 13 },
    sectionTitle: { color: Colors.text, fontSize: 14, fontWeight: '800' },
    catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    catChip: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
    catText: { fontSize: 12, fontWeight: '700' },
    topicCard: {
      backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
      borderWidth: 1, borderColor: Colors.border, gap: 8,
    },
    topicCat: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
    topicTitle: { color: Colors.text, fontSize: 14, fontWeight: '700', lineHeight: 20 },
    topicPreview: { color: Colors.textMuted, fontSize: 12, lineHeight: 18 },
    topicMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    topicAuthor: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    authorAvatar: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
    authorInitial: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
    topicReplies: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    repliesText: { color: Colors.textMuted, fontSize: 12 },
    lockedOverlay: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      borderRadius: 14, backgroundColor: Colors.background + 'CC',
      justifyContent: 'center', alignItems: 'center', gap: 4,
    },
    lockedText: { color: Colors.textMuted, fontSize: 12, fontWeight: '700' },
  }), [Colors]);

  const comingSoon = () =>
    Alert.alert('TRAC Community', 'TRAC Community is coming soon. Join the waitlist to get early access and help shape the community.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Join Waitlist',
        onPress: () => Linking.openURL('mailto:caschooloftruckingofficial@gmail.com?subject=TRAC%20Community%20Waitlist&body=I%20would%20like%20to%20join%20the%20TRAC%20Community%20waitlist.'),
      },
    ]);

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Early access banner */}
        <View style={s.earlyBanner}>
          <View style={s.earlyIcon}>
            <Ionicons name="globe-outline" size={22} color={Colors.secondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.earlyTitle}>TRAC Community — Early Access</Text>
            <Text style={s.earlySub}>Driver-to-driver knowledge network. Share tips, discuss rates, and connect with truckers across the country.</Text>
            <TouchableOpacity style={s.joinBtn} onPress={comingSoon}>
              <Text style={s.joinBtnText}>Join Waitlist</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Categories */}
        <Text style={s.sectionTitle}>Discussion Categories</Text>
        <View style={s.catRow}>
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c.label}
              style={[s.catChip, { backgroundColor: c.color + '18', borderColor: c.color + '44' }]}
              onPress={comingSoon}
            >
              <Ionicons name={c.icon as any} size={14} color={c.color} />
              <Text style={[s.catText, { color: c.color }]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Preview discussions */}
        <Text style={s.sectionTitle}>Recent Discussions (Preview)</Text>
        {TOPICS.map((topic, i) => (
          <TouchableOpacity key={topic.id} style={s.topicCard} onPress={comingSoon} activeOpacity={0.8}>
            <Text style={[s.topicCat, { color: CATEGORIES.find(c => c.label === topic.category)?.color ?? Colors.secondary }]}>
              {topic.category}
            </Text>
            <Text style={s.topicTitle}>{topic.title}</Text>
            <Text style={s.topicPreview} numberOfLines={2}>{topic.preview}</Text>
            <View style={s.topicMeta}>
              <View style={s.topicAuthor}>
                <View style={[s.authorAvatar, { backgroundColor: topic.authorColor }]}>
                  <Text style={s.authorInitial}>{topic.authorInitial}</Text>
                </View>
                <Text style={{ color: Colors.textMuted, fontSize: 12 }}>{topic.timeAgo}</Text>
              </View>
              <View style={s.topicReplies}>
                <Ionicons name="chatbubble-outline" size={14} color={Colors.textMuted} />
                <Text style={s.repliesText}>{topic.replies}</Text>
              </View>
            </View>
            {i > 1 && (
              <View style={s.lockedOverlay}>
                <Ionicons name="lock-closed" size={18} color={Colors.textMuted} />
                <Text style={s.lockedText}>Join to read full discussion</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}
