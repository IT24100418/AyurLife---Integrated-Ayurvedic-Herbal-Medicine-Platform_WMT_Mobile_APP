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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Stethoscope,
  CheckCircle2,
  XCircle,
  Clock,
  Smartphone,
  Globe,
  User as UserIcon,
  Activity,
  ShieldAlert
} from 'lucide-react-native';
import api from '../../services/api';

export default function DoctorLoginsScreen() {
  const router = useRouter();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = async () => {
    try {
      const { data } = await api.get('/admin/doctor-logins');
      setLogs(data);
    } catch (error) {
      console.error('Error fetching doctor logins:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  // Group logs by doctor name
  const groupedLogs = logs.reduce((acc, log) => {
    const name = log.user?.name || 'Unknown Doctor';
    if (!acc[name]) acc[name] = [];
    acc[name].push(log);
    return acc;
  }, {});

  const successCount = logs.filter(l => l.status === 'success').length;
  const failedCount = logs.filter(l => l.status === 'failed').length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading activity logs...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleSection}>
            <View style={styles.headerBadge}>
              <Activity size={10} color="#fff" />
              <Text style={styles.badgeText}>ADMIN AUDIT LOG</Text>
            </View>
            <Text style={styles.headerTitle}>Doctor Login Activity</Text>
            <Text style={styles.headerSub}>Real-time access monitoring</Text>
          </View>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{logs.length}</Text>
            <Text style={styles.summaryLabel}>Total Logins</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: 'rgba(34,197,94,0.2)', borderColor: 'rgba(34,197,94,0.3)' }]}>
            <Text style={[styles.summaryValue, { color: '#4ade80' }]}>{successCount}</Text>
            <Text style={styles.summaryLabel}>Successful</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: 'rgba(239,68,68,0.2)', borderColor: 'rgba(239,68,68,0.3)' }]}>
            <Text style={[styles.summaryValue, { color: '#f87171' }]}>{failedCount}</Text>
            <Text style={styles.summaryLabel}>Failed</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
        contentContainerStyle={styles.content}
      >
        {logs.length === 0 ? (
          <View style={styles.emptyState}>
            <ShieldAlert size={60} color="#e2e8f0" />
            <Text style={styles.emptyTitle}>No Login Records</Text>
            <Text style={styles.emptyText}>Doctor login activity will appear here once doctors start logging in.</Text>
          </View>
        ) : (
          Object.entries(groupedLogs).map(([doctorName, doctorLogs]) => (
            <View key={doctorName} style={styles.doctorSection}>
              {/* Doctor Name Header */}
              <View style={styles.doctorHeader}>
                <View style={styles.doctorAvatar}>
                  <Text style={styles.doctorAvatarText}>{doctorName.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.doctorInfo}>
                  <Text style={styles.doctorName}>Dr. {doctorName}</Text>
                  <Text style={styles.doctorEmail}>{doctorLogs[0]?.user?.email || ''}</Text>
                </View>
                <View style={styles.loginCountBadge}>
                  <Text style={styles.loginCountText}>{doctorLogs.length} logins</Text>
                </View>
              </View>

              {/* Login Entries */}
              {doctorLogs.map((log, index) => (
                <View
                  key={log._id || index}
                  style={[
                    styles.logCard,
                    log.status === 'failed' && styles.logCardFailed
                  ]}
                >
                  <View style={styles.logLeft}>
                    {log.status === 'success' ? (
                      <View style={styles.statusIconSuccess}>
                        <CheckCircle2 size={18} color="#059669" />
                      </View>
                    ) : (
                      <View style={styles.statusIconFailed}>
                        <XCircle size={18} color="#ef4444" />
                      </View>
                    )}
                    <View style={styles.logDetails}>
                      <Text style={[
                        styles.logStatus,
                        { color: log.status === 'success' ? '#059669' : '#ef4444' }
                      ]}>
                        {log.status === 'success' ? 'Login Successful' : 'Login Failed'}
                      </Text>
                      <View style={styles.logMeta}>
                        <Clock size={11} color="#94a3b8" />
                        <Text style={styles.logTime}>
                          {formatDate(log.loginTime)} · {formatTime(log.loginTime)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.logRight}>
                    {log.deviceInfo === 'Mobile App' ? (
                      <View style={styles.deviceBadge}>
                        <Smartphone size={11} color="#6366f1" />
                        <Text style={styles.deviceText}>Mobile</Text>
                      </View>
                    ) : (
                      <View style={[styles.deviceBadge, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
                        <Globe size={11} color="#d97706" />
                        <Text style={[styles.deviceText, { color: '#d97706' }]}>Web</Text>
                      </View>
                    )}
                    <Text style={styles.ipText}>{log.ipAddress !== 'Unknown' ? log.ipAddress : '—'}</Text>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    gap: 15,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  header: {
    paddingTop: 15,
    paddingHorizontal: 20,
    paddingBottom: 25,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 15,
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
  },
  headerTitleSection: {
    flex: 1,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#3b82f6',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
  },
  headerSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  summaryValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1e293b',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  doctorSection: {
    marginBottom: 25,
  },
  doctorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  doctorAvatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doctorAvatarText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#2563eb',
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1e293b',
  },
  doctorEmail: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 2,
  },
  loginCountBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  loginCountText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#3b82f6',
  },
  logCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginLeft: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  logCardFailed: {
    borderLeftColor: '#ef4444',
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  statusIconSuccess: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIconFailed: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logDetails: {
    flex: 1,
  },
  logStatus: {
    fontSize: 13,
    fontWeight: '800',
  },
  logMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  logTime: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  logRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  deviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c4b5fd',
  },
  deviceText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#6366f1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ipText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#cbd5e1',
  },
});
