import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Stethoscope, 
  Heart, 
  ChevronRight, 
  Calendar, 
  Clock, 
  Tag, 
  ArrowUpRight,
  Info,
  Activity
} from 'lucide-react-native';
import api from '../../services/api';
import { Link, useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const ServiceCard = ({ title, desc, icon: Icon, colors, onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.serviceCard}>
    <LinearGradient colors={colors} style={styles.serviceGradient}>
      <View style={styles.serviceIconContainer}>
        <Icon size={32} color="#fff" />
      </View>
      <View style={styles.serviceTextContainer}>
        <Text style={styles.serviceTitle}>{title}</Text>
        <Text style={styles.serviceDesc}>{desc}</Text>
      </View>
      <ArrowUpRight size={20} color="#ffffff80" />
    </LinearGradient>
  </TouchableOpacity>
);

const BookingItem = ({ booking, type, onPress }) => {
  const isPatientView = type === 'patient'; // Doctor looking at patient
  const router = useRouter();
  
  const statusColors = {
    confirmed: '#ecfdf5',
    pending: '#fffbeb',
    cancelled: '#fef2f2',
    completed: '#f0f9ff'
  };
  const statusTextColors = {
    confirmed: '#059669',
    pending: '#d97706',
    cancelled: '#ef4444',
    completed: '#0284c7'
  };

  const isNew = booking.createdAt && ((new Date() - new Date(booking.createdAt)) < 24 * 60 * 60 * 1000);

  return (
    <View style={[styles.bookingCard, isNew && { borderColor: '#3b82f6', borderWidth: 2 }]}>
      <View style={styles.bookingHeader}>
        <View style={styles.bookingTitleSection}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.bookingName}>
              {type === 'therapy' 
                ? (booking.therapy?.name || 'Wellness Therapy')
                : (isPatientView ? booking.patient?.name : `Dr. ${booking.doctor?.name || 'Ayurvedic Specialist'}`)}
            </Text>
            {isNew && (
              <View style={{ backgroundColor: '#3b82f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 }}>NEW</Text>
              </View>
            )}
          </View>
          <Text style={styles.bookingSubtitle}>
            {type === 'therapy' ? 'Wellness Session' : (isPatientView ? 'Patient' : 'Ayurvedic Consultant')}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[booking.status] || '#f3f4f6' }]}>
          <Text style={[styles.statusText, { color: statusTextColors[booking.status] || '#6b7280' }]}>
            {booking.status}
          </Text>
        </View>
      </View>
      
      <View style={styles.bookingFooter}>
        <View style={styles.detailsRow}>
          <Calendar size={14} color="#94a3b8" />
          <Text style={styles.detailsText}>{new Date(booking.date).toLocaleDateString()}</Text>
        </View>
        <View style={styles.detailsRow}>
          <Clock size={14} color="#94a3b8" />
          <Text style={styles.detailsText}>{booking.time}</Text>
        </View>
      </View>

      {isPatientView && booking.status !== 'completed' && (
        <TouchableOpacity 
          style={styles.actionBtn} 
          onPress={() => router.push(`/prescription/${booking._id}`)}
        >
          <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.actionGradient}>
            <Text style={styles.actionBtnText}>Start Consultation</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default function ServicesScreen() {
  const [appointments, setAppointments] = useState([]);
  const [wellnessBookings, setWellnessBookings] = useState([]);
  const [role, setRole] = useState('patient');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchData = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('userInfo');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        const userRole = user.role || 'patient';
        setRole(userRole);

        if (userRole === 'doctor') {
          const { data } = await api.get('/appointments/doctor');
          setAppointments(data);
        } else {
          const [appts, wellness] = await Promise.all([
            api.get('/appointments/my').catch(() => ({ data: [] })),
            api.get('/wellness/my-bookings').catch(() => ({ data: [] }))
          ]);
          setAppointments(appts.data);
          setWellnessBookings(wellness.data);
        }
      }
    } catch (error) {
      console.error('Error fetching care data:', error);
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

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{role === 'doctor' ? 'Patient Queue' : 'Professional Care'}</Text>
          <Text style={styles.headerSubtitle}>
            {role === 'doctor' ? 'Manage your upcoming consultations' : 'Holistic healing for your mind & body'}
          </Text>
        </View>

        <View style={styles.content}>
          {/* Main Services - Hide for doctors */}
          {role !== 'doctor' && (
            <View style={styles.servicesGrid}>
              <ServiceCard 
                title="Symptom Logger" 
                desc="Track your daily progress" 
                icon={Activity} 
                colors={['#f59e0b', '#d97706']}
                onPress={() => router.push('/symptoms')}
              />
              <ServiceCard 
                title="Book Doctor" 
                desc="Consult with experts" 
                icon={Stethoscope} 
                colors={['#8b5cf6', '#7c3aed']}
                onPress={() => router.push('/booking/doctor')}
              />
              <ServiceCard 
                title="Wellness Therapy" 
                desc="Healing for mind & body" 
                icon={Heart} 
                colors={['#f43f5e', '#e11d48']}
                onPress={() => router.push('/booking/therapy')}
              />
            </View>
          )}

          {/* Upcoming Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{role === 'doctor' ? 'Today\'s Patient Queue' : 'Upcoming Sessions'}</Text>
          </View>

          <View>
            {appointments.map(apt => (
              <BookingItem key={apt._id} booking={apt} type={role === 'doctor' ? 'patient' : 'doctor'} />
            ))}
            {role !== 'doctor' && wellnessBookings.filter(b => b.status === 'confirmed' || b.status === 'pending').map(book => (
              <BookingItem key={book._id} booking={book} type="therapy" />
            ))}
            
            {appointments.length === 0 && (role === 'doctor' || wellnessBookings.length === 0) && (
              <View style={styles.emptyCard}>
                <Info size={40} color="#e2e8f0" />
                <Text style={styles.emptyText}>
                  {role === 'doctor' ? 'Your consultation queue is empty.' : 'No active bookings. Start your journey today!'}
                </Text>
              </View>
            )}
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Did you know?</Text>
            <Text style={styles.infoText}>
              Ayurvedic treatment focuses on the root cause rather than just symptoms, creating long-term health balance.
            </Text>
          </View>
        </View>
      </ScrollView>
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
  content: {
    paddingHorizontal: 25,
  },
  servicesGrid: {
    gap: 15,
    marginBottom: 30,
  },
  serviceCard: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  serviceGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 25,
    gap: 20,
  },
  serviceIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceTextContainer: {
    flex: 1,
  },
  serviceTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  serviceDesc: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionHeader: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1f2937',
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  bookingTitleSection: {
    flex: 1,
  },
  bookingName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1f2937',
  },
  bookingSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  bookingFooter: {
    flexDirection: 'row',
    gap: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  detailsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#f8fafc',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderStyle: 'dashed',
    paddingHorizontal: 40,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 15,
    lineHeight: 20,
  },
  infoCard: {
    marginTop: 20,
    padding: 25,
    backgroundColor: '#f0f9ff',
    borderRadius: 30,
    marginBottom: 30,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0369a1',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#0e7490',
    lineHeight: 20,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  actionBtn: {
    marginTop: 15,
    borderRadius: 14,
    overflow: 'hidden',
  },
  actionGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  }
});
