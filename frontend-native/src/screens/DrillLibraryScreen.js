import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  TextInput, ActivityIndicator, Image, RefreshControl 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Plus, Dumbbell, ChevronRight } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { fetchDrills } from '../services/api';

const CATEGORIES = ['All', 'Warmup', 'Serve', 'Forehand', 'Backhand', 'Volley', 'Footwork', 'Strategy', 'Fitness'];

export default function DrillLibraryScreen({ navigation }) {
  const [drills, setDrills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

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
      onPress={() => alert(`View Drill: ${item.name}`)} // Future: Navigate to Drill Detail
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconBox}>
          <Dumbbell size={20} color={COLORS.primary} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardCategory}>{item.category} • {item.difficulty}</Text>
        </View>
        <ChevronRight size={20} color="#94A3B8" />
      </View>
      
      <Text style={styles.cardDesc} numberOfLines={2}>
        {item.description}
      </Text>
      
      <View style={styles.cardFooter}>
        <Text style={styles.durationText}>{item.defaultDurationMin || item.default_duration_min} min</Text>
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
          onPress={() => alert('Open Drill Creator')}
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

  // Search
  searchContainer: { 
    marginHorizontal: 24, marginBottom: 16, flexDirection: 'row', alignItems: 'center', 
    backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12 
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#0F172A' },

  // Categories
  catContainer: { marginBottom: 16, height: 40 },
  catPill: { 
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, 
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0',
    justifyContent: 'center'
  },
  catPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  catTextActive: { color: '#FFF' },

  // List
  listContent: { paddingHorizontal: 24, paddingBottom: 100 },
  
  // Card
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
  emptyText: { color: '#94A3B8', fontSize: 16, fontWeight: '600' }
});