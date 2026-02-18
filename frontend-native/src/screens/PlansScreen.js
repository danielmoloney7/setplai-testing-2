import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, RefreshControl, FlatList, ActivityIndicator, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, ChevronRight, Clock, Dumbbell, User, CheckCircle, Plus, XCircle, Archive, Inbox } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { fetchPrograms, fetchSessionLogs, updateProgramStatus } from '../services/api'; 

export default function PlansScreen({ navigation }) {
  // ✅ 1. Added 'archivedPlans' state
  const [activePlans, setActivePlans] = useState([]);
  const [completedPlans, setCompletedPlans] = useState([]);
  const [pendingPlans, setPendingPlans] = useState([]); 
  const [archivedPlans, setArchivedPlans] = useState([]); 
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('ACTIVE'); // 'ACTIVE', 'COMPLETED', 'ARCHIVED'

  const loadData = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
        const userId = await AsyncStorage.getItem('user_id');

        const [dbPrograms, dbLogs] = await Promise.all([
            fetchPrograms(),
            fetchSessionLogs()
        ]);
        
        const active = [];
        const completed = [];
        const pending = [];
        const archived = []; // ✅ New Array

        dbPrograms.forEach(program => {
            const schedule = program.schedule || [];
            const uniqueScheduleDays = new Set(schedule.map(s => s.day_order));
            const totalSessions = uniqueScheduleDays.size;

            const uniqueCompletedSessions = new Set(
                dbLogs.filter(l => l.program_id === program.id).map(l => l.session_id)
            );
            const completedCount = uniqueCompletedSessions.size;
            const progress = totalSessions > 0 ? (completedCount / totalSessions) * 100 : 0;
            
            // Auto-detect completion if they finished all sessions
            const isFinished = totalSessions > 0 && completedCount >= totalSessions;

            const isCoachAssigned = program.creator_id && program.creator_id !== userId;

            const enriched = { 
                ...program, 
                progress, 
                completedCount, 
                totalSessions,
                isCoachAssigned 
            };

            // ✅ 2. FIX LOGIC: Strict separation
            if (program.status === 'ARCHIVED') {
                archived.push(enriched);
            } else if (program.status === 'PENDING') {
                pending.push(enriched);
            } else if (program.status === 'DECLINED') {
                // Do nothing (or add to archive if you prefer)
            } else if (isFinished || program.status === 'COMPLETED') {
                completed.push(enriched);
            } else {
                active.push(enriched);
            }
        });

        const sortFn = (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0);
        
        setPendingPlans(pending.sort(sortFn));
        setActivePlans(active.sort(sortFn));
        setCompletedPlans(completed.sort(sortFn));
        setArchivedPlans(archived.sort(sortFn));

    } catch (e) {
        console.log("Error loading plans:", e);
    } finally {
        setLoading(false);
        setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const handleStatusChange = async (programId, newStatus) => {
      try {
          await updateProgramStatus(programId, newStatus);
          Alert.alert("Success", newStatus === 'ACTIVE' ? "Program Accepted!" : "Program Declined.");
          loadData(); 
      } catch (e) {
          Alert.alert("Error", "Could not update status.");
      }
  };

  const renderPlanCard = ({ item }) => {
    // If we are in Archive tab, show as gray/completed style
    const isCompleted = activeTab === 'COMPLETED' || activeTab === 'ARCHIVED'; 
    
    return (
    <TouchableOpacity 
        style={[styles.card, isCompleted && styles.completedCard, item.status === 'PENDING' && styles.pendingCard]}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('ProgramDetail', { program: item })}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, isCompleted && { backgroundColor: '#F1F5F9' }]}>
            {activeTab === 'ARCHIVED' ? <Archive size={24} color="#64748B" /> : 
             isCompleted ? <CheckCircle size={24} color="#64748B" /> : 
             <Calendar size={24} color={COLORS.primary} />}
        </View>

        <View style={{flex: 1}}>
            <View style={styles.titleRow}>
                <Text style={[styles.planTitle, isCompleted && { color: '#64748B' }]} numberOfLines={1}>
                    {item.title}
                </Text>
                
                {item.status === 'PENDING' ? (
                     <View style={styles.pendingBadge}><Text style={styles.pendingText}>PENDING</Text></View>
                ) : item.isCoachAssigned ? (
                    <View style={styles.coachBadge}>
                        <User size={10} color="#FFF" style={{marginRight: 4}}/>
                        <Text style={styles.coachBadgeText}>COACH</Text>
                    </View>
                ) : !isCompleted && (
                    <View style={styles.playerBadge}>
                        <Text style={styles.playerBadgeText}>PLAYER</Text>
                    </View>
                )}
            </View>

            <Text style={styles.planSub}>
                {item.completedCount} / {item.totalSessions} Sessions
            </Text>
        </View>
      </View>

      {!isCompleted && item.status === 'ACTIVE' && (
          <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${Math.min(item.progress, 100)}%` }]} />
              </View>
              <Text style={styles.progressText}>{Math.round(item.progress)}%</Text>
          </View>
      )}

      {item.status === 'PENDING' && (
          <View style={styles.pendingActions}>
              <TouchableOpacity style={styles.declineBtn} onPress={() => handleStatusChange(item.id, 'DECLINED')}>
                  <XCircle size={16} color="#DC2626" />
                  <Text style={styles.declineText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.acceptBtn} onPress={() => handleStatusChange(item.id, 'ACTIVE')}>
                  <CheckCircle size={16} color="#16A34A" />
                  <Text style={styles.acceptText}>Accept</Text>
              </TouchableOpacity>
          </View>
      )}

      {item.status !== 'PENDING' && (
        <>
            <View style={styles.divider} />
            <View style={styles.cardFooter}>
                <View style={styles.metaItem}>
                    <Clock size={14} color="#94A3B8" />
                    <Text style={styles.metaText}>{item.totalSessions} Sessions</Text>
                </View>
                <View style={styles.metaItem}>
                    <Dumbbell size={14} color="#94A3B8" />
                    <Text style={styles.metaText}>{item.schedule?.length || 0} Drills</Text>
                </View>
                <ChevronRight size={16} color="#94A3B8" style={{marginLeft: 'auto'}} />
            </View>
        </>
      )}
    </TouchableOpacity>
  )};

  // ✅ Helper to get data based on active Tab
  const getDisplayData = () => {
      switch(activeTab) {
          case 'ACTIVE': return [...pendingPlans, ...activePlans]; // Show Pending at top of Active
          case 'COMPLETED': return completedPlans;
          case 'ARCHIVED': return archivedPlans;
          default: return [];
      }
  };

  const displayData = getDisplayData();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Plans</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('ProgramBuilder', { squadMode: false })}>
            <Plus size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* ✅ 3. Tab Switcher */}
      <View style={styles.tabContainer}>
          {['ACTIVE', 'COMPLETED', 'ARCHIVED'].map(tab => (
              <TouchableOpacity 
                key={tab} 
                style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]} 
                onPress={() => setActiveTab(tab)}
              >
                  <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                      {tab === 'ACTIVE' ? 'Active' : tab === 'COMPLETED' ? 'Done' : 'Archive'}
                  </Text>
              </TouchableOpacity>
          ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList
            data={displayData}
            renderItem={renderPlanCard}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
            ListEmptyComponent={
                <View style={styles.emptyContainer}>
                    <Inbox size={48} color="#CBD5E1" />
                    <Text style={styles.emptyText}>
                        {activeTab === 'ACTIVE' ? "No active plans." : 
                         activeTab === 'COMPLETED' ? "No completed plans yet." : 
                         "Archive is empty."}
                    </Text>
                </View>
            }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 24, paddingVertical: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  createBtn: { padding: 8, backgroundColor: '#E0F2FE', borderRadius: 8 },
  
  // Tabs
  tabContainer: { flexDirection: 'row', padding: 4, margin: 24, marginBottom: 12, backgroundColor: '#E2E8F0', borderRadius: 12 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabBtnActive: { backgroundColor: '#FFF', shadowColor: "#000", shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  tabTextActive: { color: '#0F172A', fontWeight: '700' },

  scrollContent: { paddingHorizontal: 24, paddingBottom: 100, paddingTop: 12 },
  card: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.small, padding: 16 },
  completedCard: { backgroundColor: '#F8FAFC', opacity: 0.8 },
  pendingCard: { borderColor: '#FED7AA', backgroundColor: '#FFF7ED' },
  cardHeader: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  iconContainer: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  planTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', flex: 1, marginRight: 8 },
  planSub: { fontSize: 13, color: '#64748B' },
  
  coachBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#7C3AED', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  coachBadgeText: { fontSize: 9, fontWeight: '800', color: '#FFF' },
  playerBadge: { backgroundColor: '#E0F2FE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  playerBadgeText: { fontSize: 9, fontWeight: '800', color: '#0284C7' },
  pendingBadge: { backgroundColor: '#FFEDD5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  pendingText: { fontSize: 10, fontWeight: '800', color: '#C2410C' },
  
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  progressBarBg: { flex: 1, height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  progressText: { fontSize: 12, fontWeight: '700', color: '#0F172A', width: 35, textAlign: 'right' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 12 },
  cardFooter: { flexDirection: 'row', alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 16 },
  metaText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyContainer: { alignItems: 'center', padding: 30, marginTop: 40 },
  emptyText: { color: '#94A3B8', fontSize: 14, fontWeight: '600', marginTop: 12 },
  
  pendingActions: { flexDirection: 'row', gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#FDBA74' },
  acceptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#DCFCE7', padding: 10, borderRadius: 8 },
  acceptText: { color: '#16A34A', fontWeight: '700', fontSize: 13 },
  declineBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FEE2E2', padding: 10, borderRadius: 8 },
  declineText: { color: '#DC2626', fontWeight: '700', fontSize: 13 }
});