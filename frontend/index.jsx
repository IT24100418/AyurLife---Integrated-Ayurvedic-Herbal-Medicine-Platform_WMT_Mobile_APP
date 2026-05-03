import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  FlatList,
  Alert
} from 'react-native';
import { 
  ChevronLeft, 
  Search, 
  User as UserIcon, 
  Activity, 
  History,
  ChevronRight
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import api from '../../services/api';

export default function PatientListScreen() {
  const router = useRouter();
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const { data } = await api.get('/doctors/patients');
      setPatients(data);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.prakruthi?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const PatientCard = ({ item }) => (
    <TouchableOpacity 
        style={styles.card}
        onPress={() => {
            // For now, doctors view patients via the consultation flow or a summary modal
            // We can extend this to a full patient history screen later
            Alert.alert(item.user?.name, `Prakruthi: ${item.prakruthi}\nSymptoms: ${item.symptoms?.length || 0} logged`);
        }}
    >
      <View style={styles.avatar}>
        <UserIcon size={24} color="#3b82f6" />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.name}>{item.user?.name}</Text>
        <View style={styles.prakruthiBadge}>
            <Text style={styles.prakruthiText}>{item.prakruthi || 'Unknown'}</Text>
        </View>
      </View>
      <ChevronRight size={20} color="#cbd5e1" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Patient Registry</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
            <Search size={20} color="#94a3b8" />
            <TextInput 
                style={styles.searchInput} 
                placeholder="Search by name or Prakruthi..." 
                value={searchQuery}
                onChangeText={setSearchQuery}
            />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 50 }} />
      ) : (
        <FlatList 
            data={filteredPatients}
            keyExtractor={item => item._id}
            renderItem={({ item }) => <PatientCard item={item} />}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
                <View style={styles.empty}>
                    <UserIcon size={48} color="#e2e8f0" />
                    <Text style={styles.emptyText}>No patients found.</Text>
                </View>
            }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#1f2937' },
  searchContainer: { paddingHorizontal: 25, marginBottom: 15 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 16, paddingHorizontal: 15, paddingVertical: 12, gap: 10, borderWidth: 1, borderColor: '#f1f5f9' },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1f2937' },
  list: { padding: 25, paddingTop: 10 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 24, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  avatar: { width: 50, height: 50, borderRadius: 18, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  cardContent: { flex: 1 },
  name: { fontSize: 16, fontWeight: '900', color: '#1f2937' },
  prakruthiBadge: { backgroundColor: '#f5f3ff', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  prakruthiText: { fontSize: 10, fontWeight: '800', color: '#8b5cf6', textTransform: 'uppercase' },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 14, color: '#94a3b8', fontWeight: '600', marginTop: 15 }
});
