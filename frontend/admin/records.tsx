import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Image
} from 'react-native';
import Config from '../../constants/Config';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ClipboardList, 
  ShoppingBag, 
  ChevronRight, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  FileText,
  Box,
  User as UserIcon,
  Activity,
  Zap,
  Wind,
  Droplets,
  Flame,
  Info
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import api from '../../services/api';

const { width } = Dimensions.get('window');

export default function RecordsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('prescriptions'); // 'prescriptions', 'orders', or 'profile'
  const [prescriptions, setPrescriptions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [patientProfile, setPatientProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingPrakruthi, setUpdatingPrakruthi] = useState(false);

  const prakruthiOptions = ['Vata', 'Pitta', 'Kapha', 'Vata-Pitta', 'Pitta-Kapha', 'Vata-Kapha', 'Tridosha'];

  const fetchData = async () => {
    try {
      const [scripts, ords, profile] = await Promise.all([
        api.get('/prescriptions/my').catch(() => ({ data: [] })),
        api.get('/orders/my').catch(() => ({ data: [] })),
        api.get('/patients/me').catch(() => ({ data: null }))
      ]);
      setPrescriptions(scripts.data || []);
      setOrders(ords.data || []);
      setPatientProfile(profile.data);
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updatePrakruthi = async (val) => {
    setUpdatingPrakruthi(true);
    try {
      const { data } = await api.post('/patients', { prakruthi: val });
      setPatientProfile(data);
    } catch (error) {
      console.error('Error updating prakruthi:', error);
    } finally {
      setUpdatingPrakruthi(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const PrescriptionCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.recordCard} 
      activeOpacity={0.8}
      onPress={() => router.push(`/prescription/view/${item._id}`)}
    >
      <LinearGradient colors={['#ecfdf5', '#f0fdf4']} style={styles.iconBox}>
        <FileText size={22} color="#10b981" />
      </LinearGradient>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Dr. {item.doctor?.name || 'Ayurvedic Doctor'}</Text>
          <Text style={styles.cardDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
        <Text style={styles.cardSubtitle}>{item.medicines?.length || 0} Medicines Prescribed</Text>
        <View style={styles.medicinesList}>
          {item.medicines?.slice(0, 2).map((med, idx) => (
            <View key={idx} style={styles.medicineTag}>
              <Text style={styles.medicineTagText}>{med.name}</Text>
            </View>
          ))}
          {item.medicines?.length > 2 && (
            <Text style={styles.moreText}>+{item.medicines.length - 2} more</Text>
          )}
        </View>
      </View>
      <View style={styles.arrowBox}>
        <ChevronRight size={18} color="#10b981" />
      </View>
    </TouchableOpacity>
  );

  const OrderCard = ({ item }) => {
    const statusColors = {
      pending: '#fffbeb',
      completed: '#ecfdf5',
      shipped: '#f0f9ff',
      cancelled: '#fef2f2'
    };
    const statusTextColors = {
      pending: '#d97706',
      completed: '#059669',
      shipped: '#0284c7',
      cancelled: '#ef4444'
    };

    const orderImage = item.items && item.items[0]?.image 
        ? (item.items[0].image.startsWith('/uploads') ? `${Config.BASE_URL.replace('/api', '')}${item.items[0].image}` : item.items[0].image)
        : null;

    return (
      <TouchableOpacity 
        style={styles.orderRecordCard} 
        activeOpacity={0.8}
        onPress={() => router.push(`/orders/${item._id}`)}
      >
        <View style={styles.orderImageContainer}>
          {orderImage ? (
            <Image source={{ uri: orderImage }} style={styles.orderImage} />
          ) : (
            <Box size={24} color="#64748b" />
          )}
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Order #{item._id?.slice(-6).toUpperCase()}</Text>
            <Text style={styles.cardPrice}>LKR {item.totalAmount}</Text>
          </View>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {item.items?.length || 0} items from {item.supplier?.name || 'AyurLife Store'}
          </Text>
          <View style={styles.cardFooter}>
            <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] || '#f1f5f9' }]}>
                <View style={[styles.statusDot, { backgroundColor: statusTextColors[item.status] || '#64748b' }]} />
                <Text style={[styles.statusText, { color: statusTextColors[item.status] || '#64748b' }]}>
                {item.status.toUpperCase()}
                </Text>
            </View>
            <Text style={styles.orderDate}>{new Date(item.createdAt || Date.now()).toLocaleDateString()}</Text>
          </View>
        </View>
        <ChevronRight size={18} color="#cbd5e1" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Medical Records</Text>
        <Text style={styles.headerSubtitle}>History of your care & orders</Text>
      </View>

      {/* Modern Tabs */}
      <View style={styles.tabWrapper}>
        <View style={styles.tabContainer}>
          {['prescriptions', 'orders', 'profile'].map((tab) => (
            <TouchableOpacity 
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              {tab === 'prescriptions' && <ClipboardList size={16} color={activeTab === tab ? '#fff' : '#64748b'} />}
              {tab === 'orders' && <ShoppingBag size={16} color={activeTab === tab ? '#fff' : '#64748b'} />}
              {tab === 'profile' && <UserIcon size={16} color={activeTab === tab ? '#fff' : '#64748b'} />}
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 50 }} />
        ) : (
          <View>
            {activeTab === 'prescriptions' ? (
              prescriptions.length > 0 ? (
                prescriptions.map(item => <PrescriptionCard key={item._id} item={item} />)
              ) : (
                <View style={styles.emptyContainer}>
                  <ClipboardList size={64} color="#e2e8f0" />
                  <Text style={styles.emptyText}>No prescriptions found yet.</Text>
                </View>
              )
            ) : activeTab === 'orders' ? (
              orders.length > 0 ? (
                orders.map(item => <OrderCard key={item._id} item={item} />)
              ) : (
                <View style={styles.emptyContainer}>
                  <ShoppingBag size={64} color="#e2e8f0" />
                  <Text style={styles.emptyText}>No order history available.</Text>
                </View>
              )
            ) : (
                /* Health Profile Tab */
                <View style={styles.profileSection}>
                    <View style={styles.sectionHeader}>
                        <Activity size={20} color="#10b981" />
                        <Text style={styles.sectionTitle}>Digital Health Profile</Text>
                    </View>
                    
                    <View style={styles.prakruthiCard}>
                        <View style={styles.prakruthiBadgeRow}>
                            <View style={styles.pBadge}>
                                <Activity size={12} color="#10b981" />
                                <Text style={styles.pBadgeText}>PRIMARY PRAKRUTHI</Text>
                            </View>
                        </View>
                        
                        <View style={styles.doshaDisplay}>
                            <View style={styles.doshaValueContainer}>
                                {patientProfile?.prakruthi?.includes('Vata') && <Wind size={24} color="#3b82f6" style={{ marginRight: 10 }} />}
                                {patientProfile?.prakruthi?.includes('Pitta') && <Flame size={24} color="#ef4444" style={{ marginRight: 10 }} />}
                                {patientProfile?.prakruthi?.includes('Kapha') && <Droplets size={24} color="#10b981" style={{ marginRight: 10 }} />}
                                <Text style={styles.doshaValue}>{patientProfile?.prakruthi || 'Analysis Pending'}</Text>
                            </View>
                        </View>
                        
                        <View style={styles.optionsGrid}>
                            {prakruthiOptions.map(opt => (
                                <TouchableOpacity 
                                    key={opt} 
                                    style={[styles.optionChip, patientProfile?.prakruthi === opt && styles.activeOption]}
                                    onPress={() => updatePrakruthi(opt)}
                                    disabled={updatingPrakruthi}
                                >
                                    <Text style={[styles.optionText, patientProfile?.prakruthi === opt && styles.activeOptionText]}>
                                        {opt}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.sectionHeader}>
                        <Calendar size={20} color="#10b981" />
                        <Text style={styles.sectionTitle}>Medical History</Text>
                    </View>

                    <View style={styles.timelineContainer}>
                        {patientProfile?.history?.length > 0 ? (
                            patientProfile.history.map((h, i) => (
                                <View key={i} style={styles.timelineItem}>
                                    <View style={styles.timelinePoint}>
                                        <View style={styles.pointDot} />
                                        {i !== patientProfile.history.length - 1 && <View style={styles.pointLine} />}
                                    </View>
                                    <View style={styles.timelineContent}>
                                        <Text style={styles.hTitle}>{h.treatment}</Text>
                                        <View style={styles.hMeta}>
                                            <Text style={styles.hDoc}>Dr. {h.doctor}</Text>
                                            <Text style={styles.hDate}>{new Date(h.date).toLocaleDateString()}</Text>
                                        </View>
                                        {h.notes && (
                                            <View style={styles.hNotesCard}>
                                                <Text style={styles.hNotes}>{h.notes}</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            ))
                        ) : (
                            <View style={styles.emptyHistory}>
                                <Text style={styles.emptyText}>No treatment history recorded yet.</Text>
                            </View>
                        )}
                    </View>
                </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom Tip */}
      <View style={styles.tipBox}>
        <AlertCircle size={16} color="#0369a1" />
        <Text style={styles.tipText}>
          Tap on a record to see detailed information or download as PDF.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 25,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
  },
  activeTabText: { color: '#fff' },
  tabWrapper: { paddingHorizontal: 25, marginBottom: 25 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 24, padding: 6, borderWidth: 1, borderColor: '#f1f5f9' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 20, gap: 8 },
  activeTab: { backgroundColor: '#10b981', elevation: 8, shadowColor: '#10b981', shadowOpacity: 0.3, shadowRadius: 15, shadowOffset: { width: 0, height: 6 } },
  tabText: { fontSize: 10, fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 },
  listContainer: { paddingHorizontal: 20, paddingBottom: 120 },
  recordCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 18, borderRadius: 28, marginBottom: 15, borderWidth: 1, borderColor: '#f1f5f9', elevation: 3, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 15, shadowOffset: { width: 0, height: 4 } },
  iconBox: { width: 50, height: 50, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  cardContent: { flex: 1, marginLeft: 15 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1f2937' },
  cardDate: { fontSize: 10, fontWeight: '700', color: '#94a3b8' },
  cardSubtitle: { fontSize: 13, color: '#64748b', fontWeight: '600', marginBottom: 10 },
  medicinesList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  medicineTag: { backgroundColor: '#f0fdf4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#dcfce7' },
  medicineTagText: { fontSize: 10, fontWeight: '800', color: '#10b981' },
  moreText: { fontSize: 10, fontWeight: '800', color: '#94a3b8' },
  arrowBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center' },
  orderRecordCard: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#fff', borderRadius: 28, marginBottom: 15, borderWidth: 1, borderColor: '#f1f5f9', elevation: 3, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 15 },
  orderImageContainer: { width: 70, height: 70, borderRadius: 20, backgroundColor: '#f8fafc', overflow: 'hidden' },
  orderImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  cardPrice: { fontSize: 14, fontWeight: '900', color: '#10b981' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '900' },
  orderDate: { fontSize: 11, fontWeight: '700', color: '#cbd5e1' },
  profileSection: { paddingBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18, marginTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1f2937' },
  prakruthiCard: { backgroundColor: '#fff', borderRadius: 30, padding: 25, marginBottom: 25, borderWidth: 1, borderColor: '#f1f5f9', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15 },
  prakruthiBadgeRow: { marginBottom: 15 },
  pBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0fdf4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, alignSelf: 'flex-start' },
  pBadgeText: { fontSize: 9, fontWeight: '900', color: '#10b981', letterSpacing: 0.5 },
  doshaDisplay: { marginBottom: 25 },
  doshaValueContainer: { flexDirection: 'row', alignItems: 'center' },
  doshaValue: { fontSize: 26, fontWeight: '900', color: '#1f2937' },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionChip: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9' },
  activeOption: { backgroundColor: '#10b981', borderColor: '#10b981' },
  optionText: { fontSize: 12, fontWeight: '800', color: '#64748b' },
  activeOptionText: { color: '#fff' },
  timelineContainer: { marginLeft: 5 },
  timelineItem: { flexDirection: 'row', minHeight: 100 },
  timelinePoint: { width: 30, alignItems: 'center' },
  pointDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#10b981', borderWidth: 3, borderColor: '#dcfce7' },
  pointLine: { flex: 1, width: 2, backgroundColor: '#f1f5f9', marginVertical: 5 },
  timelineContent: { flex: 1, paddingBottom: 30, paddingLeft: 10 },
  hTitle: { fontSize: 16, fontWeight: '900', color: '#1f2937', marginBottom: 4 },
  hMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  hDoc: { fontSize: 12, fontWeight: '800', color: '#10b981' },
  hDate: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  hNotesCard: { backgroundColor: '#f8fafc', padding: 15, borderRadius: 18, borderLeftWidth: 3, borderLeftColor: '#10b981' },
  hNotes: { fontSize: 13, color: '#64748b', lineHeight: 20, fontWeight: '500' },
  emptyContainer: { alignItems: 'center', marginTop: 80, opacity: 0.3 },
  emptyText: { fontSize: 14, fontWeight: '700', color: '#94a3b8', marginTop: 15 },
  tipBox: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 20, paddingBottom: 35, gap: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  tipText: { fontSize: 12, color: '#64748b', fontWeight: '600', flex: 1, lineHeight: 18 },
  emptyHistory: { padding: 40, backgroundColor: '#f8fafc', borderRadius: 30, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', borderStyle: 'dashed' }
});
