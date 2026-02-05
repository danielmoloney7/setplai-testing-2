import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, ChevronRight, Clock, Dumbbell } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';

// ✅ IMPORT API FUNCTION
import { fetchPrograms } from '../services/api'; 

export default function PlansScreen({ navigation }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  // Reload data whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadPlans();
    }, [])
  );

  const loadPlans = async () => {
    setLoading(true);
    try {
        // 1. Fetch from Database (API)
        // The API already filters for programs assigned to the logged-in user.
        const dbPrograms = await fetchPrograms();
        
        console.log(`Plans Screen: Fetched ${dbPrograms.length} programs`);

        // 2. Sort Logic (Newest First)
        // We use a robust sort that handles missing dates or IDs
        const sorted = dbPrograms.sort((a, b) => {
            const statusA = (a.status || '').toUpperCase();
            const statusB = (b.status || '').toUpperCase();
            
            // Optional: Put PENDING items at the top
            if (statusA === 'PENDING' && statusB !== 'PENDING') return -1;
            if (statusA !== 'PENDING' && statusB === 'PENDING') return 1;
            
            // Sort by Date (Newest first)
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            
            if (dateA !== dateB) return dateB - dateA;
            
            // Fallback to ID
            return (parseInt(b.id) || 0) - (parseInt(a.id) || 0);
        });

        // 3. Update State
        setPlans(sorted);

    } catch (e) {
        console.log("Error loading plans:", e);
    } finally {
        setLoading(false);
    }
  };

  const renderPlanItem = ({ item }) => (
    <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('ProgramDetail', { program: item })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
            <Calendar size={24} color={COLORS.primary} />
        </View>
        <View style={{flex: 1}}>
            <Text style={styles.planTitle}>{item.title}</Text>
            <Text style={styles.planSub}>
                {item.coach_name || 'Self-Guided'} • {item.schedule?.length || 0} Sessions
            </Text>
        </View>
        {/* Optional: Status Badge */}
        {item.status === 'PENDING' && (
             <View style={{backgroundColor: '#FFF7ED', padding:4, borderRadius:4, marginRight:8}}>
                 <Text style={{fontSize:10, color:'#C2410C', fontWeight:'bold'}}>PENDING</Text>
             </View>
        )}
        <ChevronRight size={20} color="#CBD5E1" />
      </View>

      <View style={styles.divider} />

      <View style={styles.cardFooter}>
         <View style={styles.metaItem}>
            <Clock size={14} color="#64748B" />
            <Text style={styles.metaText}>4 Weeks</Text>
         </View>
         <View style={styles.metaItem}>
            <Dumbbell size={14} color="#64748B" />
            <Text style={styles.metaText}>{item.schedule?.length || 0} Drills</Text>
         </View>
         
         <TouchableOpacity 
            style={styles.startBtn}
            onPress={() => navigation.navigate('ProgramDetail', { program: item })}
         >
            <Text style={styles.startBtnText}>View</Text>
         </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Plans</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ProgramBuilder', { squadMode: false })}>
            <Text style={styles.addText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={plans}
        keyExtractor={(item) => item.id.toString()} // Ensure ID is string for Key
        renderItem={renderPlanItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadPlans} tintColor={COLORS.primary} />}
        ListEmptyComponent={
            !loading && (
            <View style={styles.emptyContainer}>
                <View style={styles.emptyIcon}>
                    <Calendar size={40} color="#CBD5E1" />
                </View>
                <Text style={styles.emptyTitle}>No Active Plans</Text>
                <Text style={styles.emptySub}>Create a custom plan with AI or choose from the library to get started.</Text>
                <TouchableOpacity 
                    style={styles.createBtn}
                    onPress={() => navigation.navigate('ProgramBuilder', { squadMode: false })}
                >
                    <Text style={styles.createBtnText}>Create Plan</Text>
                </TouchableOpacity>
            </View>
            )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 20, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0'
  },
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  addText: { fontSize: 16, fontWeight: '700', color: COLORS.primary },

  listContent: { padding: 24, paddingBottom: 100 },

  // Card Styles
  card: { 
    backgroundColor: '#FFF', borderRadius: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.small
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  iconContainer: { 
    width: 48, height: 48, borderRadius: 12, backgroundColor: '#F0FDF4', 
    alignItems: 'center', justifyContent: 'center' 
  },
  planTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  planSub: { fontSize: 12, color: '#64748B' },

  divider: { height: 1, backgroundColor: '#F1F5F9' },

  cardFooter: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingHorizontal: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 16 },
  metaText: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  
  startBtn: { marginLeft: 'auto', backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  startBtnText: { fontSize: 12, fontWeight: '700', color: '#334155' },

  // Empty State
  emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  createBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, ...SHADOWS.medium },
  createBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 }
});