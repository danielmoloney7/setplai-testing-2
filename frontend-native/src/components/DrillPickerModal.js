import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { Search, Plus, X, Dumbbell } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';

export default function DrillPickerModal({ isOpen, onClose, drills, onSelectDrill }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const categories = ['All', ...new Set(drills.map(d => d.category))];

  const filtered = drills.filter(d => 
    (category === 'All' || d.category === category) &&
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
            <Text style={styles.title}>Select Drill</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={24} color="#64748B" />
            </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
            <Search size={20} color="#94A3B8" />
            <TextInput 
                style={styles.input} 
                placeholder="Search drills..." 
                value={search}
                onChangeText={setSearch}
            />
        </View>

        <View style={styles.catRow}>
            <FlatList 
                horizontal 
                showsHorizontalScrollIndicator={false}
                data={categories}
                keyExtractor={item => item}
                renderItem={({item}) => (
                    <TouchableOpacity 
                        style={[styles.catPill, category === item && styles.catActive]}
                        onPress={() => setCategory(item)}
                    >
                        <Text style={[styles.catText, category === item && styles.catTextActive]}>{item}</Text>
                    </TouchableOpacity>
                )}
            />
        </View>

        <FlatList 
            data={filtered}
            keyExtractor={item => item.id}
            contentContainerStyle={{padding: 24}}
            renderItem={({item}) => (
                <TouchableOpacity style={styles.card} onPress={() => onSelectDrill(item)}>
                    <View style={styles.iconBox}>
                        <Dumbbell size={20} color={COLORS.primary} />
                    </View>
                    <View style={{flex: 1}}>
                        <Text style={styles.drillName}>{item.name}</Text>
                        <Text style={styles.drillSub}>{item.category} • {item.difficulty}</Text>
                    </View>
                    <Plus size={20} color={COLORS.primary} />
                </TouchableOpacity>
            )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', margin: 24, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  input: { flex: 1, paddingVertical: 12, marginLeft: 8, fontSize: 16 },
  catRow: { paddingLeft: 24, marginBottom: 8, height: 40 },
  catPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#E2E8F0', marginRight: 8 },
  catActive: { backgroundColor: COLORS.primary },
  catText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  catTextActive: { color: '#FFF' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 12, ...SHADOWS.small, borderWidth: 1, borderColor: '#E2E8F0' },
  iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  drillName: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  drillSub: { fontSize: 12, color: '#64748B' },
});