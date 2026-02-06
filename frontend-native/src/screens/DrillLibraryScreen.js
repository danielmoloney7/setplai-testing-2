import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  TextInput, ActivityIndicator, Image, RefreshControl, Modal, Alert, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native'; // ✅ Added missing import
import { Search, Plus, Dumbbell, ChevronRight } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { fetchDrills, createDrill } from '../services/api';

const CATEGORIES = ['All', 'Warmup', 'Serve', 'Forehand', 'Backhand', 'Volley', 'Footwork', 'Strategy', 'Fitness'];

export default function DrillLibraryScreen({ navigation, route }) { // ✅ Added route destructuring
  const [drills, setDrills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [newDrill, setNewDrill] = useState({ name: '', category: 'Footwork', description: '' });

  const loadDrills = async () => {
    try {
      const data = await fetchDrills();
      setDrills(data);
    } catch (e) {
      console.log("Failed to load drills");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDrills();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDrills();
  }, []);

  // ✅ Automatically open modal if redirected from Coach Actions
  useFocusEffect(
    React.useCallback(() => {
      if (route.params?.openModal) {
        setModalVisible(true);
        // Clear params so it doesn't loop
        navigation.setParams({ openModal: undefined });
      }
    }, [route.params?.openModal])
  );

  const handleSaveDrill = async () => {
    if (!newDrill.name.trim()) { // ✅ Added .trim() for better validation
      return Alert.alert("Error", "Drill name is required");
    }
    
    try {
        await createDrill(newDrill);
        setModalVisible(false);
        setNewDrill({ name: '', category: 'Footwork', description: '' });
        loadDrills(); // Refresh the list
        Alert.alert("Success", "Drill saved successfully!");
    } catch (e) {
        console.error("Save Drill Error:", e); // ✅ Better debugging
        Alert.alert("Error", "Failed to save drill");
    }
  };

  // Filter Logic
  const filteredDrills = drills.filter(drill => {
    const matchesCategory = selectedCategory === 'All' || drill.category === selectedCategory;
    const matchesSearch = drill.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // --- RENDER ITEMS ---
  const renderCategoryItem = ({ item }) => {
    const isSelected = item === selectedCategory;
    return (
      <TouchableOpacity 
        style={[styles.catPill, isSelected && styles.catPillActive]} 
        onPress={() => setSelectedCategory(item)}
      >
        <Text style={[styles.catText, isSelected && styles.catTextActive]}>{item}</Text>
      </TouchableOpacity>
    );
  };

  const renderDrillItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => alert(`View Drill: ${item.name}`)} 
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconBox}>
          <Dumbbell size={20} color={COLORS.primary} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardCategory}>{item.category} • {item.difficulty || 'Intermediate'}</Text>
        </View>
        <ChevronRight size={20} color="#94A3B8" />
      </View>
      
      <Text style={styles.cardDesc} numberOfLines={2}>
        {item.description}
      </Text>
      
      <View style={styles.cardFooter}>
        <Text style={styles.durationText}>{item.default_duration_min || 10} min</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Drill Library</Text>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => setModalVisible(true)}
        >
          <Plus size={20} color="#FFF" />
          <Text style={styles.addButtonText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#94A3B8" style={styles.searchIcon} />
        <TextInput 
          style={styles.searchInput}
          placeholder="Search drills..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Categories Horizontal Scroll */}
      <View style={styles.catContainer}>
        <FlatList
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item}
          renderItem={renderCategoryItem}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
        />
      </View>

      {/* Drills List */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredDrills}
          keyExtractor={item => item.id.toString()}
          renderItem={renderDrillItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Dumbbell size={48} color="#E2E8F0" />
              <Text style={styles.emptyText}>No drills found.</Text>
            </View>
          }
        />
      )}
        
    <Modal visible={modalVisible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Create New Drill</Text>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Name</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. Crosscourt Volleys" 
              value={newDrill.name}
              onChangeText={(val) => setNewDrill({...newDrill, name: val})}
            />

            <Text style={styles.label}>Category</Text>
            <View style={styles.catPicker}>
              {CATEGORIES.filter(c => c !== 'All').map(cat => (
                <TouchableOpacity 
                  key={cat} 
                  style={[styles.smallPill, newDrill.category === cat && styles.smallPillActive]}
                  onPress={() => setNewDrill({...newDrill, category: cat})}
                >
                  <Text style={[styles.smallPillText, newDrill.category === cat && styles.whiteText]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Description</Text>
            <TextInput 
              style={[styles.input, {height: 80}]} 
              multiline
              placeholder="Describe the drill steps..." 
              value={newDrill.description}
              onChangeText={(val) => setNewDrill({...newDrill, description: val})}
            />
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSaveDrill} style={styles.saveBtn}>
              <Text style={styles.saveText}>Save Drill</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 16, backgroundColor: '#FFF'
  },
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  addButton: { 
    flexDirection: 'row', alignItems: 'center', gap: 4, 
    backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 8, 
    borderRadius: 8 
  },
  addButtonText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  searchContainer: { 
    marginHorizontal: 24, marginBottom: 16, flexDirection: 'row', alignItems: 'center', 
    backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12 
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#0F172A' },
  catContainer: { marginBottom: 16, height: 40 },
  catPill: { 
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, 
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0',
    justifyContent: 'center'
  },
  catPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  catTextActive: { color: '#FFF' },
  listContent: { paddingHorizontal: 24, paddingBottom: 100 },
  card: { 
    backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 12, 
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.small 
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconBox: { 
    width: 40, height: 40, borderRadius: 10, backgroundColor: '#F0FDF4', 
    alignItems: 'center', justifyContent: 'center', marginRight: 12 
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  cardCategory: { fontSize: 12, color: '#64748B', fontWeight: '600', marginTop: 2 },
  cardDesc: { fontSize: 13, color: '#475569', lineHeight: 20, marginBottom: 12 },
  cardFooter: { 
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 
  },
  durationText: { fontSize: 12, fontWeight: '700', color: COLORS.primary, backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  emptyState: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { color: '#94A3B8', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', color: '#64748B', marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 16 },
  catPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  smallPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F1F5F9' },
  smallPillActive: { backgroundColor: COLORS.primary },
  smallPillText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  whiteText: { color: '#FFF' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24, gap: 12 },
  cancelBtn: { padding: 12 },
  cancelText: { fontWeight: '700', color: '#64748B' },
  saveBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  saveText: { fontWeight: '700', color: '#FFF' },
});