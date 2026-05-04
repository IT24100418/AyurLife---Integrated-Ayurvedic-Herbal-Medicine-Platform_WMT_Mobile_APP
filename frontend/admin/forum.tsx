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
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { 
  Users, 
  MessageCircle, 
  Plus, 
  Search, 
  CheckCircle2, 
  User, 
  X,
  Send,
  HelpCircle,
  Stethoscope,
  Trash2
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Answer {
  _id: string;
  content: string;
  author: { name: string; role: string };
  isProfessional: boolean;
  createdAt: string;
}

interface Question {
  _id: string;
  question: string;
  description: string;
  category: string;
  author: { name: string; role: string };
  answers: Answer[];
  createdAt: string;
}

export default function ForumScreen() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [role, setRole] = useState('patient');
  const [userInfo, setUserInfo] = useState<any>(null);
  const [showAskModal, setShowAskModal] = useState(false);
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  
  const [askForm, setAskForm] = useState({ question: '', description: '', category: 'General' });
  const [answerText, setAnswerText] = useState('');

  const fetchQuestions = async () => {
    try {
      const { data } = await api.get('/forum');
      setQuestions(data);
      
      const storedUser = await AsyncStorage.getItem('userInfo');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setUserInfo(user);
        setRole(user.role || 'patient');
      }
    } catch (error) {
      console.error('Error fetching forum:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleAsk = async () => {
    if (!askForm.question) return Alert.alert('Error', 'Please enter a question');
    try {
      await api.post('/forum', askForm);
      Alert.alert('Success', 'Question posted to community!');
      setShowAskModal(false);
      setAskForm({ question: '', description: '', category: 'General' });
      fetchQuestions();
    } catch (error) {
      Alert.alert('Error', 'Failed to post question');
    }
  };

  const handleAnswer = async () => {
    if (!answerText || !selectedQuestion) return;
    try {
      await api.post(`/forum/${selectedQuestion._id}/answer`, { content: answerText });
      Alert.alert('Success', 'Answer posted!');
      setAnswerText('');
      setShowAnswerModal(false);
      fetchQuestions();
    } catch (error) {
      Alert.alert('Error', 'Failed to post answer');
    }
  };

  const handleDeleteQuestion = (id: string) => {
    Alert.alert('Delete Question', 'Are you sure you want to remove this question?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/forum/${id}`);
            fetchQuestions();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete');
          }
        }
      }
    ]);
  };

  const handleDeleteAnswer = (qId: string, aId: string) => {
    Alert.alert('Delete Answer', 'Remove this response?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/forum/${qId}/answer/${aId}`);
            fetchQuestions();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete');
          }
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Community Forum</Text>
          <Text style={styles.headerSubtitle}>Ask questions, get expert answers</Text>
        </View>
        <TouchableOpacity style={styles.askBtn} onPress={() => setShowAskModal(true)}>
          <Plus size={20} color="#6366f1" />
          <Text style={styles.askBtnText}>Ask Question</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchQuestions(); }} tintColor="#6366f1" />}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 50 }} />
        ) : questions.length === 0 ? (
          <View style={styles.emptyState}>
            <HelpCircle size={60} color="#e2e8f0" />
            <Text style={styles.emptyTitle}>No questions yet</Text>
            <Text style={styles.emptyDesc}>Be the first to ask something!</Text>
          </View>
        ) : (
          questions.map(q => (
            <View key={q._id} style={styles.questionCard}>
              <View style={styles.qHeader}>
                <View style={styles.authorBadge}>
                  <User size={12} color="#6366f1" />
                  <Text style={styles.authorText}>{q.author?.name || 'User'}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={styles.qDate}>{new Date(q.createdAt).toLocaleDateString()}</Text>
                  {role === 'admin' && (
                    <TouchableOpacity onPress={() => handleDeleteQuestion(q._id)}>
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              
              <Text style={styles.qTitle}>{q.question}</Text>
              {q.description && <Text style={styles.qDesc}>{q.description}</Text>}
              
              <View style={styles.answersList}>
                {q.answers.length > 0 ? (
                  q.answers.slice(0, 5).map((ans, idx) => (
                    <View key={idx} style={[styles.answerItem, ans.isProfessional && styles.proAnswer]}>
                      <View style={styles.ansHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Text style={styles.ansAuthor}>{ans.author?.name || 'Expert'}</Text>
                          {ans.isProfessional && (
                            <View style={styles.proBadge}>
                              <Stethoscope size={10} color="#fff" />
                              <Text style={styles.proText}>VERIFIED PRO</Text>
                            </View>
                          )}
                        </View>
                        {role === 'admin' && (
                          <TouchableOpacity onPress={() => handleDeleteAnswer(q._id, ans._id)}>
                            <Trash2 size={12} color="#ef4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text style={styles.ansContent}>{ans.content}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noAnsText}>No answers yet. Professionals are notified!</Text>
                )}
                {q.answers.length > 5 && <Text style={styles.moreAns}>+ {q.answers.length - 5} more answers</Text>}
              </View>

              <TouchableOpacity 
                style={styles.replyBtn} 
                onPress={() => {
                  setSelectedQuestion(q);
                  setShowAnswerModal(true);
                }}
              >
                <MessageCircle size={16} color="#6366f1" />
                <Text style={styles.replyText}>Reply / Answer</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Ask Modal */}
      <Modal visible={showAskModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ask Community</Text>
              <TouchableOpacity onPress={() => setShowAskModal(false)}><X size={24} color="#64748b" /></TouchableOpacity>
            </View>
            <TextInput 
              placeholder="Your Question (e.g. How to treat mild fever?)" 
              style={styles.modalInput} 
              value={askForm.question}
              onChangeText={val => setAskForm({...askForm, question: val})}
            />

            <View style={styles.examplesContainer}>
              <Text style={styles.examplesLabel}>Try asking about:</Text>
              <View style={styles.examplesList}>
                {[
                  'How to treat mild fever?',
                  'Best diet for weight loss?',
                  'Ayurvedic skin care tips',
                  'Remedies for hair fall'
                ].map((ex, i) => (
                  <TouchableOpacity 
                    key={i} 
                    onPress={() => setAskForm({...askForm, question: ex})}
                    style={styles.exampleLink}
                  >
                    <Text style={styles.exampleLinkText}>{ex}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TextInput 
              placeholder="Details / Context..." 
              style={[styles.modalInput, { height: 100, textAlignVertical: 'top' }]} 
              multiline
              value={askForm.description}
              onChangeText={val => setAskForm({...askForm, description: val})}
            />
            <TouchableOpacity style={styles.submitBtn} onPress={handleAsk}>
              <Text style={styles.submitBtnText}>Post Question</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Answer Modal */}
      <Modal visible={showAnswerModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Your Answer</Text>
              <TouchableOpacity onPress={() => setShowAnswerModal(false)}><X size={24} color="#64748b" /></TouchableOpacity>
            </View>
            <Text style={styles.qPreview}>{selectedQuestion?.question}</Text>
            <TextInput 
              placeholder="Write your answer here..." 
              style={[styles.modalInput, { height: 150, textAlignVertical: 'top' }]} 
              multiline
              value={answerText}
              onChangeText={setAnswerText}
            />
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#10b981' }]} onPress={handleAnswer}>
              <Send size={18} color="#fff" />
              <Text style={styles.submitBtnText}>Submit Answer</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 25, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  askBtn: { backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 5 },
  askBtnText: { fontSize: 13, fontWeight: '800', color: '#6366f1' },
  list: { padding: 20 },
  questionCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 15, borderWidth: 1, borderColor: '#f1f5f9' },
  qHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  authorBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#eef2ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  authorText: { fontSize: 11, fontWeight: '700', color: '#6366f1' },
  qDate: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  qTitle: { fontSize: 17, fontWeight: '800', color: '#1e293b', marginBottom: 8 },
  qDesc: { fontSize: 14, color: '#64748b', lineHeight: 20, marginBottom: 15 },
  answersList: { gap: 10, marginBottom: 15 },
  answerItem: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, borderLeftWidth: 3, borderLeftColor: '#e2e8f0' },
  proAnswer: { backgroundColor: '#f0fdf4', borderLeftColor: '#10b981' },
  ansHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  ansAuthor: { fontSize: 12, fontWeight: '800', color: '#1e293b' },
  proBadge: { backgroundColor: '#10b981', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 3 },
  proText: { color: '#fff', fontSize: 8, fontWeight: '900' },
  ansContent: { fontSize: 13, color: '#475569', lineHeight: 18 },
  noAnsText: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' },
  moreAns: { fontSize: 11, color: '#6366f1', fontWeight: '700', textAlign: 'center' },
  replyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  replyText: { fontSize: 13, fontWeight: '800', color: '#6366f1' },
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginTop: 15 },
  emptyDesc: { fontSize: 14, color: '#94a3b8', marginTop: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
  modalInput: { backgroundColor: '#f8fafc', borderRadius: 15, padding: 15, fontSize: 15, fontWeight: '600', color: '#1e293b', marginBottom: 15, borderWidth: 1, borderColor: '#f1f5f9' },
  submitBtn: { backgroundColor: '#6366f1', height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 10 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  qPreview: { fontSize: 14, fontWeight: '800', color: '#64748b', marginBottom: 15, padding: 10, backgroundColor: '#f1f5f9', borderRadius: 10 },
  examplesContainer: { marginBottom: 20, paddingHorizontal: 5 },
  examplesLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 8 },
  examplesList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  exampleLink: { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#dbeafe' },
  exampleLinkText: { fontSize: 12, fontWeight: '700', color: '#2563eb' }
});
