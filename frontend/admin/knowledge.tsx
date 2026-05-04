import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Image,
  Dimensions,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { 
  BookOpen, 
  Search, 
  ChevronRight, 
  Clock, 
  User, 
  Leaf, 
  Plus,
  X,
  Send,
  Calendar
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export default function KnowledgeScreen() {
  const router = useRouter();
  const [role, setRole] = useState('patient');
  const [isVerified, setIsVerified] = useState(false);
  const [articles, setArticles] = useState([]);
  const [myArticles, setMyArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Doctor states
  const [showArticleForm, setShowArticleForm] = useState(false);
  const [articleForm, setArticleForm] = useState({ title: '', content: '', category: 'Remedies' });

  const categories = ['All', 'Remedies', 'Plants', 'Wellness', 'Ayurveda'];

  const fetchData = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('userInfo');
      let userRole = 'patient';
      let userId = '';
      if (storedUser) {
        const user = JSON.parse(storedUser);
        userRole = user.role || 'patient';
        userId = user._id;
        setRole(userRole);
      }

      const [publicArticles, myArticlesRes, doctorsRes] = await Promise.all([
        api.get('/knowledge'),
        userRole === 'doctor' ? api.get('/knowledge/my') : Promise.resolve({ data: [] }),
        userRole === 'doctor' ? api.get('/doctors') : Promise.resolve({ data: [] })
      ]);
      
      if (userRole === 'doctor') {
        const profile = doctorsRes.data.find(d => d.user?._id === userId || d.user === userId);
        setIsVerified(profile?.isVerified || false);
      }

      setArticles(publicArticles.data);
      setMyArticles(myArticlesRes.data);
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleCreateArticle = async () => {
    if (!isVerified) {
      Alert.alert('Restricted', 'Only verified doctors can publish articles.');
      return;
    }

    if (!articleForm.title || !articleForm.content) {
      Alert.alert('Error', 'Please fill in title and content');
      return;
    }

    try {
      await api.post('/knowledge', articleForm);
      Alert.alert('Success', 'Article submitted for review!');
      setShowArticleForm(false);
      setArticleForm({ title: '', content: '', category: 'Remedies' });
      fetchData();
    } catch (error) {
      console.error('Error submitting article:', error);
      Alert.alert('Error', 'Failed to submit article');
    }
  };

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#10b981', '#059669']} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.headerTitle}>AyurLife Knowledge</Text>
              <Text style={styles.headerSubtitle}>Verified Ayurveda insights & remedies</Text>
            </View>
            {role === 'doctor' && isVerified && (
              <TouchableOpacity 
                style={styles.addBtn} 
                onPress={() => setShowArticleForm(true)}
              >
                <Plus size={20} color="#10b981" />
                <Text style={styles.addBtnText}>Write</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        <View style={styles.searchBar}>
          <Search size={20} color="#94a3b8" />
          <TextInput
            placeholder="Search articles, plants, remedies..."
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
      </LinearGradient>

      {role === 'doctor' && myArticles.length > 0 && !showArticleForm && (
        <View style={styles.myArticlesSection}>
          <Text style={styles.sectionTitle}>Your Publications</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.myArticlesScroll}>
            {myArticles.map(art => (
              <View key={art._id} style={styles.myArtCard}>
                <Text style={styles.myArtTitle} numberOfLines={1}>{art.title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: art.status === 'published' ? '#dcfce7' : '#fef3c7' }]}>
                  <Text style={[styles.statusText, { color: art.status === 'published' ? '#059669' : '#d97706' }]}>{art.status.toUpperCase()}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryBtn, selectedCategory === cat && styles.categoryBtnActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.articleList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 50 }} />
        ) : filteredArticles.length === 0 ? (
          <View style={styles.emptyState}>
            <Leaf size={60} color="#e2e8f0" />
            <Text style={styles.emptyTitle}>No articles found</Text>
            <Text style={styles.emptyDesc}>Try a different search term or category.</Text>
          </View>
        ) : (
          filteredArticles.map(article => (
            <TouchableOpacity 
              key={article._id} 
              style={styles.articleCard}
              onPress={() => router.push({
                pathname: "/modal",
                params: { 
                  title: article.title,
                  content: article.content,
                  author: article.author?.user?.name,
                  date: new Date(article.createdAt).toLocaleDateString(),
                  category: article.category
                }
              })}
            >
              <View style={styles.articleInfo}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{article.category}</Text>
                </View>
                <Text style={styles.articleTitle} numberOfLines={2}>{article.title}</Text>
                <Text style={styles.articleExcerpt} numberOfLines={2}>{article.content}</Text>
                
                <View style={styles.articleFooter}>
                  <View style={styles.authorInfo}>
                    <User size={12} color="#64748b" />
                    <Text style={styles.authorName}>Dr. {article.author?.user?.name || 'AyurLife Expert'}</Text>
                  </View>
                  <View style={styles.dateInfo}>
                    <Clock size={12} color="#64748b" />
                    <Text style={styles.dateText}>{new Date(article.createdAt).toLocaleDateString()}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.cardAction}>
                <ChevronRight size={20} color="#94a3b8" />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Write Article Modal */}
      <Modal visible={showArticleForm} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Medical Article</Text>
              <TouchableOpacity onPress={() => setShowArticleForm(false)}><X size={24} color="#64748b" /></TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Article Title</Text>
              <TextInput 
                style={styles.input} 
                placeholder="e.g. Traditional uses of Gotu Kola"
                value={articleForm.title}
                onChangeText={val => setArticleForm({...articleForm, title: val})}
              />
              
              <Text style={styles.label}>Category</Text>
              <View style={styles.catRow}>
                {['Remedies', 'Plants', 'Wellness'].map(c => (
                  <TouchableOpacity 
                    key={c} 
                    style={[styles.catBadge, articleForm.category === c && styles.activeCatBadge]}
                    onPress={() => setArticleForm({...articleForm, category: c})}
                  >
                    <Text style={[styles.catBadgeTextModal, articleForm.category === c && styles.activeCatBadgeText]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Article Content</Text>
              <TextInput 
                style={[styles.input, styles.textArea]} 
                placeholder="Write your article here..." 
                multiline
                numberOfLines={10}
                value={articleForm.content}
                onChangeText={val => setArticleForm({...articleForm, content: val})}
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleCreateArticle}>
                <LinearGradient colors={['#10b981', '#059669']} style={styles.submitGradient}>
                  <Send size={18} color="#fff" />
                  <Text style={styles.submitText}>Submit for Review</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 25, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5 },
  headerContent: { marginBottom: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  addBtn: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
  addBtnText: { color: '#10b981', fontWeight: '800', fontSize: 13 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 50,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, fontWeight: '600', color: '#1e293b' },
  
  myArticlesSection: { marginTop: 20, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: '#1e293b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  myArticlesScroll: { paddingRight: 20 },
  myArtCard: { backgroundColor: '#fff', padding: 12, borderRadius: 15, marginRight: 12, width: 180, borderWidth: 1, borderColor: '#f1f5f9' },
  myArtTitle: { fontSize: 13, fontWeight: '800', color: '#1e293b', marginBottom: 8 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  statusText: { fontSize: 9, fontWeight: '900' },

  categoryContainer: { marginTop: 15, marginBottom: 10 },
  categoryScroll: { paddingHorizontal: 20 },
  categoryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  categoryBtnActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  categoryText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  categoryTextActive: { color: '#fff' },
  
  articleList: { padding: 20 },
  articleCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  articleInfo: { flex: 1 },
  categoryBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  categoryBadgeText: { fontSize: 10, fontWeight: '800', color: '#059669', textTransform: 'uppercase' },
  articleTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 6 },
  articleExcerpt: { fontSize: 13, color: '#64748b', lineHeight: 18, marginBottom: 12 },
  articleFooter: { flexDirection: 'row', gap: 15 },
  authorInfo: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  authorName: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  dateInfo: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dateText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  cardAction: { marginLeft: 10 },
  
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginTop: 15 },
  emptyDesc: { fontSize: 14, color: '#94a3b8', marginTop: 5 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
  label: { fontSize: 14, fontWeight: '800', color: '#64748b', marginBottom: 8, marginLeft: 5 },
  input: { backgroundColor: '#f8fafc', borderRadius: 15, padding: 15, fontSize: 15, fontWeight: '600', color: '#1e293b', marginBottom: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  textArea: { height: 180, textAlignVertical: 'top' },
  catRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  catBadge: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9' },
  activeCatBadge: { backgroundColor: '#10b981', borderColor: '#10b981' },
  catBadgeTextModal: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  activeCatBadgeText: { color: '#fff' },
  submitBtn: { borderRadius: 15, overflow: 'hidden', marginTop: 10, marginBottom: 20 },
  submitGradient: { height: 55, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 10 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '900' }
});
