import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, Plus, Calendar, XCircle } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { fetchPrograms, updateProgramStatus } from '../services/api';

export default function ProgramsListScreen({ navigation }) {
  const [role, setRole] = useState('PLAYER');
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Reload data every time screen comes into focus
  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    setLoading(true);
    try {
        const storedRole = await AsyncStorage.getItem('user_role');
        const currentRole = storedRole ? storedRole.toUpperCase() : 'PLAYER';
        setRole(currentRole);
        
        // 1. Fetch Data
        const dbPrograms = await fetchPrograms(); 

        // 2. Sort: PENDING first, then by Date
        const sorted = dbPrograms.sort((a, b) => {
            const statusA = (a.status || '').toUpperCase();
            const statusB = (b.status || '').toUpperCase();
            
            if (statusA === 'PENDING' && statusB !== 'PENDING') return -1;
            if (statusA !== 'PENDING' && statusB === 'PENDING') return 1;
            
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return dateB - dateA; // Newest first
        });

        setPrograms(sorted);
    } catch(e) {
        console.log("Error loading programs", e);
    } finally {
        setLoading(false);
    }
  };
  
  const handleStatusChange = async (id, newStatus) => {
      try {
          // 1. Call API
          await updateProgramStatus(id, newStatus);
          
          // 2. Alert User
          Alert.alert("Success", newStatus === 'ACTIVE' ? "Program Accepted!" : "Program Declined.");
          
          // 3. ✅ IMMEDIATE REFRESH: Update list to remove buttons/update status text
          loadData(); 
      } catch (e) {
          Alert.alert("Error", "Could not update status. Please try again.");
      }
  };

  const renderItem = ({ item }) => {
    // ✅ Calculate Pending Count
    const assignedList = item.assigned_to || [];
    const pendingCount = assignedList.filter(a => a.status === 'PENDING').length;
    const activeCount = assignedList.filter(a => a.status === 'ACTIVE').length;

    return (
      <TouchableOpacity 
          style={styles.card}
          onPress={() => navigation.navigate('ProgramDetail', { program: item })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}><Calendar size={24} color={COLORS.primary} /></View>
          <View style={{flex: 1}}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              
              {/* ✅ New Status Logic for Coach */}
              <Text style={styles.cardSub}>
                  {role === 'COACH' ? (
                      pendingCount > 0 
                      ? <Text style={{color: '#EA580C', fontWeight: 'bold'}}>{pendingCount} Pending Invite(s)</Text> 
                      : `${activeCount} Active Athletes`
                  ) : (
                      item.coach_name || 'Coach'
                  )}
              </Text>
          </View>
          
          {/* Status Badge */}
          <View style={[styles.badge, item.status === 'ACTIVE' ? styles.activeBadge : (item.status === 'PENDING' ? styles.pendingBadge : styles.declinedBadge)]}>
              <Text style={[styles.badgeText, item.status === 'ACTIVE' ? styles.activeText : (item.status === 'PENDING' ? styles.pendingText : styles.declinedText)]}>
                  {item.status}
              </Text>
          </View>
        </View>

        {/* Action Buttons (Player Only) */}
        {role === 'PLAYER' && item.status === 'PENDING' && (
            <View style={styles.actionsRow}>
                <TouchableOpacity 
                    style={[styles.actionBtn, styles.declineBtn]} 
                    onPress={() => handleStatusChange(item.id, 'DECLINED')}
                >
                    <XCircle size={16} color="#B91C1C" />
                    <Text style={styles.declineText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.actionBtn, styles.acceptBtn]} 
                    onPress={() => handleStatusChange(item.id, 'ACTIVE')}
                >
                    <CheckCircle size={16} color="#FFF" />
                    <Text style={styles.acceptText}>Accept</Text>
                </TouchableOpacity>
            </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{role === 'COACH' ? 'Team Programs' : 'My Plans'}</Text>
        {role === 'COACH' && (
            <TouchableOpacity onPress={() => navigation.navigate('ProgramBuilder', { squadMode: true })}>
                <Plus size={28} color={COLORS.primary} />
            </TouchableOpacity>
        )}
      </View>
      <FlatList 
        data={programs} 
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
        ListEmptyComponent={<Text style={{textAlign:'center', marginTop:50, color:'#94A3B8'}}>No programs found.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 24, backgroundColor: '#FFF' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  card: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 12, ...SHADOWS.small },
  cardHeader: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  iconContainer: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', width: '90%' },
  cardSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  badge: { position:'absolute', top:0, right:0, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  
  pendingBadge: { backgroundColor: '#FFF7ED' },
  activeBadge: { backgroundColor: '#DCFCE7' },
  declinedBadge: { backgroundColor: '#FEF2F2' },
  
  badgeText: { fontSize: 9, fontWeight: '700' },
  pendingText: { color: '#C2410C' },
  activeText: { color: '#15803D' },
  declinedText: { color: '#B91C1C' },

  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 8, gap: 6 },
  acceptBtn: { backgroundColor: COLORS.primary },
  declineBtn: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5' },
  acceptText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  declineText: { color: '#B91C1C', fontWeight: '700', fontSize: 14 }
});