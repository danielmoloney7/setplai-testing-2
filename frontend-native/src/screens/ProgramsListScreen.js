import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, Plus, Calendar, XCircle, Archive, RotateCcw, Inbox } from 'lucide-react-native'; // ✅ Added Inbox
import { COLORS, SHADOWS } from '../constants/theme';
import { fetchPrograms, fetchSessionLogs, updateProgramStatus } from '../services/api'; // ✅ Added fetchSessionLogs

export default function ProgramsListScreen({ navigation }) {
  const [role, setRole] = useState('COACH');
  const [programs, setPrograms] = useState([]);
  const [completedPrograms, setCompletedPrograms] = useState([]); // ✅ Added specific Completed state
  const [archivedPrograms, setArchivedPrograms] = useState([]); 
  const [viewMode, setViewMode] = useState('ACTIVE'); 
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async (isPullToRefresh = false) => {
    if (isPullToRefresh) setIsRefreshing(true);
    
    try {
        const storedRole = await AsyncStorage.getItem('user_role');
        const currentRole = storedRole ? storedRole.toUpperCase() : 'COACH';
        setRole(currentRole);
        
        // ✅ Fetch both programs AND logs so Coach can auto-detect completed squad sessions
        const [dbPrograms, dbLogs] = await Promise.all([
            fetchPrograms(),
            fetchSessionLogs() 
        ]);

        const active = [];
        const completed = [];
        const archived = [];

        dbPrograms.forEach(p => {
            let pStatus = (p.status || '').toUpperCase();
            let isFinished = false;

            // ✅ AUTO-DETECT COMPLETED SQUAD SESSIONS
            if (p.program_type === 'SQUAD_SESSION') {
                const schedule = p.schedule || [];
                const totalSessions = new Set(schedule.map(s => s.day_order)).size;
                const uniqueCompletedSessions = new Set(
                    dbLogs.filter(l => l.program_id === p.id).map(l => l.session_id)
                );
                isFinished = (totalSessions > 0 && uniqueCompletedSessions.size >= totalSessions);
            }

            if (isFinished && pStatus !== 'ARCHIVED') {
                pStatus = 'COMPLETED'; // Force status to completed
            }

            // Derive specific status for player plans
            if (pStatus !== 'COMPLETED' && pStatus !== 'ARCHIVED' && p.program_type !== 'SQUAD_SESSION') {
                const assignedList = p.assigned_to || [];
                const pendingCount = assignedList.filter(a => a.status === 'PENDING').length;
                if (assignedList.length > 0 && pendingCount > 0) {
                    pStatus = 'PENDING';
                } else {
                    pStatus = 'ACTIVE';
                }
            }

            p.displayStatus = pStatus; // Store it cleanly for the UI

            // Bucket them properly
            if (pStatus === 'ARCHIVED') {
                archived.push(p);
            } else if (pStatus === 'COMPLETED') {
                completed.push(p);
            } else {
                active.push(p);
            }
        });

        // Sort Active: PENDING first, then by Date
        const sortedActive = active.sort((a, b) => {
            if (a.displayStatus === 'PENDING' && b.displayStatus !== 'PENDING') return -1;
            if (a.displayStatus !== 'PENDING' && b.displayStatus === 'PENDING') return 1;
            return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        });

        const sortedCompleted = completed.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        const sortedArchived = archived.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

        setPrograms(sortedActive);
        setCompletedPrograms(sortedCompleted);
        setArchivedPrograms(sortedArchived);

    } catch(e) {
        console.log("Error loading programs", e);
    } finally {
        setLoading(false);
        setIsRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const renderItem = ({ item }) => {
    const assignedList = item.assigned_to || [];
    const pendingCount = assignedList.filter(a => a.status === 'PENDING').length;
    const activeCount = assignedList.filter(a => a.status === 'ACTIVE').length;
    
    const displayStatus = item.displayStatus;
    const isArchived = displayStatus === 'ARCHIVED' || displayStatus === 'COMPLETED';

    return (
      <TouchableOpacity 
          style={[styles.card, isArchived && styles.archivedCard]}
          onPress={() => navigation.navigate('ProgramDetail', { program: item })}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, isArchived && { backgroundColor: '#F1F5F9' }]}>
              {displayStatus === 'ARCHIVED' ? <Archive size={24} color="#94A3B8" /> : 
               displayStatus === 'COMPLETED' ? <CheckCircle size={24} color="#64748B" /> : 
               <Calendar size={24} color={COLORS.primary} />}
          </View>
          <View style={{flex: 1}}>
              <Text style={[styles.cardTitle, isArchived && { color: '#64748B' }]} numberOfLines={1}>{item.title}</Text>
              
              <Text style={styles.cardSub}>
                  {item.program_type === 'SQUAD_SESSION' 
                      ? 'Squad Training' 
                      : (pendingCount > 0 
                          ? <Text style={{color: '#EA580C', fontWeight: 'bold'}}>{pendingCount} Pending Invite(s)</Text> 
                          : `${activeCount} Active Athletes`
                      )
                  }
              </Text>
          </View>
          
          <View style={[styles.badge, 
              displayStatus === 'ACTIVE' ? styles.activeBadge : 
              (displayStatus === 'PENDING' ? styles.pendingBadge : 
              (isArchived ? styles.archivedBadge : styles.declinedBadge))
          ]}>
              <Text style={[styles.badgeText, 
                  displayStatus === 'ACTIVE' ? styles.activeText : 
                  (displayStatus === 'PENDING' ? styles.pendingText : 
                  (isArchived ? styles.archivedText : styles.declinedText))
              ]}>
                  {displayStatus}
              </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Team Programs</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ProgramBuilder', { squadMode: true })}>
            <Plus size={28} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* ✅ Tabs exactly matching Plans Screen with Brackets */}
      <View style={styles.filterContainer}>
          {['ACTIVE', 'COMPLETED', 'ARCHIVED'].map(mode => {
              let count = 0;
              let label = '';
              
              if (mode === 'ACTIVE') { count = programs.length; label = 'Active'; }
              else if (mode === 'COMPLETED') { count = completedPrograms.length; label = 'Done'; }
              else { count = archivedPrograms.length; label = 'Archived'; }

              return (
                  <TouchableOpacity 
                    key={mode}
                    style={[styles.filterBtn, viewMode === mode && styles.filterBtnActive]} 
                    onPress={() => setViewMode(mode)}
                  >
                      <Text style={[styles.filterText, viewMode === mode && styles.filterTextActive]}>
                          {`${label} (${count})`}
                      </Text>
                  </TouchableOpacity>
              )
          })}
      </View>

      <FlatList 
        data={viewMode === 'ACTIVE' ? programs : viewMode === 'COMPLETED' ? completedPrograms : archivedPrograms} 
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
        refreshing={isRefreshing} 
        onRefresh={() => loadData(true)}
        ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Inbox size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>
                    {viewMode === 'ACTIVE' ? "No active programs." : 
                     viewMode === 'COMPLETED' ? "No completed programs." : 
                     "No archived programs."}
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
  
  filterContainer: { flexDirection: 'row', paddingHorizontal: 24, paddingTop: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  // Reduced margin to fit all 3 tabs cleanly
  filterBtn: { marginRight: 16, paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  filterBtnActive: { borderBottomColor: COLORS.primary },
  filterText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  filterTextActive: { color: COLORS.primary, fontWeight: '700' },

  card: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 12, ...SHADOWS.small },
  archivedCard: { backgroundColor: '#F8FAFC', opacity: 0.8 }, 
  
  cardHeader: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  iconContainer: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', flex: 1, paddingRight: 4 },
  cardSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  
  badge: { position:'absolute', top:0, right:0, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  
  pendingBadge: { backgroundColor: '#FFF7ED' },
  activeBadge: { backgroundColor: '#DCFCE7' },
  declinedBadge: { backgroundColor: '#FEF2F2' },
  archivedBadge: { backgroundColor: '#E2E8F0' }, 
  
  badgeText: { fontSize: 9, fontWeight: '700' },
  pendingText: { color: '#C2410C' },
  activeText: { color: '#15803D' },
  declinedText: { color: '#B91C1C' },
  archivedText: { color: '#475569' },

  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#94A3B8', fontSize: 14, fontWeight: '600', marginTop: 12 }
});