import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  FlatList,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  Modal,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { 
  Search, 
  ShoppingBag, 
  Leaf, 
  CheckCircle2,
  X,
  BookOpen,
  Plus,
  Send,
  Calendar,
  Box
} from 'lucide-react-native';
import api from '../../services/api';
import { useCart } from '../../context/CartContext';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 60) / 2;

export default function ShopScreen() {
  const router = useRouter();
  const { getCartCount } = useCart();
  const [role, setRole] = useState('patient');
  const [loading, setLoading] = useState(true);
  
  // Patient states
  const [inventory, setInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [shippingData, setShippingData] = useState({
    shippingAddress: '',
    city: '',
    postalCode: '',
    phoneNumber: ''
  });
  const [success, setSuccess] = useState(false);

  // Doctor states
  const [myArticles, setMyArticles] = useState([]);
  const [showArticleForm, setShowArticleForm] = useState(false);
  const [articleForm, setArticleForm] = useState({ title: '', content: '', category: 'Remedies' });

  const categories = ['All', 'Raw Herb', 'Processed', 'Oil'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const storedUser = await AsyncStorage.getItem('userInfo');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        const userRole = user.role || 'patient';
        setRole(userRole);

        // Always fetch inventory for everyone visiting the shop
        const { data } = await api.get('/inventory');
        setInventory(data);

        // If doctor, they might still want to see their articles count if used elsewhere, 
        // but primarily we need the shop to work.
        if (userRole === 'doctor') {
          const artRes = await api.get('/knowledge/my');
          setMyArticles(artRes.data);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateArticle = async () => {
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

  const handlePlaceOrder = async () => {
    if (!shippingData.shippingAddress || !shippingData.city || !shippingData.phoneNumber) {
      Alert.alert('Error', 'Please fill in all delivery details');
      return;
    }

    try {
      await api.post('/orders', {
        supplier: selectedProduct.supplier?._id || selectedProduct.supplier,
        items: [{
          inventoryItem: selectedProduct._id,
          name: selectedProduct.name,
          image: selectedProduct.image,
          quantity: 1,
          price: selectedProduct.pricePerUnit
        }],
        totalAmount: selectedProduct.pricePerUnit,
        ...shippingData,
        paymentMethod: 'Cash on Delivery'
      });
      
      setSuccess(true);
      fetchData(); // Refresh inventory stock levels
      setTimeout(() => {
        setSuccess(false);
        setShowCheckout(false);
        setSelectedProduct(null);
      }, 3000);
    } catch (error) {
      console.error('Error placing order:', error);
      Alert.alert('Error', 'Failed to place order');
    }
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    return matchesSearch && matchesCategory && item.stock > 0;
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Herb Shop</Text>
          <Text style={styles.headerSubtitle}>Pure nature, delivered to you</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {role === 'supplier' && (
            <TouchableOpacity 
              style={[styles.cartIcon, { backgroundColor: '#fff7ed' }]}
              onPress={() => router.push('/inventory/manage')}
            >
              <Box size={20} color="#f59e0b" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.cartHeaderBtn} onPress={() => router.push('/cart')}>
            <ShoppingBag size={24} color="#10b981" />
            {getCartCount() > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{getCartCount()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search herbs, oils, seeds..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#94a3b8"
          />
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
          {categories.map(cat => (
            <TouchableOpacity 
              key={cat}
              style={[styles.categoryChip, categoryFilter === cat && styles.activeCategoryChip]}
              onPress={() => setCategoryFilter(cat)}
            >
              <Text style={[styles.categoryText, categoryFilter === cat && styles.activeCategoryText]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredInventory}
        keyExtractor={item => item._id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.productCard}
            onPress={() => router.push(`/shop/${item._id}`)}
          >
            <View style={styles.imageContainer}>
              {item.image ? (
                <Image 
                  source={{ uri: item.image.startsWith('/uploads') ? `http://192.168.8.116:5001${item.image}` : item.image }} 
                  style={styles.productImage} 
                />
              ) : (
                <View style={styles.placeholderImg}>
                  <Leaf size={32} color="#e2e8f0" />
                </View>
              )}
            </View>
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.productPrice}>LKR {item.pricePerUnit}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.stockText}>{item.stock} in stock</Text>
                <View style={styles.addBtnSmall}>
                  <Plus size={14} color="#fff" />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Modern Floating Cart Button */}
      {getCartCount() > 0 && (
        <TouchableOpacity 
          style={styles.floatingCart} 
          onPress={() => router.push('/cart')}
          activeOpacity={0.9}
        >
          <LinearGradient colors={['#10b981', '#059669']} style={styles.floatingGradient}>
            <View style={styles.floatingIconBox}>
              <ShoppingBag size={20} color="#fff" />
              <View style={styles.floatingBadge}>
                <Text style={styles.floatingBadgeText}>{getCartCount()}</Text>
              </View>
            </View>
            <Text style={styles.floatingText}>View Cart</Text>
            <View style={styles.floatingPriceBox}>
              <Text style={styles.floatingPriceText}>Check Out</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Checkout Modal */}
      <Modal visible={showCheckout} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Checkout</Text>
              <TouchableOpacity onPress={() => setShowCheckout(false)}><X size={24} color="#1f2937" /></TouchableOpacity>
            </View>
            {success ? (
              <View style={styles.successContainer}>
                <CheckCircle2 size={80} color="#10b981" />
                <Text style={styles.successTitle}>Order Placed!</Text>
                <Text style={styles.successDesc}>Your herbs are on the way.</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.summaryCard}>
                  <Text style={styles.sumName}>{selectedProduct?.name}</Text>
                  <Text style={styles.sumPrice}>LKR {selectedProduct?.pricePerUnit}</Text>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Delivery Address</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Enter full address"
                    multiline
                    numberOfLines={3}
                    value={shippingData.shippingAddress}
                    onChangeText={(val) => setShippingData({...shippingData, shippingAddress: val})}
                  />
                </View>
                <TextInput
                  style={[styles.input, { marginBottom: 15 }]}
                  placeholder="City"
                  value={shippingData.city}
                  onChangeText={(val) => setShippingData({...shippingData, city: val})}
                />
                <TextInput
                  style={[styles.input, { marginBottom: 20 }]}
                  placeholder="Phone Number"
                  keyboardType="phone-pad"
                  value={shippingData.phoneNumber}
                  onChangeText={(val) => setShippingData({...shippingData, phoneNumber: val})}
                />
                <TouchableOpacity style={styles.orderButton} onPress={handlePlaceOrder}>
                  <LinearGradient colors={['#10b981', '#059669']} style={styles.btnGradient}>
                    <Text style={styles.btnText}>Confirm Order (COD)</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingTop: 20, paddingBottom: 15 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#1f2937' },
  headerSubtitle: { fontSize: 13, color: '#94a3b8', fontWeight: '600', marginTop: 2 },
  addButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#8b5cf6', justifyContent: 'center', alignItems: 'center' },
  cartIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#ecfdf5', justifyContent: 'center', alignItems: 'center' },
  cartHeaderBtn: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', position: 'relative', elevation: 4, shadowColor: '#10b981', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, borderWidth: 1, borderColor: '#ecfdf5' },
  cartBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#10b981', minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#fff' },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  floatingCart: { position: 'absolute', bottom: 30, left: 20, right: 20, height: 70, borderRadius: 25, elevation: 10, shadowColor: '#10b981', shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, overflow: 'hidden' },
  floatingGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 15 },
  floatingIconBox: { position: 'relative' },
  floatingBadge: { position: 'absolute', top: -8, right: -8, backgroundColor: '#fff', minWidth: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  floatingBadgeText: { color: '#10b981', fontSize: 9, fontWeight: '900' },
  floatingText: { color: '#fff', fontSize: 16, fontWeight: '900', flex: 1 },
  floatingPriceBox: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 15 },
  floatingPriceText: { color: '#fff', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  searchSection: { paddingHorizontal: 25, paddingBottom: 15 },
  searchInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 18, paddingHorizontal: 15, marginBottom: 15, borderWidth: 1, borderColor: '#f1f5f9' },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: 50, fontSize: 14, fontWeight: '600', color: '#1f2937' },
  categoriesContainer: { paddingBottom: 5 },
  categoryChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, marginRight: 10, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9' },
  activeCategoryChip: { backgroundColor: '#10b981', borderColor: '#10b981' },
  categoryText: { fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  activeCategoryText: { color: '#fff' },
  listContent: { paddingHorizontal: 20, paddingBottom: 30 },
  columnWrapper: { justifyContent: 'space-between' },
  productCard: { width: COLUMN_WIDTH, backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9', overflow: 'hidden', marginBottom: 20 },
  imageContainer: { height: COLUMN_WIDTH, backgroundColor: '#f8fafc' },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholderImg: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  productInfo: { padding: 12 },
  productName: { fontSize: 13, fontWeight: '800', color: '#1f2937' },
  productPrice: { fontSize: 15, fontWeight: '900', color: '#10b981', marginTop: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  stockText: { fontSize: 9, color: '#94a3b8', fontWeight: '700' },
  addBtnSmall: { width: 24, height: 24, borderRadius: 8, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' },
  content: { padding: 25 },
  formTitle: { fontSize: 20, fontWeight: '900', color: '#1f2937', marginBottom: 20 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: 1, marginBottom: 8, marginLeft: 5 },
  input: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 15, fontSize: 14, fontWeight: '600', color: '#111827', borderWidth: 1, borderColor: '#f1f5f9' },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  catRow: { flexDirection: 'row', gap: 10 },
  catBadge: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12, backgroundColor: '#f3f4f6' },
  activeCatBadge: { backgroundColor: '#8b5cf6' },
  catBadgeText: { fontSize: 10, fontWeight: '800', color: '#6b7280' },
  activeCatBadgeText: { color: '#fff' },
  submitButton: { marginTop: 10 },
  btnGradient: { height: 56, borderRadius: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '900', textTransform: 'uppercase' },
  articleCard: { backgroundColor: '#fff', borderRadius: 22, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  articleInfo: { flex: 1 },
  artCat: { fontSize: 9, fontWeight: '900', color: '#8b5cf6', textTransform: 'uppercase', marginBottom: 4 },
  artTitle: { fontSize: 15, fontWeight: '800', color: '#1f2937' },
  artMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  artDate: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusTabText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#94a3b8', fontSize: 14, fontWeight: '600', marginTop: 15, textAlign: 'center' },
  emptyBtn: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#8b5cf6', borderRadius: 14 },
  emptyBtnText: { color: '#fff', fontWeight: '900', textTransform: 'uppercase', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 25, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 24, fontWeight: '900', color: '#1f2937' },
  summaryCard: { backgroundColor: '#f8fafc', padding: 20, borderRadius: 20, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1, borderColor: '#f1f5f9' },
  sumName: { fontWeight: '800', color: '#1f2937' },
  sumPrice: { fontWeight: '900', color: '#10b981' },
  successContainer: { alignItems: 'center', paddingVertical: 40 },
  successTitle: { fontSize: 24, fontWeight: '900', color: '#1f2937', marginTop: 20 },
  successDesc: { color: '#94a3b8', marginTop: 10 },
});
