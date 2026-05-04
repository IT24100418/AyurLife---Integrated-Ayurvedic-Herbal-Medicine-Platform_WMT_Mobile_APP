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
  Image,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import Config from '../../constants/Config';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Calendar,
  ClipboardList,
  Clock,
  Leaf,
  ShoppingBag,
  Activity,
  Heart,
  Stethoscope,
  ChevronRight,
  Sparkles,
  User as UserIcon,
  Zap,
  Box,
  FlaskConical,
  BookOpen,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  X
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

const DoctorLicenseUpload = ({ doctorProfile, onUploaded, baseURL }: { doctorProfile: any, onUploaded: () => void, baseURL: string }) => {
  const [uploading, setUploading] = useState(false);
  const serverBase = baseURL ? baseURL.replace('/api', '') : 'http://192.168.8.116:5001';

  const pickAndUpload = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Needed', 'Please allow access to your photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    const formData = new FormData();
    formData.append('image', {
      uri: asset.uri,
      name: `license-${Date.now()}.jpg`,
      type: 'image/jpeg',
    } as any);

    setUploading(true);
    try {
      const uploadRes = await fetch(`${serverBase}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      const uploadJson = await uploadRes.json();
      if (!uploadJson.image) throw new Error('Upload failed');

      // Save license URL to doctor profile
      await fetch(`${serverBase}/api/doctors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JSON.parse(await require('@react-native-async-storage/async-storage').default.getItem('userInfo') || '{}').token}`
        },
        body: JSON.stringify({
          licenseDocument: uploadJson.image,
          licenseNumber: doctorProfile?.licenseNumber || 'PENDING',
          specialization: doctorProfile?.specialization || 'Ayurveda General',
        }),
      });

      Alert.alert('Success ✅', 'License uploaded! Admin will review it shortly.');
      onUploaded && onUploaded();
    } catch (err) {
      console.error('License upload error:', err);
      Alert.alert('Upload Failed', 'Could not upload license. Try again.');
    } finally {
      setUploading(false);
    }
  };

  const licenseUrl = doctorProfile?.licenseDocument
    ? `${serverBase}${doctorProfile.licenseDocument}`
    : null;

  return (
    <View style={licenseStyles.container}>
      <Text style={licenseStyles.sectionTitle}>License Document</Text>
      {licenseUrl ? (
        <View style={licenseStyles.previewBox}>
          <Image source={{ uri: licenseUrl }} style={licenseStyles.licenseImage} resizeMode="contain" />
          <TouchableOpacity style={licenseStyles.reUploadBtn} onPress={pickAndUpload} disabled={uploading}>
            <Text style={licenseStyles.reUploadText}>{uploading ? 'Uploading...' : '🔄 Replace Document'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={licenseStyles.uploadBox} onPress={pickAndUpload} disabled={uploading}>
          {uploading ? (
            <ActivityIndicator color="#3b82f6" />
          ) : (
            <>
              <Text style={licenseStyles.uploadIcon}>📄</Text>
              <Text style={licenseStyles.uploadTitle}>Upload License Document</Text>
              <Text style={licenseStyles.uploadSub}>Tap to select your medical license image</Text>
            </>
          )}
        </TouchableOpacity>
      )}
      {!doctorProfile?.isVerified && (
        <View style={licenseStyles.warningBox}>
          <Text style={licenseStyles.warningText}>
            ⚠️ Upload your license so admin can verify your account. Until verified, patients cannot book you.
          </Text>
        </View>
      )}
    </View>
  );
};

const licenseStyles = StyleSheet.create({
  container: { marginTop: 10, marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1f2937', marginBottom: 15 },
  uploadBox: { borderWidth: 2, borderColor: '#bfdbfe', borderStyle: 'dashed', borderRadius: 20, padding: 35, alignItems: 'center', backgroundColor: '#eff6ff' },
  uploadIcon: { fontSize: 40, marginBottom: 10 },
  uploadTitle: { fontSize: 15, fontWeight: '900', color: '#1e40af', marginBottom: 5 },
  uploadSub: { fontSize: 12, color: '#60a5fa', fontWeight: '600', textAlign: 'center' },
  previewBox: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#bfdbfe' },
  licenseImage: { width: '100%', height: 220, backgroundColor: '#f1f5f9' },
  reUploadBtn: { backgroundColor: '#eff6ff', padding: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#bfdbfe' },
  reUploadText: { color: '#3b82f6', fontWeight: '800', fontSize: 13 },
  warningBox: { marginTop: 12, backgroundColor: '#fffbeb', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#fde68a' },
  warningText: { color: '#92400e', fontSize: 12, fontWeight: '600', lineHeight: 18 },
});

const DoctorAvailability = ({ doctorProfile, onUpdate, baseURL }: { doctorProfile: any, onUpdate: () => void, baseURL: string }) => {
  const [availability, setAvailability] = useState(doctorProfile?.availability || []);
  const [saving, setSaving] = useState(false);
  const serverBase = baseURL ? baseURL.replace('/api', '') : 'http://192.168.8.116:5001';

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const TIMES = ['07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM'];

  const toggleDay = (day: string) => {
    const exists = availability.find((a: any) => a.day === day);
    if (exists) {
      setAvailability(availability.filter((a: any) => a.day !== day));
    } else {
      setAvailability([...availability, { day, startTime: '09:00 AM', endTime: '05:00 PM' }]);
    }
  };

  const cycleTime = (day: string, field: string) => {
    setAvailability(availability.map((a: any) => {
      if (a.day !== day) return a;
      const currentIndex = TIMES.indexOf(a[field]);
      const nextIndex = (currentIndex + 1) % TIMES.length;
      return { ...a, [field]: TIMES[nextIndex] };
    }));
  };

  const saveAvailability = async () => {
    setSaving(true);
    try {
      await fetch(`${serverBase}/api/doctors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JSON.parse(await AsyncStorage.getItem('userInfo') || '{}').token}`
        },
        body: JSON.stringify({
          specialization: doctorProfile?.specialization,
          licenseNumber: doctorProfile?.licenseNumber,
          availability: availability
        }),
      });
      Alert.alert('Success ✅', 'Availability updated successfully.');
      onUpdate && onUpdate();
    } catch (err) {
      Alert.alert('Error', 'Failed to save availability.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={availStyles.container}>
      <Text style={availStyles.sectionTitle}>Working Hours</Text>
      <View style={availStyles.card}>
        {DAYS.map((day: string) => {
          const slot = availability.find((a: any) => a.day === day);
          const isSelected = !!slot;

          return (
            <View key={day} style={[availStyles.dayRow, isSelected && availStyles.dayRowActive]}>
              <TouchableOpacity style={availStyles.dayToggle} onPress={() => toggleDay(day)}>
                <View style={[availStyles.checkbox, isSelected && availStyles.checkboxActive]}>
                  {isSelected && <CheckCircle2 size={14} color="#fff" />}
                </View>
                <Text style={[availStyles.dayText, isSelected && availStyles.dayTextActive]}>{day}</Text>
              </TouchableOpacity>

              {isSelected && (
                <View style={availStyles.timeSection}>
                  <TouchableOpacity style={availStyles.timeBtn} onPress={() => cycleTime(day, 'startTime')}>
                    <Text style={availStyles.timeText}>{slot.startTime}</Text>
                  </TouchableOpacity>
                  <Text style={availStyles.timeTo}>to</Text>
                  <TouchableOpacity style={availStyles.timeBtn} onPress={() => cycleTime(day, 'endTime')}>
                    <Text style={availStyles.timeText}>{slot.endTime}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        <TouchableOpacity
          style={availStyles.saveBtn}
          onPress={saveAvailability}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={availStyles.saveBtnText}>Save Availability</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const availStyles = StyleSheet.create({
  container: { marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1f2937', marginBottom: 15 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  dayRowActive: { borderBottomColor: '#e0f2fe' },
  dayToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  dayText: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  dayTextActive: { color: '#1e293b', fontWeight: '800' },
  timeSection: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  timeText: { fontSize: 12, fontWeight: '700', color: '#3b82f6' },
  timeTo: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  saveBtn: { backgroundColor: '#1e293b', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});

const StatCard = ({ icon: Icon, label, value, colors }: { icon: any, label: string, value: string | number, colors: any }) => (
  <TouchableOpacity activeOpacity={0.9} style={styles.statCard}>
    <LinearGradient colors={colors} style={styles.statGradient}>
      <View style={styles.statIconContainer}>
        <Icon size={20} color="#fff" />
      </View>
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </LinearGradient>
  </TouchableOpacity>
);

const QuickAction = ({ label, icon: Icon, colors, onPress }: { label: string, icon: any, colors: any, onPress: () => void }) => (
  <TouchableOpacity activeOpacity={0.8} style={styles.actionItem} onPress={onPress}>
    <LinearGradient colors={colors} style={styles.actionIconContainer}>
      <Icon size={24} color="#fff" />
    </LinearGradient>
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

export default function DashboardScreen() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState(null);
  const [role, setRole] = useState('patient');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    appointments: 0,
    prescriptions: 0,
    bookings: 0,
    orders: 0,
    doctorAppointments: 0,
    myArticles: 0,
    totalUsers: 0,
    pendingDoctors: 0
  });
  const [doctorAppointments, setDoctorAppointments] = useState([]);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [supplierInventory, setSupplierInventory] = useState([]);
  const [activeBatches, setActiveBatches] = useState([]);
  const [therapySessions, setTherapySessions] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [supplierOrders, setSupplierOrders] = useState([]);
  const [patientOrders, setPatientOrders] = useState([]);
  const [patientAppointments, setPatientAppointments] = useState([]);
  const [selectedTherapyBooking, setSelectedTherapyBooking] = useState(null);
  const [therapyModalVisible, setTherapyModalVisible] = useState(false);
  const [allocationData, setAllocationData] = useState({
    roomNumber: '',
    assignedTherapistName: ''
  });

  const fetchData = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('userInfo');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setUserInfo(user);
        const userRole = user.role || 'patient';
        setRole(userRole);

        if (userRole === 'doctor') {
          const [appts, profile, articles] = await Promise.all([
            api.get('/appointments/doctor').catch(() => ({ data: [] })),
            api.get('/doctors').catch(() => ({ data: [] })),
            api.get('/knowledge/my').catch(() => ({ data: [] }))
          ]);
          setDoctorProfile(profile.data?.find(d => d.user?._id === user._id));
          setDoctorAppointments(appts.data || []);
          setStats({ doctorAppointments: appts.data?.length || 0, myArticles: articles.data?.length || 0 });
        } else if (userRole === 'supplier') {
          const [inv, orders] = await Promise.all([
            api.get('/inventory/my').catch(() => ({ data: [] })),
            api.get('/orders/supplier').catch(() => ({ data: [] }))
          ]);
          setSupplierInventory(inv.data || []);
          setSupplierOrders(orders.data || []);

          const earnings = (orders.data || [])
            .filter(o => o.status === 'delivered')
            .reduce((sum, o) => sum + o.totalAmount, 0);

          setStats({
            inventoryCount: inv.data?.length || 0,
            pendingOrders: orders.data?.filter(o => o.status === 'pending').length || 0,
            totalEarnings: earnings
          });
        } else if (userRole === 'producer') {
          const [batches, formulas, orders] = await Promise.all([
            api.get('/production/my-batches').catch(() => ({ data: [] })),
            api.get('/production/my-formulas').catch(() => ({ data: [] })),
            api.get('/orders/supplier').catch(() => ({ data: [] }))
          ]);
          setActiveBatches(batches.data || []);
          setSupplierOrders(orders.data || []);

          const earnings = (orders.data || [])
            .filter(o => o.status === 'delivered')
            .reduce((sum, o) => sum + o.totalAmount, 0);

          setStats({
            activeBatches: batches.data?.length || 0,
            formulaCount: formulas.data?.length || 0,
            pendingOrders: orders.data?.filter(o => o.status === 'pending').length || 0,
            totalEarnings: earnings
          });
        } else if (userRole === 'wellness_staff') {
          const [{ data: bookings }, { data: therapies }] = await Promise.all([
            api.get('/wellness/my-bookings').catch(() => ({ data: [] })),
            api.get('/wellness/therapies').catch(() => ({ data: [] }))
          ]);
          setTherapySessions(bookings);
          setStats({ bookings: bookings.length, servicesCount: therapies.length });
        } else if (userRole === 'admin') {
          const [users, pending] = await Promise.all([
            api.get('/admin/users').catch(() => ({ data: [] })),
            api.get('/admin/doctors/pending').catch(() => ({ data: [] }))
          ]);
          setAdminUsers(users.data);
          setPendingDoctors(pending.data);
          setStats({ totalUsers: users.data.length, pendingDoctors: pending.data.length });
        } else {
          // Patient
          const [appts, scripts, wellness, orders] = await Promise.all([
            api.get('/appointments/my').catch(() => ({ data: [] })),
            api.get('/prescriptions/my').catch(() => ({ data: [] })),
            api.get('/wellness/my-bookings').catch(() => ({ data: [] })),
            api.get('/orders/my').catch(() => ({ data: [] }))
          ]);
          setStats({
            appointments: appts.data?.length || 0,
            prescriptions: scripts.data?.length || 0,
            bookings: wellness.data?.length || 0,
            orders: orders.data?.length || 0
          });
          setPatientOrders(orders.data || []);
          setTherapySessions(wellness.data || []);

          // Filter to only show upcoming appointments
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const upcomingAppts = (appts.data || []).filter(a => new Date(a.date) >= today);
          setPatientAppointments(upcomingAppts);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleUpdateStatus = async (appointmentId, status) => {
    try {
      await api.put(`/appointments/${appointmentId}/status`, { status });
      fetchData();
    } catch (error) {
      console.error('Error updating appointment status:', error);
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status });
      fetchData();
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const handleUpdateTherapyStatus = async (bookingId, status) => {
    try {
      await api.put(`/wellness/bookings/${bookingId}`, {
        status,
        roomNumber: allocationData.roomNumber,
        assignedTherapistName: allocationData.assignedTherapistName
      });
      setTherapyModalVisible(false);
      setAllocationData({ roomNumber: '', assignedTherapistName: '' });
      fetchData();
      Alert.alert('Success ✅', `Booking ${status} successfully.`);
    } catch (error) {
      console.error('Error updating therapy status:', error);
      Alert.alert('Error', 'Failed to update booking status.');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  // --- Doctor Dashboard Render ---
  if (role === 'doctor') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
        >
          <LinearGradient colors={['#3b82f6', '#1d4ed8']} style={styles.header}>
            <View style={styles.headerContent}>
              <View>
                <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Stethoscope size={10} color="#fff" />
                  <Text style={styles.badgeText}>DOCTOR CONSOLE</Text>
                </View>
                <Text style={styles.welcomeText}>Welcome back,</Text>
                <Text style={styles.userName}>Dr. {userInfo?.name?.split(' ')[0] || 'Doctor'}</Text>
                <View style={styles.statusRow}>
                  {doctorProfile?.isVerified ? (
                    <Text style={styles.verifiedText}>● Verified Practitioner</Text>
                  ) : (
                    <Text style={styles.pendingText}>● Verification Pending</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/profile')}>
                <UserIcon size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.statsGrid}>
              <StatCard
                icon={Clock}
                label="Total Consults"
                value={stats.doctorAppointments}
                colors={['#ffffff30', '#ffffff10']}
              />
              <StatCard
                icon={BookOpen}
                label="My Articles"
                value={stats.myArticles}
                colors={['#ffffff30', '#ffffff10']}
              />
            </View>
          </LinearGradient>

          <View style={styles.content}>
            <Text style={styles.sectionTitle}>Today's Queue</Text>
            {loading ? (
              <View style={styles.emptyAppointments}>
                <ActivityIndicator color="#3b82f6" />
                <Text style={styles.emptyText}>Fetching schedule...</Text>
              </View>
            ) : doctorAppointments.filter(a => a.status !== 'completed' && a.status !== 'cancelled').length === 0 ? (
              <View style={styles.emptyAppointments}>
                <Calendar size={40} color="#e5e7eb" />
                <Text style={styles.emptyText}>No pending appointments for today</Text>
              </View>
            ) : (
              doctorAppointments.filter(a => a.status !== 'completed' && a.status !== 'cancelled').map(appt => {
                // Check if the appointment was created within the last 24 hours
                const isNew = (new Date() - new Date(appt.createdAt)) < 24 * 60 * 60 * 1000;

                return (
                  <View key={appt._id} style={[styles.apptCard, isNew && { borderColor: '#3b82f6', borderWidth: 2 }]}>
                    <View style={styles.apptHeader}>
                      <View style={styles.patientInfo}>
                        <View style={[styles.pAvatar, isNew && { backgroundColor: '#eff6ff' }]}>
                          <Text style={[styles.pAvatarText, isNew && { color: '#3b82f6' }]}>{appt.patient?.name?.charAt(0)}</Text>
                        </View>
                        <View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.pName}>{appt.patient?.name}</Text>
                            {isNew && (
                              <View style={{ backgroundColor: '#3b82f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 }}>NEW</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.pDetail}>{appt.time} • {new Date(appt.date).toLocaleDateString()}</Text>
                        </View>
                      </View>
                      <View style={[styles.roleBadge, { backgroundColor: appt.status === 'confirmed' ? '#ecfdf5' : appt.status === 'cancelled' ? '#fee2e2' : '#fffbeb' }]}>
                        <Text style={[styles.roleBadgeText, { color: appt.status === 'confirmed' ? '#059669' : appt.status === 'cancelled' ? '#ef4444' : '#d97706' }]}>{appt.status.toUpperCase()}</Text>
                      </View>
                    </View>

                    {appt.status === 'pending' ? (
                      <View style={styles.apptActions}>
                        <TouchableOpacity
                          style={[styles.smallActionBtn, { backgroundColor: '#fee2e2' }]}
                          onPress={() => handleUpdateStatus(appt._id, 'cancelled')}
                        >
                          <XCircle size={14} color="#ef4444" />
                          <Text style={[styles.smallActionText, { color: '#ef4444' }]}>Decline</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.smallActionBtn, { backgroundColor: '#ecfdf5' }]}
                          onPress={() => handleUpdateStatus(appt._id, 'confirmed')}
                        >
                          <CheckCircle2 size={14} color="#059669" />
                          <Text style={[styles.smallActionText, { color: '#059669' }]}>Approve</Text>
                        </TouchableOpacity>
                      </View>
                    ) : appt.status === 'confirmed' ? (
                      <TouchableOpacity
                        style={styles.consultButton}
                        onPress={() => router.push(`/prescription/${appt._id}`)}
                      >
                        <Text style={styles.consultButtonText}>Start Consultation</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.cancelledNote}>
                        <AlertCircle size={14} color="#94a3b8" />
                        <Text style={styles.cancelledText}>This appointment was cancelled.</Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}

            <Text style={styles.sectionTitle}>Profile Overview</Text>
            <View style={styles.profileCard}>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Specialization</Text>
                <Text style={styles.profileValue}>{doctorProfile?.specialization || 'Not set'}</Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>License Number</Text>
                <Text style={styles.profileValue}>{doctorProfile?.licenseNumber || 'Not set'}</Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Verification Status</Text>
                <Text style={[styles.profileValue, { color: doctorProfile?.isVerified ? '#059669' : '#d97706' }]}>
                  {doctorProfile?.isVerified ? '✅ Verified' : '⏳ Pending Admin Approval'}
                </Text>
              </View>
            </View>

            <DoctorLicenseUpload doctorProfile={doctorProfile} onUploaded={fetchData} baseURL={require('../../services/api').default.defaults.baseURL} />
            <DoctorAvailability doctorProfile={doctorProfile} onUpdate={fetchData} baseURL={require('../../services/api').default.defaults.baseURL} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- Supplier Dashboard Render ---
  if (role === 'supplier') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />}
        >
          <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.header}>
            <View style={styles.headerContent}>
              <View>
                <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <ShoppingBag size={10} color="#fff" />
                  <Text style={styles.badgeText}>SUPPLIER CONSOLE</Text>
                </View>
                <Text style={styles.welcomeText}>Hello,</Text>
                <Text style={styles.userName}>{userInfo?.name?.split(' ')[0]}</Text>
                <Text style={styles.dateText}>Managing {stats.inventoryCount} items in stock</Text>
              </View>
              <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/profile')}>
                <UserIcon size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.statsGrid}>
              <StatCard icon={Box} label="Active Listings" value={stats.inventoryCount} colors={['#ffffff30', '#ffffff10']} />
              <StatCard icon={ShoppingBag} label="Total Earnings" value={`LKR ${stats.totalEarnings || 0}`} colors={['#ffffff30', '#ffffff10']} />
            </View>
          </LinearGradient>

          <View style={styles.content}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
              <QuickAction
                icon={Leaf}
                label="Manage Stock"
                colors={['#f59e0b', '#d97706']}
                onPress={() => router.push('/inventory/manage')}
              />
              <QuickAction
                icon={ShoppingBag}
                label="Orders"
                colors={['#10b981', '#059669']}
                onPress={() => { }}
              />
            </View>

            {supplierInventory.some(item => item.stock < 5) && (
              <View style={[styles.infoCard, { backgroundColor: '#fee2e2', borderColor: '#fecaca', borderWidth: 1, marginTop: 10 }]}>
                <AlertCircle size={20} color="#ef4444" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoTitle, { color: '#b91c1c' }]}>Low Stock Alert</Text>
                  <Text style={[styles.infoDesc, { color: '#ef4444' }]}>Some items in your inventory are running low (below 5 units). Please update your stock.</Text>
                </View>
              </View>
            )}

            <Text style={styles.sectionTitle}>Incoming Orders ({stats.pendingOrders})</Text>
            {supplierOrders.length === 0 ? (
              <View style={styles.emptyAppointments}>
                <ShoppingBag size={40} color="#e5e7eb" />
                <Text style={styles.emptyText}>No orders yet. Your items are listed in the shop!</Text>
              </View>
            ) : (
              supplierOrders.map(order => (
                <TouchableOpacity
                  key={order._id}
                  style={styles.apptCard}
                  onPress={() => router.push(`/orders/${order._id}`)}
                >
                  <View style={styles.apptHeader}>
                    <View style={styles.patientInfo}>
                      <View style={[styles.pAvatar, { backgroundColor: '#fff7ed', overflow: 'hidden' }]}>
                        {order.items && order.items[0]?.image ? (
                          <Image
                            source={{ uri: order.items[0].image.startsWith('/uploads') ? `${Config.BASE_URL.replace('/api', '')}${order.items[0].image}` : order.items[0].image }}
                            style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                          />
                        ) : (
                          <UserIcon size={20} color="#f59e0b" />
                        )}
                      </View>
                      <View>
                        <Text style={styles.pName}>{order.buyer?.name || 'Customer'}</Text>
                        <Text style={styles.pDetail}>{order.items.length} item(s) • LKR {order.totalAmount}</Text>
                      </View>
                    </View>
                    <View style={[styles.roleBadge, { backgroundColor: order.status === 'delivered' ? '#ecfdf5' : order.status === 'shipped' ? '#eff6ff' : '#fff7ed' }]}>
                      <Text style={[styles.roleBadgeText, { color: order.status === 'delivered' ? '#059669' : order.status === 'shipped' ? '#3b82f6' : '#f59e0b' }]}>{order.status.toUpperCase()}</Text>
                    </View>
                  </View>

                  {order.status === 'pending' && (
                    <TouchableOpacity
                      style={[styles.consultButton, { backgroundColor: '#f59e0b' }]}
                      onPress={() => handleUpdateOrderStatus(order._id, 'shipped')}
                    >
                      <Text style={styles.consultButtonText}>Mark as Shipped</Text>
                    </TouchableOpacity>
                  )}
                  {order.status === 'shipped' && (
                    <TouchableOpacity
                      style={[styles.consultButton, { backgroundColor: '#10b981' }]}
                      onPress={() => handleUpdateOrderStatus(order._id, 'delivered')}
                    >
                      <Text style={styles.consultButtonText}>Mark as Delivered</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- Producer Dashboard Render ---
  if (role === 'producer') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />}>
          <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.header}>
            <View style={styles.headerContent}>
              <View>
                <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Activity size={10} color="#fff" />
                  <Text style={styles.badgeText}>PRODUCTION UNIT</Text>
                </View>
                <Text style={styles.welcomeText}>Welcome back,</Text>
                <Text style={styles.userName}>{userInfo?.name?.split(' ')[0]}</Text>
                <Text style={styles.dateText}>{stats.activeBatches} active batches</Text>
              </View>
              <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/profile')}><UserIcon size={24} color="#fff" /></TouchableOpacity>
            </View>
            <View style={styles.statsGrid}>
              <StatCard icon={Zap} label="Active Batches" value={stats.activeBatches} colors={['#ffffff30', '#ffffff10']} />
              <StatCard icon={ShoppingBag} label="Orders" value={stats.pendingOrders || 0} colors={['#ffffff30', '#ffffff10']} />
            </View>
          </LinearGradient>

          <View style={styles.content}>
            <Text style={styles.sectionTitle}>Production Management</Text>
            <View style={styles.actionsGrid}>
              <QuickAction
                icon={BookOpen}
                label="Veda-Potha"
                colors={['#8b5cf6', '#7c3aed']}
                onPress={() => router.push('/production/formulas')}
              />
              <QuickAction
                icon={FlaskConical}
                label="Batches"
                colors={['#10b981', '#059669']}
                onPress={() => router.push('/production/batches')}
              />
              <QuickAction
                icon={ShoppingBag}
                label="Orders"
                colors={['#f59e0b', '#d97706']}
                onPress={() => router.push('/production/orders')}
              />
              <QuickAction
                icon={Sparkles}
                label="Heritage"
                colors={['#3b82f6', '#1d4ed8']}
                onPress={() => router.push('/profile/heritage')}
              />
            </View>

            <Text style={styles.sectionTitle}>Incoming Product Orders ({stats.pendingOrders})</Text>
            {supplierOrders.length === 0 ? (
              <View style={styles.emptyAppointments}>
                <ShoppingBag size={40} color="#e5e7eb" />
                <Text style={styles.emptyText}>No orders for your processed items yet.</Text>
              </View>
            ) : (
              supplierOrders.slice(0, 3).map(order => (
                <TouchableOpacity
                  key={order._id}
                  style={styles.apptCard}
                  onPress={() => router.push(`/orders/${order._id}`)}
                >
                  <View style={styles.apptHeader}>
                    <View style={styles.patientInfo}>
                      <View style={[styles.pAvatar, { backgroundColor: '#f5f3ff', overflow: 'hidden' }]}>
                        {order.items && order.items[0]?.image ? (
                          <Image
                            source={{ uri: order.items[0].image.startsWith('/uploads') ? `${Config.BASE_URL.replace('/api', '')}${order.items[0].image}` : order.items[0].image }}
                            style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                          />
                        ) : (
                          <UserIcon size={20} color="#8b5cf6" />
                        )}
                      </View>
                      <View>
                        <Text style={styles.pName}>{order.buyer?.name || 'Customer'}</Text>
                        <Text style={styles.pDetail}>{order.items.length} item(s) • LKR {order.totalAmount}</Text>
                      </View>
                    </View>
                    <View style={[styles.roleBadge, { backgroundColor: order.status === 'delivered' ? '#ecfdf5' : order.status === 'shipped' ? '#eff6ff' : '#f5f3ff' }]}>
                      <Text style={[styles.roleBadgeText, { color: order.status === 'delivered' ? '#059669' : order.status === 'shipped' ? '#3b82f6' : '#8b5cf6' }]}>{order.status.toUpperCase()}</Text>
                    </View>
                  </View>

                  {order.status === 'pending' && (
                    <TouchableOpacity
                      style={[styles.consultButton, { backgroundColor: '#8b5cf6' }]}
                      onPress={() => handleUpdateOrderStatus(order._id, 'shipped')}
                    >
                      <Text style={styles.consultButtonText}>Mark as Shipped</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))
            )}

            <Text style={styles.sectionTitle}>Live Production Batches</Text>
            {activeBatches.length === 0 ? (
              <View style={styles.emptyAppointments}>
                <Box size={40} color="#e5e7eb" />
                <Text style={styles.emptyText}>No batches in production.</Text>
              </View>
            ) : (
              activeBatches.map(batch => (
                <View key={batch._id} style={styles.apptCard}>
                  <View style={styles.apptHeader}>
                    <View>
                      <Text style={styles.pName}>Batch #{batch.batchNumber}</Text>
                      <Text style={styles.pDetail}>{batch.formulation?.name || 'Ayurvedic Formula'}</Text>
                    </View>
                    <View style={[styles.roleBadge, { backgroundColor: '#ede9fe' }]}>
                      <Text style={[styles.roleBadgeText, { color: '#7c3aed' }]}>{batch.status}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- Wellness Staff Dashboard Render ---
  if (role === 'wellness_staff') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f43f5e" />}>
          <LinearGradient colors={['#f43f5e', '#e11d48']} style={styles.header}>
            <View style={styles.headerContent}>
              <View>
                <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Heart size={10} color="#fff" />
                  <Text style={styles.badgeText}>WELLNESS CENTER</Text>
                </View>
                <Text style={styles.welcomeText}>Namaste,</Text>
                <Text style={styles.userName}>{userInfo?.name?.split(' ')[0]}</Text>
              </View>
              <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/profile')}><UserIcon size={24} color="#fff" /></TouchableOpacity>
            </View>
            <View style={styles.statsGrid}>
              <StatCard icon={Calendar} label="Bookings" value={stats.bookings} colors={['#ffffff30', '#ffffff10']} />
              <StatCard icon={Heart} label="Services" value={stats.servicesCount || 0} colors={['#ffffff30', '#ffffff10']} />
            </View>
          </LinearGradient>
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>Wellness Actions</Text>
            <View style={styles.actionsGrid}>
              <QuickAction
                icon={Plus}
                label="Manage Services"
                colors={['#f43f5e', '#e11d48']}
                onPress={() => router.push('/wellness/manage')}
              />
            </View>
            <Text style={styles.sectionTitle}>Therapy Schedule</Text>
            {therapySessions.length === 0 ? (
              <View style={styles.emptyAppointments}><Text style={styles.emptyText}>No therapy sessions today.</Text></View>
            ) : (
              therapySessions.map(session => (
                <TouchableOpacity
                  key={session._id}
                  style={styles.apptCard}
                  onPress={() => {
                    setSelectedTherapyBooking(session);
                    setTherapyModalVisible(true);
                  }}
                >
                  <View style={styles.apptHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.pName}>{session.therapy?.name || 'Wellness Therapy'}</Text>
                        <View style={[styles.roleBadge, { backgroundColor: session.status === 'confirmed' ? '#ecfdf5' : session.status === 'cancelled' ? '#fee2e2' : '#fffbeb' }]}>
                          <Text style={[styles.roleBadgeText, { color: session.status === 'confirmed' ? '#059669' : session.status === 'cancelled' ? '#ef4444' : '#d97706', fontSize: 10 }]}>{session.status.toUpperCase()}</Text>
                        </View>
                      </View>
                      <Text style={styles.pDetail}>{session.patient?.name || 'Valued Patient'} • {session.time}</Text>
                      <Text style={[styles.pDetail, { marginTop: 2 }]}>{new Date(session.date).toLocaleDateString()}</Text>
                    </View>
                    <ChevronRight size={18} color="#cbd5e1" />
                  </View>
                </TouchableOpacity>
              ))
            )}

            <Modal
              animationType="slide"
              transparent={true}
              visible={therapyModalVisible}
              onRequestClose={() => setTherapyModalVisible(false)}
            >
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <View style={modalStyles.overlay}>
                  <View style={modalStyles.content}>
                    <View style={modalStyles.header}>
                      <Text style={modalStyles.title}>Booking Details</Text>
                      <TouchableOpacity onPress={() => setTherapyModalVisible(false)}>
                        <X size={24} color="#64748b" />
                      </TouchableOpacity>
                    </View>

                    {selectedTherapyBooking && (
                      <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={modalStyles.detailBox}>
                          <Text style={modalStyles.label}>Patient Name</Text>
                          <Text style={modalStyles.value}>{selectedTherapyBooking.patient?.name}</Text>

                          <Text style={modalStyles.label}>Therapy Service</Text>
                          <Text style={modalStyles.value}>{selectedTherapyBooking.therapy?.name}</Text>

                          <View style={{ flexDirection: 'row', gap: 20 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={modalStyles.label}>Date</Text>
                              <Text style={modalStyles.value}>{new Date(selectedTherapyBooking.date).toLocaleDateString()}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={modalStyles.label}>Time</Text>
                              <Text style={modalStyles.value}>{selectedTherapyBooking.time}</Text>
                            </View>
                          </View>

                          <Text style={modalStyles.label}>Payment Status</Text>
                          <View style={[styles.roleBadge, { alignSelf: 'flex-start', marginBottom: 15, backgroundColor: selectedTherapyBooking.paymentStatus === 'paid' ? '#ecfdf5' : '#fffbeb' }]}>
                            <Text style={[styles.roleBadgeText, { color: selectedTherapyBooking.paymentStatus === 'paid' ? '#059669' : '#d97706' }]}>{selectedTherapyBooking.paymentMethod} - {selectedTherapyBooking.paymentStatus.toUpperCase()}</Text>
                          </View>

                          {selectedTherapyBooking.notes && (
                            <>
                              <Text style={modalStyles.label}>Patient Notes</Text>
                              <Text style={modalStyles.notes}>{selectedTherapyBooking.notes}</Text>
                            </>
                          )}

                          {(selectedTherapyBooking.status === 'confirmed' || selectedTherapyBooking.status === 'completed') && selectedTherapyBooking.roomNumber && (
                            <View style={{ marginTop: 15 }}>
                              <Text style={modalStyles.label}>Allocated Resources</Text>
                              <Text style={modalStyles.value}>Room: {selectedTherapyBooking.roomNumber} • Therapist: {selectedTherapyBooking.assignedTherapistName}</Text>
                            </View>
                          )}

                          {selectedTherapyBooking.status === 'completed' && selectedTherapyBooking.therapy?.careInstructions && (
                            <View style={{ marginTop: 15, padding: 15, backgroundColor: '#fff1f2', borderRadius: 16 }}>
                              <Text style={[modalStyles.label, { color: '#e11d48' }]}>Care Instructions</Text>
                              <Text style={[modalStyles.notes, { color: '#be123c', fontStyle: 'normal' }]}>{selectedTherapyBooking.therapy.careInstructions}</Text>
                            </View>
                          )}
                        </View>

                        {role === 'wellness_staff' && selectedTherapyBooking.status === 'pending' && (
                          <View style={{ marginBottom: 20 }}>
                            <Text style={modalStyles.label}>Allocate Resources (Required to Confirm)</Text>
                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 5 }}>
                              <TextInput
                                style={[styles.input, { flex: 1, height: 45, fontSize: 13 }]}
                                placeholder="Room No (e.g. R-01)"
                                value={allocationData.roomNumber}
                                onChangeText={(val) => setAllocationData({ ...allocationData, roomNumber: val })}
                              />
                              <TextInput
                                style={[styles.input, { flex: 1, height: 45, fontSize: 13 }]}
                                placeholder="Therapist Name"
                                value={allocationData.assignedTherapistName}
                                onChangeText={(val) => setAllocationData({ ...allocationData, assignedTherapistName: val })}
                              />
                            </View>
                          </View>
                        )}

                        {selectedTherapyBooking.status === 'pending' && (
                          <View style={modalStyles.actions}>
                            <TouchableOpacity
                              style={[modalStyles.actionBtn, { backgroundColor: '#fee2e2' }]}
                              onPress={() => handleUpdateTherapyStatus(selectedTherapyBooking._id, 'cancelled')}
                            >
                              <XCircle size={20} color="#ef4444" />
                              <Text style={[modalStyles.actionText, { color: '#ef4444' }]}>Decline</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[modalStyles.actionBtn, { backgroundColor: '#ecfdf5' }]}
                              onPress={() => handleUpdateTherapyStatus(selectedTherapyBooking._id, 'confirmed')}
                            >
                              <CheckCircle2 size={20} color="#059669" />
                              <Text style={[modalStyles.actionText, { color: '#059669' }]}>Confirm</Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        {selectedTherapyBooking.status === 'confirmed' && (
                          <TouchableOpacity
                            style={[modalStyles.fullBtn, { backgroundColor: '#f43f5e' }]}
                            onPress={() => handleUpdateTherapyStatus(selectedTherapyBooking._id, 'completed')}
                          >
                            <CheckCircle2 size={20} color="#fff" />
                            <Text style={modalStyles.fullBtnText}>Mark as Completed</Text>
                          </TouchableOpacity>
                        )}
                      </ScrollView>
                    )}
                  </View>
                </View>
              </KeyboardAvoidingView>
            </Modal>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- Admin (Regulatory) Dashboard Render ---
  if (role === 'admin') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1e293b" />}>
          <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.header}>
            <View style={styles.headerContent}>
              <View>
                <View style={[styles.badge, { backgroundColor: '#3b82f6' }]}>
                  <ClipboardList size={10} color="#fff" />
                  <Text style={styles.badgeText}>KNOWLEDGE & REGULATORY ADMIN</Text>
                </View>
                <Text style={styles.welcomeText}>Executive Console,</Text>
                <Text style={styles.userName}>{userInfo?.name?.split(' ')[0]}</Text>
                <Text style={styles.dateText}>System-wide regulatory oversight active</Text>
              </View>
              <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/profile')}><UserIcon size={24} color="#fff" /></TouchableOpacity>
            </View>
            <View style={styles.statsGrid}>
              <StatCard icon={UserIcon} label="Total Users" value={stats.totalUsers} colors={['#ffffff30', '#ffffff10']} />
              <StatCard icon={Sparkles} label="Pending" value={stats.pendingDoctors} colors={['#ffffff30', '#ffffff10']} />
            </View>
          </LinearGradient>

          <View style={styles.content}>
            <Text style={styles.sectionTitle}>Administrative Functions</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              <QuickAction
                icon={ClipboardList}
                label="User DB"
                colors={['#1e293b', '#334155']}
                onPress={() => router.push('/admin/users')}
              />
              <QuickAction
                icon={ShieldCheck}
                label="Verification"
                colors={['#3b82f6', '#2563eb']}
                onPress={() => router.push('/admin/verify')}
              />
              <QuickAction
                icon={Activity}
                label="Dr. Logins"
                colors={['#10b981', '#059669']}
                onPress={() => router.push('/admin/doctor-logins')}
              />
              <QuickAction
                icon={ShieldAlert}
                label="Moderation"
                colors={['#f43f5e', '#e11d48']}
                onPress={() => Alert.alert('Moderation', 'Regulatory moderation console active. Use Knowledge/Forum tabs to hide/flag content directly.')}
              />
              <QuickAction
                icon={BookOpen}
                label="Review Art."
                colors={['#8b5cf6', '#6d28d9']}
                onPress={() => router.push('/admin/knowledge-review')}
              />
            </ScrollView>

            <Text style={styles.sectionTitle}>Verification Queue</Text>
            {pendingDoctors.length === 0 ? (
              <View style={styles.emptyAppointments}>
                <ShieldAlert size={40} color="#e5e7eb" />
                <Text style={styles.emptyText}>No pending practitioner requests.</Text>
              </View>
            ) : (
              pendingDoctors.map(doctor => (
                <View key={doctor._id} style={styles.apptCard}>
                  <View style={styles.apptHeader}>
                    <View>
                      <Text style={styles.pName}>Dr. {doctor.user?.name}</Text>
                      <Text style={styles.pDetail}>{doctor.specialization} • {doctor.licenseNumber}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.roleBadge, { backgroundColor: '#dcfce7' }]}
                      onPress={() => router.push('/admin/verify')}
                    >
                      <Text style={[styles.roleBadgeText, { color: '#166534' }]}>REVIEW</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- Default Patient Dashboard Render ---
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
        }
      >
        <LinearGradient colors={['#10b981', '#059669']} style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <View style={styles.badge}>
                <Sparkles size={10} color="#fff" />
                <Text style={styles.badgeText}>PATIENT PORTAL</Text>
              </View>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>{userInfo?.name?.split(' ')[0] || 'User'}</Text>
              <Text style={styles.dateText}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
            </View>
            <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/profile')}>
              <UserIcon size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.statsGrid}>
            <StatCard icon={Calendar} label="Appointments" value={stats.appointments} colors={['#ffffff30', '#ffffff10']} />
            <StatCard icon={ClipboardList} label="Prescriptions" value={stats.prescriptions} colors={['#ffffff30', '#ffffff10']} />
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <QuickAction
              icon={Stethoscope}
              label="Book Doctor"
              colors={['#8b5cf6', '#7c3aed']}
              onPress={() => router.push('/booking/doctor')}
            />
            <QuickAction
              icon={Heart}
              label="Therapy"
              colors={['#f43f5e', '#e11d48']}
              onPress={() => router.push('/booking/therapy')}
            />
            <QuickAction
              icon={Leaf}
              label="Herb Shop"
              colors={['#10b981', '#059669']}
              onPress={() => router.push('/(tabs)/shop')}
            />
            <QuickAction
              icon={Activity}
              label="Symptom Log"
              colors={['#f59e0b', '#d97706']}
              onPress={() => router.push('/symptoms')}
            />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Health Overview</Text>
            <TouchableOpacity><Text style={styles.viewAll}>View All</Text></TouchableOpacity>
          </View>

          <View style={[styles.card, patientAppointments.length > 0 && ((new Date() - new Date(patientAppointments[0].createdAt)) < 24 * 60 * 60 * 1000) && { borderColor: '#3b82f6', borderWidth: 2 }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBox, { backgroundColor: '#ecfdf5' }, patientAppointments.length > 0 && ((new Date() - new Date(patientAppointments[0].createdAt)) < 24 * 60 * 60 * 1000) && { backgroundColor: '#eff6ff' }]}><Clock size={20} color={patientAppointments.length > 0 && ((new Date() - new Date(patientAppointments[0].createdAt)) < 24 * 60 * 60 * 1000) ? '#3b82f6' : '#10b981'} /></View>
              <View style={styles.cardInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.cardTitle}>Upcoming Checkup</Text>
                  {patientAppointments.length > 0 && ((new Date() - new Date(patientAppointments[0].createdAt)) < 24 * 60 * 60 * 1000) && (
                    <View style={{ backgroundColor: '#3b82f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 }}>NEW</Text>
                    </View>
                  )}
                </View>
                {patientAppointments.length > 0 ? (
                  <View>
                    <Text style={[styles.cardSub, { color: '#10b981', fontWeight: '700' }, ((new Date() - new Date(patientAppointments[0].createdAt)) < 24 * 60 * 60 * 1000) && { color: '#3b82f6' }]}>
                      Dr. {patientAppointments[0].doctor?.name}
                    </Text>
                    <Text style={styles.cardSub}>
                      {new Date(patientAppointments[0].date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {patientAppointments[0].time}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.cardSub}>No appointments scheduled</Text>
                )}
              </View>
              <ChevronRight size={20} color="#d1d5db" />
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBox, { backgroundColor: '#fef3c7' }]}><ShoppingBag size={20} color="#d97706" /></View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>Herb Shop Orders</Text>
                {patientOrders.length > 0 ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Text style={[styles.cardSub, { color: patientOrders[0].status === 'delivered' ? '#10b981' : '#f59e0b' }]}>
                      Latest: {patientOrders[0].status.toUpperCase()}
                    </Text>
                    <Text style={styles.cardSub}>• {patientOrders[0].items[0]?.name}</Text>
                  </View>
                ) : (
                  <Text style={styles.cardSub}>No active orders</Text>
                )}
              </View>
              <ChevronRight size={20} color="#d1d5db" />
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBox, { backgroundColor: '#fee2e2' }]}><Heart size={20} color="#f43f5e" /></View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>My Therapy Sessions</Text>
                {therapySessions.length > 0 ? (
                  <View>
                    <Text style={[styles.cardSub, { color: '#f43f5e', fontWeight: '700' }]}>
                      {therapySessions[0].therapy?.name}
                    </Text>
                    <Text style={styles.cardSub}>
                      {new Date(therapySessions[0].date).toLocaleDateString()} at {therapySessions[0].time}
                    </Text>
                    {therapySessions[0].status === 'completed' && (
                      <TouchableOpacity
                        style={{ marginTop: 8, backgroundColor: '#f43f5e', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' }}
                        onPress={() => {
                          setSelectedTherapyBooking(therapySessions[0]);
                          setTherapyModalVisible(true);
                        }}
                      >
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>VIEW CARE INSTRUCTIONS</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <Text style={styles.cardSub}>No therapy sessions yet</Text>
                )}
              </View>
              <TouchableOpacity onPress={() => router.push('/booking/my-sessions')}>
                <ChevronRight size={20} color="#d1d5db" />
              </TouchableOpacity>
            </View>
          </View>

          <LinearGradient colors={['#f8fafc', '#f1f5f9']} style={styles.tipCard}>
            <View style={styles.tipIcon}><Sparkles size={24} color="#10b981" /></View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Daily Wellness Tip</Text>
              <Text style={styles.tipText}>Drink warm water with ginger and honey to boost your digestion and immunity.</Text>
            </View>
          </LinearGradient>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 40, paddingHorizontal: 25, paddingBottom: 30, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 10 },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '900', marginLeft: 5, letterSpacing: 1 },
  welcomeText: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '500' },
  userName: { color: '#fff', fontSize: 32, fontWeight: '900', marginVertical: 2 },
  dateText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
  statusRow: { marginTop: 5 },
  verifiedText: { color: '#6ee7b7', fontSize: 10, fontWeight: 'bold' },
  pendingText: { color: '#fcd34d', fontSize: 10, fontWeight: 'bold' },
  profileButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  statsGrid: { flexDirection: 'row', marginTop: 25, gap: 15 },
  statCard: { flex: 1 },
  statGradient: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', gap: 12 },
  statIconContainer: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 18, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  content: { padding: 25 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1f2937', marginBottom: 15 },
  viewAll: { fontSize: 12, fontWeight: '700', color: '#10b981' },
  actionsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  horizontalScroll: { paddingRight: 20, paddingBottom: 10, gap: 10 },
  actionItem: { alignItems: 'center', width: 85 },
  actionIconContainer: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  actionLabel: { fontSize: 9, fontWeight: '900', color: '#4b5563', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: '#f3f4f6' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  cardIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#1f2937' },
  cardSub: { fontSize: 11, color: '#9ca3af', fontWeight: '600', marginTop: 2 },
  tipCard: { flexDirection: 'row', padding: 20, borderRadius: 30, marginTop: 15, alignItems: 'center', gap: 15 },
  tipIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: 14, fontWeight: '900', color: '#1f2937', marginBottom: 4 },
  tipText: { fontSize: 12, color: '#64748b', lineHeight: 18, fontWeight: '500' },
  emptyAppointments: { alignItems: 'center', padding: 40, backgroundColor: '#f9fafb', borderRadius: 24, borderStyle: 'dashed', borderWidth: 2, borderColor: '#e5e7eb' },
  emptyText: { color: '#9ca3af', fontSize: 12, fontWeight: '600', marginTop: 10, textAlign: 'center' },
  apptCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: '#f1f5f9' },
  apptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  patientInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center' },
  pAvatarText: { color: '#2563eb', fontWeight: 'bold', fontSize: 18 },
  pName: { fontSize: 15, fontWeight: '900', color: '#111827' },
  pDetail: { fontSize: 11, fontWeight: '600', color: '#6b7280', marginTop: 2 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  roleBadgeText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  consultButton: { backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  consultButtonText: { color: '#fff', fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  profileCard: { backgroundColor: '#f8fafc', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  profileRow: { marginBottom: 15 },
  profileLabel: { fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
  profileValue: { fontSize: 14, fontWeight: '800', color: '#1f2937', marginTop: 4 },
  apptActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  smallActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12 },
  smallActionText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  cancelledNote: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5, opacity: 0.6 },
  cancelledText: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  content: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 25, maxHeight: '85%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '900', color: '#1f2937' },
  detailBox: { backgroundColor: '#f8fafc', borderRadius: 20, padding: 20, marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 },
  value: { fontSize: 16, fontWeight: '700', color: '#1f2937', marginBottom: 15 },
  notes: { fontSize: 14, color: '#475569', lineHeight: 20, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 10 },
  actionBtn: { flex: 1, height: 56, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  actionText: { fontWeight: '800', fontSize: 15 },
  fullBtn: { height: 56, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 10 },
  fullBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 }
});
