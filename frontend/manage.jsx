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
  Alert,
  Modal,
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Package, 
  Tag, 
  Info,
  RefreshCw,
  Box,
  Leaf,
  ImagePlus,
  Camera,
  Image as ImageIcon
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import api from '../../services/api';

export default function InventoryManageScreen() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // New Item State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Raw Herb');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [unit, setUnit] = useState('kg');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [uploading, setUploading] = useState(false);

  const categories = ['Raw Herb', 'Dried Root', 'Seed', 'Oil Extract', 'Flower', 'Processed', 'Oil', 'Capsule', 'Other'];

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const { data } = await api.get('/inventory/my');
      setItems(data);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      Alert.alert('Error', 'Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (item) => {
    setEditingId(item._id);
    setName(item.name);
    setCategory(item.category);
    setPrice(item.pricePerUnit.toString());
    setStock(item.stock.toString());
    setUnit(item.unit);
    setDescription(item.description || '');
    setImage(item.image || '');
    setIsModalOpen(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      handleImageUpload(result.assets[0]);
    }
  };

  const handleImageUpload = async (asset) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: asset.uri,
        name: asset.fileName || 'upload.jpg',
        type: 'image/jpeg',
      });

      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setImage(data.image);
      Alert.alert('Success', 'Image uploaded successfully!');
    } catch (error) {
      console.error('Upload Error:', error);
      Alert.alert('Upload Failed', 'Could not upload photo.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name || !price || !stock) {
      Alert.alert('Missing Info', 'Please fill in basic item details.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name,
        category,
        pricePerUnit: parseFloat(price),
        stock: parseFloat(stock),
        unit,
        description,
        image
      };

      if (editingId) {
        await api.put(`/inventory/${editingId}`, payload);
        Alert.alert('Success', 'Listing updated!');
      } else {
        await api.post('/inventory', payload);
        Alert.alert('Success', 'New listing published!');
      }

      setIsModalOpen(false);
      resetForm();
      fetchInventory();
    } catch (error) {
      console.error('Save Error:', error.response?.data || error.message);
      Alert.alert('Error', error.response?.data?.message || 'Failed to save listing');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setPrice('');
    setStock('');
    setDescription('');
    setImage('');
    setCategory('Raw Herb');
    setUnit('kg');
  };

  const deleteItem = (id) => {
    Alert.alert('Delete Listing', 'Remove this herb from the marketplace?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
            try {
                await api.delete(`/inventory/${id}`);
                fetchInventory();
            } catch (error) {
                Alert.alert('Error', 'Failed to delete item');
            }
        }}
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Marketplace</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => { resetForm(); setIsModalOpen(true); }}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
            <Leaf size={24} color="#f59e0b" />
            <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Farmer Supply Chain</Text>
                <Text style={styles.infoDesc}>Manage your harvest listings here. Patients and producers will see these in the marketplace.</Text>
            </View>
        </View>

        {items.length === 0 ? (
            <View style={styles.emptyContainer}>
                <Package size={64} color="#e2e8f0" />
                <Text style={styles.emptyText}>No listings available.</Text>
                <TouchableOpacity style={styles.createBtn} onPress={() => { resetForm(); setIsModalOpen(true); }}>
                    <Text style={styles.createBtnText}>Post First Listing</Text>
                </TouchableOpacity>
            </View>
        ) : (
            items.map(item => (
                <TouchableOpacity key={item._id} style={styles.itemCard} onPress={() => openEdit(item)}>
                    <View style={styles.itemHeader}>
                        <View style={styles.itemInfo}>
                            <Text style={styles.itemName}>{item.name}</Text>
                            <Text style={styles.itemCategory}>{item.category}</Text>
                        </View>
                        <TouchableOpacity onPress={() => deleteItem(item._id)}>
                            <Trash2 size={16} color="#ef4444" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.stockRow}>
                        <View style={styles.stat}>
                            <Box size={14} color="#94a3b8" />
                            <Text style={styles.statVal}>{item.stock} {item.unit}</Text>
                            <Text style={styles.statLabel}>STOCK</Text>
                        </View>
                        <View style={styles.statMiddle}>
                            <Tag size={14} color="#94a3b8" />
                            <Text style={styles.statVal}>LKR {item.pricePerUnit}</Text>
                            <Text style={styles.statLabel}>PRICE</Text>
                        </View>
                        <TouchableOpacity style={styles.updateBtn}>
                            <RefreshCw size={14} color="#f59e0b" />
                            <Text style={styles.updateText}>Sync</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            ))
        )}
      </ScrollView>

      {/* Add Item Modal */}
      <Modal visible={isModalOpen} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingId ? 'Edit Listing' : 'Post Herb Listing'}</Text>
                <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                    <Text style={styles.closeBtn}>Cancel</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
                <Text style={styles.label}>Herb / Material Name</Text>
                <TextInput style={styles.input} placeholder="e.g. Pure Turmeric Root" value={name} onChangeText={setName} />

                <Text style={styles.label}>Product Photo</Text>
                <View style={styles.imagePickerContainer}>
                    {image ? (
                        <View style={styles.imagePreviewWrapper}>
                            <Image style={styles.previewImage} source={{ uri: `http://192.168.8.116:5001${image}` }} />
                            <TouchableOpacity style={styles.changeImageBtn} onPress={pickImage}>
                                <Camera size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.imagePlaceholder} onPress={pickImage} disabled={uploading}>
                            {uploading ? (
                                <ActivityIndicator color="#f59e0b" />
                            ) : (
                                <>
                                    <ImagePlus size={32} color="#94a3b8" />
                                    <Text style={styles.imagePlaceholderText}>Add Photo</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>

                <Text style={styles.label}>Category</Text>
                <View style={styles.categoryGrid}>
                    {categories.map(c => (
                        <TouchableOpacity 
                            key={c} 
                            style={[styles.catChip, category === c && styles.activeChip]}
                            onPress={() => setCategory(c)}
                        >
                            <Text style={[styles.catChipText, category === c && styles.activeChipText]}>{c}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Price (LKR)</Text>
                        <TextInput style={styles.input} placeholder="500.00" keyboardType="numeric" value={price} onChangeText={setPrice} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 15 }}>
                        <Text style={styles.label}>Unit</Text>
                        <TextInput style={styles.input} placeholder="kg / gram" value={unit} onChangeText={setUnit} />
                    </View>
                </View>

                <Text style={styles.label}>Stock Quantity</Text>
                <TextInput style={styles.input} placeholder="10.5" keyboardType="numeric" value={stock} onChangeText={setStock} />

                <Text style={styles.label}>Description (Optional)</Text>
                <TextInput style={[styles.input, styles.textArea]} placeholder="Origin, organic status, etc..." multiline value={description} onChangeText={setDescription} />

                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={submitting}>
                    <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.saveGradient}>
                        <Text style={styles.saveBtnText}>{editingId ? 'Update Listing' : 'Publish Listing'}</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#1f2937' },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f59e0b', justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 25 },
  infoCard: { flexDirection: 'row', backgroundColor: '#fff7ed', padding: 20, borderRadius: 24, gap: 15, marginBottom: 25, alignItems: 'center' },
  infoTitle: { fontSize: 16, fontWeight: '900', color: '#ea580c' },
  infoDesc: { fontSize: 12, color: '#f59e0b', fontWeight: '600' },
  itemCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: '#f1f5f9' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  itemName: { fontSize: 18, fontWeight: '900', color: '#1f2937' },
  itemCategory: { fontSize: 12, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginTop: 2 },
  stockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 15, borderTopWidth: 1, borderTopColor: '#f8fafc' },
  stat: { flex: 1 },
  statMiddle: { flex: 1.5, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#f1f5f9', paddingHorizontal: 15 },
  statVal: { fontSize: 14, fontWeight: '900', color: '#1f2937' },
  statLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8', marginTop: 2 },
  updateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff7ed', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  updateText: { fontSize: 11, fontWeight: '900', color: '#f59e0b' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 14, color: '#94a3b8', fontWeight: '600', marginVertical: 20 },
  createBtn: { backgroundColor: '#f59e0b', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 16 },
  createBtnText: { color: '#fff', fontWeight: '900' },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#1f2937' },
  closeBtn: { color: '#ef4444', fontWeight: '800' },
  modalScroll: { padding: 20 },
  label: { fontSize: 12, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 12 },
  input: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 15, marginBottom: 20, borderWidth: 1, borderColor: '#f1f5f9', fontWeight: '600' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 25 },
  catChip: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 10, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9' },
  activeChip: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
  catChipText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  activeChipText: { color: '#fff' },
  row: { flexDirection: 'row' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  imagePickerContainer: { marginBottom: 25 },
  imagePlaceholder: { height: 150, backgroundColor: '#f8fafc', borderRadius: 20, borderStyle: 'dashed', borderWidth: 2, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', gap: 10 },
  imagePlaceholderText: { fontSize: 13, color: '#94a3b8', fontWeight: '800' },
  imagePreviewWrapper: { height: 200, borderRadius: 20, overflow: 'hidden', position: 'relative' },
  previewImage: { width: '100%', height: '100%' },
  changeImageBtn: { position: 'absolute', bottom: 15, right: 15, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  saveBtn: { marginBottom: 50 },
  saveGradient: { height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }
});
