import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, Plus, Calendar, XCircle, Archive, RotateCcw } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { fetchPrograms, updateProgramStatus } from '../services/api';

export default function ProgramsListScreen({ navigation }) {
  const [role, setRole] = useState('PLAYER');
  const [programs, setPrograms] = useState([]);
  const [archivedPrograms, setArchivedPrograms] = useState([]); // ✅ Store archived
  const [viewMode, setViewMode] = useState('ACTIVE'); // ✅ Toggle State: 'ACTIVE' | 'ARCHIVED'
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    setLoading(true);
    try {
        const storedRole = await AsyncStorage.getItem('user_role');
        const currentRole = storedRole ? storedRole.toUpperCase() : 'PLAYER';
        setRole(currentRole);
        
        // 1. Fetch Data
        // NOTE: Ensure your backend fetchPrograms returns ALL programs (or add a query param if backend filters)
        // If backend filters out archived, you might need a new endpoint or param like ?include_archived=true
        const dbPrograms = await fetchPrograms(); 

        // 2. Split into Active vs Archived
        const active = [];
        const archived = [];

        dbPrograms.forEach(p => {
            if (p.status === 'ARCHIVED') {
                archived.push(p);
            } else {
                active.push(p);
            }
        });

        // 3. Sort Active: PENDING first, then by Date
        const sortedActive = active.sort((a, b) => {
            const statusA = (a.status || '').toUpperCase();
            const statusB = (b.status || '').toUpperCase();
            if (statusA === 'PENDING' && statusB !== 'PENDING') return -1;
            if (statusA !== 'PENDING' && statusB === 'PENDING') return 1;
            return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        });

        // 4. Sort Archived: Newest First
        const sortedArchived = archived.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

        setPrograms(sortedActive);
        setArchivedPrograms(sortedArchived);

    } catch(e) {
        console.log("Error loading programs", e);
    } finally {
        setLoading(false);
    }
  };
  
  const handleStatusChange = async (id, newStatus) => {
      try {
          await updateProgramStatus(id, newStatus);
          Alert.alert("Success", newStatus === 'ACTIVE' ? "Program Accepted!" : "Program Declined.");
          loadData(); 
      } catch (e) {
          Alert.alert("Error", "Could not update status. Please try again.");
      }
  };

  const renderItem = ({ item }) => {
    const assignedList = item.assigned_to || [];
    const pendingCount = assignedList.filter(a => a.status === 'PENDING').length;
    const activeCount = assignedList.filter(a => a.status === 'ACTIVE').length;
    const isArchived = item.status === 'ARCHIVED';

    return (
      <TouchableOpacity 
          style={[styles.card, isArchived && styles.archivedCard]}
          onPress={() => navigation.navigate('ProgramDetail', { program: item })}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, isArchived && { backgroundColor: '#F1F5F9' }]}>
              {isArchived ? <Archive size={24} color="#94A3B8" /> : <Calendar size={24} color={COLORS.primary} />}
          </View>
          <View style={{flex: 1}}>
              <Text style={[styles.cardTitle, isArchived && { color: '#64748B' }]}>{item.title}</Text>
              
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
          <View style={[styles.badge, 
              item.status === 'ACTIVE' ? styles.activeBadge : 
              (item.status === 'PENDING' ? styles.pendingBadge : 
              (isArchived ? styles.archivedBadge : styles.declinedBadge))
          ]}>
              <Text style={[styles.badgeText, 
                  item.status === 'ACTIVE' ? styles.activeText : 
                  (item.status === 'PENDING' ? styles.pendingText : 
                  (isArchived ? styles.archivedText : styles.declinedText))
              ]}>
                  {item.status}
              </Text>
          </View>
        </View>

        {/* Action Buttons (Player Only - Pending) */}
        {role === 'PLAYER' && item.status === 'PENDING' && !isArchived && (
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

      {/* ✅ Toggle Filter */}
      <View style={styles.filterContainer}>
          <TouchableOpacity 
            style={[styles.filterBtn, viewMode === 'ACTIVE' && styles.filterBtnActive]} 
            onPress={() => setViewMode('ACTIVE')}
          >
              <Text style={[styles.filterText, viewMode === 'ACTIVE' && styles.filterTextActive]}>Active ({programs.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterBtn, viewMode === 'ARCHIVED' && styles.filterBtnActive]} 
            onPress={() => setViewMode('ARCHIVED')}
          >
              <Text style={[styles.filterText, viewMode === 'ARCHIVED' && styles.filterTextActive]}>Archived ({archivedPrograms.length})</Text>
          </TouchableOpacity>
      </View>

      <FlatList 
        data={viewMode === 'ACTIVE' ? programs : archivedPrograms} 
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
        ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                    {viewMode === 'ACTIVE' ? "No active programs." : "No archived programs."}
                </Text>
            </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 24, backgroundColor: '#FFF' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  
  // ✅ Filter Styles
  filterContainer: { flexDirection: 'row', paddingHorizontal: 24, paddingTop: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  filterBtn: { marginRight: 24, paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  filterBtnActive: { borderBottomColor: COLORS.primary },
  filterText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  filterTextActive: { color: COLORS.primary, fontWeight: '700' },

  card: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 12, ...SHADOWS.small },
  archivedCard: { backgroundColor: '#F1F5F9', opacity: 0.8 }, // Visual cue for archive
  
  cardHeader: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  iconContainer: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', width: '90%' },
  cardSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  
  badge: { position:'absolute', top:0, right:0, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  
  pendingBadge: { backgroundColor: '#FFF7ED' },
  activeBadge: { backgroundColor: '#DCFCE7' },
  declinedBadge: { backgroundColor: '#FEF2F2' },
  archivedBadge: { backgroundColor: '#E2E8F0' }, // Grey badge for archive
  
  badgeText: { fontSize: 9, fontWeight: '700' },
  pendingText: { color: '#C2410C' },
  activeText: { color: '#15803D' },
  declinedText: { color: '#B91C1C' },
  archivedText: { color: '#475569' },

  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 8, gap: 6 },
  acceptBtn: { backgroundColor: COLORS.primary },
  declineBtn: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5' },
  acceptText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  declineText: { color: '#B91C1C', fontWeight: '700', fontSize: 14 },

  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#94A3B8', fontSize: 14, fontStyle: 'italic' }
});