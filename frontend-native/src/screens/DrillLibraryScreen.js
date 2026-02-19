import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  TextInput, ActivityIndicator, RefreshControl, Modal, Alert, ScrollView,
  KeyboardAvoidingView, Platform, Keyboard, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native'; 
import { Search, Plus, Dumbbell, ChevronRight, Users, Trophy, PenTool } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { fetchDrills, createDrill } from '../services/api';
import api from '../services/api';

// ✅ NEW IMPORTS FOR TACTICS BOARD
import TacticsBoard from '../components/TacticsBoard';
import { uploadImage } from '../services/api';

const CATEGORIES = ['All', 'Warmup', 'Serve', 'Forehand', 'Backhand', 'Volley', 'Footwork', 'Strategy', 'Fitness'];
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];
const MODES = ['Cooperative', 'Competitive'];

const CATEGORY_COLORS = {
    'Warmup': '#F59E0B',
    'Serve': '#8B5CF6',
    'Forehand': '#10B981',
    'Backhand': '#3B82F6',
    'Volley': '#EC4899',
    'Footwork': '#06B6D4',
    'Strategy': '#6366F1',
    'Fitness': '#EF4444',
    'All': '#64748B'
};

export default function DrillLibraryScreen({ navigation, route }) { 
  const [drills, setDrills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  
  // ✅ TACTICS BOARD STATE
  const [showBoard, setShowBoard] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Refs
  const scrollRef = useRef(null);
  const inputCoords = useRef({});

  const [newDrill, setNewDrill] = useState({ 
    name: '', 
    category: 'Footwork', 
    difficulty: 'Intermediate',
    description: '',
    default_duration_min: '10',
    target_value: '',
    target_prompt: '',
    drill_mode: 'Cooperative',
    media_url: null // ✅ ADDED FIELD
  });

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

  useEffect(() => { loadDrills(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDrills();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (route.params?.openModal) {
        setModalVisible(true);
        navigation.setParams({ openModal: undefined });
      }
    }, [route.params?.openModal])
  );

  const scrollToInput = (fieldKey) => {
      const y = inputCoords.current[fieldKey];
      if (y !== undefined && scrollRef.current) {
          scrollRef.current.scrollTo({ y: y, animated: true }); 
      }
  };

  // ✅ NEW: Handle Image Upload from Tactics Board
  const handleSaveDiagram = async (uri) => {
      setShowBoard(false);
      setIsUploading(true);
      try {
          const serverUrl = await uploadImage(uri);
          setNewDrill(prev => ({ ...prev, media_url: serverUrl }));
      } catch (e) {
          Alert.alert("Upload Failed", "Could not save diagram to the server.");
      } finally {
          setIsUploading(false);
      }
  };

  const getFullImageUrl = (path) => {
      if (!path) return null;
      if (path.startsWith('http')) return path;
      const baseUrl = api.defaults.baseURL.replace('/api/v1', '');
      return `${baseUrl}${path}`;
  };

  const handleSaveDrill = async () => {
    if (!newDrill.name.trim()) { 
      return Alert.alert("Error", "Drill name is required");
    }
    
    try {
        const payload = {
            ...newDrill,
            default_duration_min: parseInt(newDrill.default_duration_min) || 10,
            target_value: newDrill.target_value ? parseInt(newDrill.target_value) : null,
            target_prompt: newDrill.target_prompt || null
        };

        await createDrill(payload);
        setModalVisible(false);
        setNewDrill({ 
            name: '', category: 'Footwork', difficulty: 'Intermediate', 
            description: '', default_duration_min: '10', target_value: '', target_prompt: '', drill_mode: 'Cooperative', media_url: null
        });
        loadDrills(); 
        Alert.alert("Success", "Drill saved successfully!");
    } catch (e) {
        Alert.alert("Error", "Failed to save drill");
    }
  };

  const filteredDrills = drills.filter(drill => {
    const matchesCategory = selectedCategory === 'All' || drill.category === selectedCategory;
    const matchesSearch = drill.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const renderCategoryItem = ({ item }) => {
    const isSelected = item === selectedCategory;
    const activeColor = CATEGORY_COLORS[item] || COLORS.primary;
    
    return (
      <TouchableOpacity 
        style={[styles.catPill, isSelected && { backgroundColor: activeColor, borderColor: activeColor }]} 
        onPress={() => setSelectedCategory(item)}
      >
        <Text style={[styles.catText, isSelected && styles.catTextActive]}>{item}</Text>
      </TouchableOpacity>
    );
  };

  const renderDrillItem = ({ item }) => {
      const isCompetitive = item.drill_mode === 'Competitive';
      const modeColor = isCompetitive ? '#F97316' : '#10B981'; 
      const modeBg = isCompetitive ? '#FFEDD5' : '#D1FAE5';
      const catColor = CATEGORY_COLORS[item.category] || COLORS.primary;

      return (
        <TouchableOpacity 
          style={styles.card}
          onPress={() => navigation.navigate('DrillDetail', { drill: item })} 
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: catColor + '20' }]}> 
              <Dumbbell size={20} color={catColor} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <View style={{flexDirection: 'row', gap: 6, marginTop: 4}}>
                  <Text style={styles.diffTag}>{item.difficulty}</Text>
                  <Text style={{color: '#CBD5E1'}}>•</Text>
                  <Text style={[styles.catTag, { color: catColor }]}>{item.category}</Text>
              </View>
            </View>
            
            <View style={[styles.modeBadge, { backgroundColor: modeBg }]}>
                {isCompetitive ? <Trophy size={12} color={modeColor}/> : <Users size={12} color={modeColor}/>}
                <Text style={[styles.modeText, { color: modeColor }]}>
                    {isCompetitive ? 'Comp' : 'Coop'}
                </Text>
            </View>
          </View>
          
          <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
          
          <View style={styles.cardFooter}>
            <Text style={styles.durationText}>{item.default_duration_min || 10} min</Text>
            {item.target_value && (
                <Text style={styles.targetText}>{item.target_value} {item.target_prompt || 'Reps'}</Text>
            )}
            {/* ✅ Show icon if a diagram exists */}
            {item.media_url && <PenTool size={16} color="#64748B" style={{marginLeft: 'auto'}}/>}
          </View>
        </TouchableOpacity>
      );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Drill Library</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Plus size={20} color="#FFF" />
          <Text style={styles.addButtonText}>New</Text>
        </TouchableOpacity>
      </View>

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
        
    {/* --- CREATE DRILL MODAL --- */}
    <Modal visible={modalVisible} transparent animationType="slide">
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Create New Drill</Text>
          
          <ScrollView 
            ref={scrollRef}
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={{paddingBottom: 100}} 
            keyboardShouldPersistTaps="handled"
          >
            
            {/* NAME INPUT */}
            <View onLayout={(e) => inputCoords.current['name'] = e.nativeEvent.layout.y}>
                <Text style={styles.label}>Name</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="e.g. Crosscourt Volleys" 
                  value={newDrill.name}
                  onChangeText={(val) => setNewDrill({...newDrill, name: val})}
                  onFocus={() => scrollToInput('name')}
                />
            </View>

            <Text style={styles.label}>Type</Text>
            <View style={styles.modeRow}>
                {MODES.map(mode => {
                    const isSelected = newDrill.drill_mode === mode;
                    const isComp = mode === 'Competitive';
                    const activeColor = isComp ? '#F97316' : '#10B981';
                    
                    return (
                        <TouchableOpacity 
                            key={mode}
                            style={[
                                styles.modeBtn, 
                                isSelected && { backgroundColor: activeColor + '15', borderColor: activeColor }
                            ]}
                            onPress={() => setNewDrill({...newDrill, drill_mode: mode})}
                        >
                            {isComp ? 
                                <Trophy size={16} color={isSelected ? activeColor : '#64748B'} /> : 
                                <Users size={16} color={isSelected ? activeColor : '#64748B'} />
                            }
                            <Text style={[styles.modeBtnText, isSelected && { color: activeColor }]}>{mode}</Text>
                            {isSelected && <View style={[styles.dot, { backgroundColor: activeColor }]} />}
                        </TouchableOpacity>
                    );
                })}
            </View>

            <Text style={styles.label}>Category</Text>
            <View style={styles.catPicker}>
              {CATEGORIES.filter(c => c !== 'All').map(cat => (
                <TouchableOpacity 
                  key={cat} 
                  style={[styles.smallPill, newDrill.category === cat && { backgroundColor: CATEGORY_COLORS[cat] || COLORS.primary }]}
                  onPress={() => setNewDrill({...newDrill, category: cat})}
                >
                  <Text style={[styles.smallPillText, newDrill.category === cat && styles.whiteText]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Difficulty</Text>
            <View style={styles.catPicker}>
              {DIFFICULTIES.map(diff => (
                <TouchableOpacity 
                  key={diff} 
                  style={[styles.smallPill, newDrill.difficulty === diff && styles.diffPillActive]}
                  onPress={() => setNewDrill({...newDrill, difficulty: diff})}
                >
                  <Text style={[styles.smallPillText, newDrill.difficulty === diff && styles.whiteText]}>{diff}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* DURATION INPUT */}
            <View onLayout={(e) => inputCoords.current['duration'] = e.nativeEvent.layout.y}>
                <Text style={styles.label}>Duration (Minutes)</Text>
                <TextInput 
                    style={styles.input} 
                    keyboardType="numeric"
                    placeholder="10" 
                    value={newDrill.default_duration_min}
                    onChangeText={(val) => setNewDrill({...newDrill, default_duration_min: val})}
                    onFocus={() => scrollToInput('duration')}
                />
            </View>

            {/* TARGET INPUTS */}
            <View onLayout={(e) => inputCoords.current['targets'] = e.nativeEvent.layout.y}>
                <Text style={styles.label}>Performance Target (Optional)</Text>
                <View style={{flexDirection: 'row', gap: 12}}>
                    <View style={{flex: 1}}>
                        <TextInput 
                            style={styles.input} 
                            keyboardType="numeric"
                            placeholder="e.g. 20" 
                            value={newDrill.target_value}
                            onChangeText={(val) => setNewDrill({...newDrill, target_value: val})}
                            onFocus={() => scrollToInput('targets')}
                        />
                        <Text style={styles.subLabel}>Target Value</Text>
                    </View>
                    <View style={{flex: 2}}>
                        <TextInput 
                            style={styles.input} 
                            placeholder="e.g. Shots Made" 
                            value={newDrill.target_prompt}
                            onChangeText={(val) => setNewDrill({...newDrill, target_prompt: val})}
                            onFocus={() => scrollToInput('targets')}
                        />
                        <Text style={styles.subLabel}>Unit Label</Text>
                    </View>
                </View>
            </View>

            {/* DESCRIPTION INPUT */}
            <View onLayout={(e) => inputCoords.current['description'] = e.nativeEvent.layout.y}>
                <Text style={styles.label}>Description</Text>
                <TextInput 
                  style={[styles.input, {height: 80}]} 
                  multiline
                  placeholder="Describe the drill steps..." 
                  value={newDrill.description}
                  onChangeText={(val) => setNewDrill({...newDrill, description: val})}
                  onFocus={() => scrollToInput('description')}
                />
            </View>

            {/* ✅ ADDED: TACTICS DIAGRAM SECTION */}
            <View onLayout={(e) => inputCoords.current['tactics'] = e.nativeEvent.layout.y}>
                <Text style={styles.label}>Tactics Diagram (Optional)</Text>
                <TouchableOpacity 
                    style={styles.drawBtn} 
                    onPress={() => setShowBoard(true)}
                >
                    <PenTool size={20} color="#2563EB" />
                    <Text style={styles.drawBtnText}>
                        {newDrill.media_url ? "Edit Tactics Diagram" : "Draw Tactics Diagram"}
                    </Text>
                    {isUploading && <ActivityIndicator size="small" color="#2563EB" style={{marginLeft: 'auto'}}/>}
                </TouchableOpacity>

                {newDrill.media_url && !isUploading && (
                    <View style={styles.previewContainer}>
                        <Image 
                            source={{ uri: getFullImageUrl(newDrill.media_url) }} 
                            style={styles.previewImage} 
                            resizeMode="contain" 
                        />
                        <TouchableOpacity style={styles.removeImageBtn} onPress={() => setNewDrill({...newDrill, media_url: null})}>
                            <Text style={styles.removeImageText}>Remove</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

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
      </KeyboardAvoidingView>
    </Modal>

    {/* ✅ FULL SCREEN DRAWING BOARD MODAL */}
    <Modal visible={showBoard} animationType="slide">
        <TacticsBoard onSave={handleSaveDiagram} onClose={() => setShowBoard(false)} />
    </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: '#FFF' },
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addButtonText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  searchContainer: { marginHorizontal: 24, marginBottom: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#0F172A' },
  catContainer: { marginBottom: 16, height: 40 },
  catPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center' },
  catText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  catTextActive: { color: '#FFF' },
  listContent: { paddingHorizontal: 24, paddingBottom: 100 },
  card: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.small },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  diffTag: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  catTag: { fontSize: 12, fontWeight: '700' },
  modeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  modeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  cardDesc: { fontSize: 13, color: '#475569', lineHeight: 20, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12, gap: 12, alignItems: 'center' },
  durationText: { fontSize: 12, fontWeight: '700', color: COLORS.primary, backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  targetText: { fontSize: 12, fontWeight: '700', color: '#6366F1', backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  emptyState: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { color: '#94A3B8', fontSize: 16, fontWeight: '600' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', color: '#64748B', marginBottom: 8, marginTop: 12 },
  subLabel: { fontSize: 11, color: '#94A3B8', marginTop: 4 },
  input: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 16 },
  catPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  smallPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F1F5F9' },
  smallPillText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  whiteText: { color: '#FFF' },
  diffPillActive: { backgroundColor: '#6366F1' }, 
  modeRow: { flexDirection: 'row', gap: 12 },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFF' },
  modeBtnText: { fontWeight: '700', color: '#64748B' },
  dot: { width: 6, height: 6, borderRadius: 3 },

  // Tactics Board Styles
  drawBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#EFF6FF', borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE' },
  drawBtnText: { color: '#2563EB', fontWeight: '700' },
  previewContainer: { marginTop: 12, position: 'relative' },
  previewImage: { width: '100%', height: 180, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  removeImageBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  removeImageText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  cancelBtn: { padding: 12 },
  cancelText: { fontWeight: '700', color: '#64748B' },
  saveBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  saveText: { fontWeight: '700', color: '#FFF' },
});