import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Dumbbell, Users, Calendar, Grid, ChevronLeft } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';

export default function CoachActionScreen({ navigation }) {
  const menuItems = [
    { id: 'drill', title: 'New Drill', icon: Dumbbell, path: 'Drills', desc: 'Add a drill to library', modal: true },
    { id: 'squad', title: 'New Squad', icon: Users, path: 'Team', desc: 'Create a training group', modal: true },
    { id: 'program', title: 'New Program', icon: Calendar, path: 'ProgramBuilder', desc: 'Build a training plan' },
    { id: 'squad_program', title: 'Squad Program', icon: Grid, path: 'ProgramBuilder', desc: 'Plan for specific numbers & courts' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <ChevronLeft size={24} color="#64748B" />
            </TouchableOpacity>
            <Text style={styles.title}>Create New</Text>
        </View>

        {/* Grid Content */}
        <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.grid}>
                {menuItems.map(item => (
                    <TouchableOpacity 
                        key={item.id} 
                        style={styles.card}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate(item.path, { openModal: item.modal, squadMode: item.id === 'squad_program' })}
                    >
                        {/* Icon Box */}
                        <View style={styles.iconBox}>
                            <item.icon size={28} color={COLORS.primary} />
                        </View>
                        
                        {/* Text Content */}
                        <View style={styles.textContainer}>
                            <Text style={styles.cardTitle}>{item.title}</Text>
                            <Text style={styles.cardDesc}>{item.desc}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ✅ FIX: Light Background
  container: { flex: 1, backgroundColor: '#F8FAFC' }, 
  
  header: { 
    paddingHorizontal: 24, paddingVertical: 16, 
    flexDirection: 'row', alignItems: 'center', gap: 16,
    // No border needed for cleaner look, or very subtle
    borderBottomWidth: 0 
  },
  // ✅ FIX: Dark Title Text
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  backBtn: { padding: 4 },

  scrollContent: { padding: 24 },
  
  grid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between',
    gap: 16 
  },

  // ✅ FIX: White Cards with Shadow
  card: { 
    width: '47%', 
    backgroundColor: '#FFFFFF', 
    padding: 20, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: '#E2E8F0',
    alignItems: 'flex-start',
    minHeight: 160, 
    ...SHADOWS.small // Subtle shadow for pop
  },

  iconBox: { 
    width: 50, height: 50, 
    borderRadius: 14, 
    backgroundColor: '#F0FDF4', // Very light green background
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16
  },

  textContainer: { flex: 1 },
  // ✅ FIX: Dark Text for Readability
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  cardDesc: { fontSize: 12, color: '#64748B', lineHeight: 18 }
});