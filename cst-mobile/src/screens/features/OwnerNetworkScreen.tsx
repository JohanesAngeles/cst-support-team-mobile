import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useColors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { getNetworkPosts, addNetworkPost, upvoteNetworkPost, replyNetworkPost, deleteNetworkPost, getNetworkPost } from '../../api/features';

const CATEGORIES = ['advice', 'load-opportunity', 'route-tip', 'question', 'vent'] as const;
const CAT_LABELS: Record<string, string> = {
  advice: 'Advice', 'load-opportunity': 'Load Opportunity', 'route-tip': 'Route Tip', question: 'Question', vent: 'Vent',
};
const CAT_ICONS: Record<string, string> = {
  advice: 'bulb-outline', 'load-opportunity': 'cube-outline', 'route-tip': 'navigate-outline', question: 'help-circle-outline', vent: 'megaphone-outline',
};
const CAT_COLORS: Record<string, string> = {
  advice: '#2ECC71', 'load-opportunity': '#F39C12', 'route-tip': '#3498DB', question: '#9B59B6', vent: '#E74C3C',
};

interface Post {
  _id: string; authorId: string; authorName: string; category: string; title: string; body: string;
  upvotes: string[]; replies: { authorName: string; body: string; createdAt: string }[]; createdAt: string;
}

const fmtAgo = (d: string) => {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export default function OwnerNetworkScreen() {
  const Colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    filterBar: { maxHeight: 52, borderBottomWidth: 1, borderBottomColor: Colors.border },
    filterContent: { paddingHorizontal: 12, gap: 6, alignItems: 'center', paddingVertical: 10 },
    filterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.border },
    filterChipActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
    filterText: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
    filterTextActive: { color: Colors.textDark },
    content: { padding: 16, paddingBottom: 40, gap: 12 },
    addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.secondary, borderRadius: 12, paddingVertical: 13 },
    addBtnText: { color: Colors.textDark, fontWeight: '800', fontSize: 15 },
    emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 10 },
    emptyText: { color: Colors.textMuted, fontSize: 14, textAlign: 'center' },
    postCard: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14, gap: 6 },
    postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    catBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    catText: { fontSize: 11, fontWeight: '700' },
    postAgo: { color: Colors.textMuted, fontSize: 11 },
    postTitle: { color: Colors.text, fontWeight: '800', fontSize: 14 },
    postBody: { color: Colors.textMuted, fontSize: 13, lineHeight: 18 },
    postFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    postAuthor: { color: Colors.textMuted, fontSize: 11 },
    postMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    postMetaText: { color: Colors.textMuted, fontSize: 12 },
    detailBody: { color: Colors.text, fontSize: 14, lineHeight: 21, marginBottom: 10 },
    detailFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
    upvoteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.secondary + '22', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
    upvoteCount: { color: Colors.secondary, fontSize: 13, fontWeight: '700' },
    repliesTitle: { color: Colors.text, fontSize: 13, fontWeight: '800', marginBottom: 8 },
    replyCard: { backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 10, marginBottom: 8 },
    replyAuthor: { color: Colors.secondary, fontSize: 11, fontWeight: '700', marginBottom: 3 },
    replyBody: { color: Colors.text, fontSize: 13 },
    replyBar: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8 },
    replyInput: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 10, color: Colors.text, fontSize: 13 },
    replyBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.secondary, alignItems: 'center', justifyContent: 'center' },
    modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
    modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '800', flex: 1 },
    modalLabel: { color: Colors.textMuted, fontSize: 12, marginTop: 10, marginBottom: 4 },
    modalInput: { backgroundColor: Colors.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 11, color: Colors.text, fontSize: 14 },
    chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.border },
    chipText: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
    modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
    cancelBtn: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 10, padding: 14, alignItems: 'center' },
    cancelText: { color: Colors.textMuted, fontWeight: '700' },
    saveBtn: { flex: 1, backgroundColor: Colors.secondary, borderRadius: 10, padding: 14, alignItems: 'center' },
    saveText: { color: Colors.textDark, fontWeight: '800' },
  }), [Colors]);
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [catFilter, setCatFilter] = useState('');
  const [newModal, setNewModal] = useState(false);
  const [detailPost, setDetailPost] = useState<Post | null>(null);
  const [saving, setSaving] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<typeof CATEGORIES[number]>('advice');

  const load = useCallback(async (cat = catFilter) => {
    try {
      const data = await getNetworkPosts(cat || undefined);
      setPosts(data.posts ?? []);
    } catch {
      Alert.alert('Error', 'Could not load posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [catFilter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleNew = async () => {
    if (!title.trim() || !body.trim()) { Alert.alert('Error', 'Title and body are required'); return; }
    setSaving(true);
    try {
      await addNetworkPost({ category, title: title.trim(), body: body.trim() });
      setTitle(''); setBody(''); setCategory('advice');
      setNewModal(false);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpvote = async (id: string) => {
    try {
      await upvoteNetworkPost(id);
      load();
      if (detailPost?._id === id) {
        const fresh = await getNetworkPost(id);
        setDetailPost(fresh.post);
      }
    } catch { Alert.alert('Error', 'Could not upvote'); }
  };

  const handleReply = async () => {
    if (!detailPost || !replyText.trim()) return;
    setReplying(true);
    try {
      const data = await replyNetworkPost(detailPost._id, replyText.trim());
      setDetailPost(data.post);
      setReplyText('');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setReplying(false);
    }
  };

  const handleDelete = (post: Post) => {
    if (post.authorId !== user?._id) return;
    Alert.alert('Delete Post', 'Remove your post?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteNetworkPost(post._id); load(); } },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.secondary} /></View>;


  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
        <TouchableOpacity style={[styles.filterChip, !catFilter && styles.filterChipActive]} onPress={() => { setCatFilter(''); load(''); }}>
          <Text style={[styles.filterText, !catFilter && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        {CATEGORIES.map(c => (
          <TouchableOpacity key={c} style={[styles.filterChip, catFilter === c && { backgroundColor: CAT_COLORS[c], borderColor: CAT_COLORS[c] }]} onPress={() => { setCatFilter(c); load(c); }}>
            <Ionicons name={CAT_ICONS[c] as any} size={13} color={catFilter === c ? Colors.white : Colors.textMuted} />
            <Text style={[styles.filterText, catFilter === c && { color: Colors.text }]}>{CAT_LABELS[c]}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.secondary} />}
      >
        <TouchableOpacity style={styles.addBtn} onPress={() => setNewModal(true)}>
          <Ionicons name="add-circle-outline" size={18} color={Colors.textDark} />
          <Text style={styles.addBtnText}>New Post</Text>
        </TouchableOpacity>

        {posts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No posts yet — share something with the community</Text>
          </View>
        ) : (
          posts.map(p => (
            <TouchableOpacity key={p._id} style={styles.postCard} onPress={() => setDetailPost(p)} onLongPress={() => handleDelete(p)}>
              <View style={styles.postHeader}>
                <View style={[styles.catBadge, { backgroundColor: CAT_COLORS[p.category] + '22' }]}>
                  <Ionicons name={CAT_ICONS[p.category] as any} size={11} color={CAT_COLORS[p.category]} />
                  <Text style={[styles.catText, { color: CAT_COLORS[p.category] }]}>{CAT_LABELS[p.category]}</Text>
                </View>
                <Text style={styles.postAgo}>{fmtAgo(p.createdAt)}</Text>
              </View>
              <Text style={styles.postTitle}>{p.title}</Text>
              <Text style={styles.postBody} numberOfLines={2}>{p.body}</Text>
              <View style={styles.postFooter}>
                <Text style={styles.postAuthor}>{p.authorName}</Text>
                <View style={styles.postMeta}>
                  <Ionicons name="chatbubble-outline" size={13} color={Colors.textMuted} />
                  <Text style={styles.postMetaText}>{p.replies.length}</Text>
                  <Ionicons name="thumbs-up-outline" size={13} color={Colors.textMuted} />
                  <Text style={styles.postMetaText}>{p.upvotes.length}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* New Post Modal */}
      <Modal visible={newModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Post</Text>
              <TouchableOpacity onPress={() => setNewModal(false)}><Ionicons name="close" size={24} color={Colors.textMuted} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              <Text style={styles.modalLabel}>Category</Text>
              <View style={styles.chipGroup}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity key={c} style={[styles.chip, category === c && { backgroundColor: CAT_COLORS[c], borderColor: CAT_COLORS[c] }]} onPress={() => setCategory(c)}>
                    <Text style={[styles.chipText, category === c && { color: Colors.text }]}>{CAT_LABELS[c]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.modalLabel}>Title *</Text>
              <TextInput style={styles.modalInput} value={title} onChangeText={setTitle} placeholder="Short headline..." placeholderTextColor={Colors.textMuted} maxLength={120} />
              <Text style={styles.modalLabel}>Post *</Text>
              <TextInput style={[styles.modalInput, { height: 100 }]} value={body} onChangeText={setBody} multiline placeholder="Share details, tips, or your story..." placeholderTextColor={Colors.textMuted} />
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setNewModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleNew} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color={Colors.textDark} /> : <Text style={styles.saveText}>Post</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={!!detailPost} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { paddingBottom: 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>{detailPost?.title}</Text>
              <TouchableOpacity onPress={() => setDetailPost(null)}><Ionicons name="close" size={24} color={Colors.textMuted} /></TouchableOpacity>
            </View>
            {detailPost && (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
                <Text style={styles.detailBody}>{detailPost.body}</Text>
                <View style={styles.detailFooter}>
                  <Text style={styles.postAuthor}>{detailPost.authorName} · {fmtAgo(detailPost.createdAt)}</Text>
                  <TouchableOpacity style={styles.upvoteBtn} onPress={() => handleUpvote(detailPost._id)}>
                    <Ionicons name={detailPost.upvotes.includes(user?._id ?? '') ? 'thumbs-up' : 'thumbs-up-outline'} size={15} color={Colors.secondary} />
                    <Text style={styles.upvoteCount}>{detailPost.upvotes.length}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.repliesTitle}>Replies ({detailPost.replies.length})</Text>
                {detailPost.replies.map((r, i) => (
                  <View key={i} style={styles.replyCard}>
                    <Text style={styles.replyAuthor}>{r.authorName}</Text>
                    <Text style={styles.replyBody}>{r.body}</Text>
                  </View>
                ))}
                <View style={styles.replyBar}>
                  <TextInput style={styles.replyInput} value={replyText} onChangeText={setReplyText} placeholder="Write a reply..." placeholderTextColor={Colors.textMuted} />
                  <TouchableOpacity style={styles.replyBtn} onPress={handleReply} disabled={replying || !replyText.trim()}>
                    {replying ? <ActivityIndicator size="small" color={Colors.textDark} /> : <Ionicons name="send" size={16} color={Colors.textDark} />}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
