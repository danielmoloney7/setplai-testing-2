import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, RefreshControl, ScrollView, ActivityIndicator, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, ChevronRight, Clock, Dumbbell, User, CheckCircle, Plus, XCircle, Check } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { fetchPrograms, fetchSessionLogs, updateProgramStatus } from '../services/api'; 

export default function PlansScreen({ navigation }) {
  const [activePlans, setActivePlans] = useState([]);
  const [completedPlans, setCompletedPlans] = useState([]);
  const [pendingPlans, setPendingPlans] = useState([]); // ✅ NEW: Track Pending Separately
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
        const [dbPrograms, dbLogs] = await Promise.all([
            fetchPrograms(),
            fetchSessionLogs()
        ]);
        
        const active = [];
        const completed = [];
        const pending = [];

        dbPrograms.forEach(program => {
            const schedule = program.schedule || [];
            const uniqueScheduleDays = new Set(schedule.map(s => s.day_order));
            const totalSessions = uniqueScheduleDays.size;

            const uniqueCompletedSessions = new Set(
                dbLogs.filter(l => l.program_id === program.id).map(l => l.session_id)
            );
            const completedCount = uniqueCompletedSessions.size;
            const progress = totalSessions > 0 ? (completedCount / totalSessions) * 100 : 0;
            const isFinished = totalSessions > 0 && completedCount >= totalSessions;

            const enriched = { 
                ...program, 
                progress, 
                completedCount, 
                totalSessions,
                isCoachAssigned: program.coach_name && 
                                 program.coach_name !== 'System' && 
                                 program.coach_name !== 'Self-Guided'
            };

            // ✅ Categorize Logic
            if (program.status === 'PENDING') {
                pending.push(enriched);
            } else if (isFinished || program.status === 'ARCHIVED' || program.status === 'DECLINED') {
                if (program.status !== 'DECLINED') completed.push(enriched);
            } else {
                active.push(enriched);
            }
        });

        const sortFn = (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0);
        
        setPendingPlans(pending.sort(sortFn));
        setActivePlans(active.sort(sortFn));
        setCompletedPlans(completed.sort(sortFn));

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

  // ✅ NEW: Handle Accept/Decline
  const handleStatusChange = async (programId, newStatus) => {
      try {
          await updateProgramStatus(programId, newStatus);
          Alert.alert("Success", newStatus === 'ACTIVE' ? "Program Accepted!" : "Program Declined.");
          loadData(); // Reload to move the card
      } catch (e) {
          Alert.alert("Error", "Could not update status.");
      }
  };

  const renderPlanCard = (item, isCompleted = false) => (
    <TouchableOpacity 
        key={item.id}
        style={[styles.card, isCompleted && styles.completedCard, item.status === 'PENDING' && styles.pendingCard]}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('ProgramDetail', { program: item })}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, isCompleted && { backgroundColor: '#F1F5F9' }]}>
            {isCompleted ? <CheckCircle size={24} color="#64748B" /> : <Calendar size={24} color={COLORS.primary} />}
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
                        <Text style={styles.playerBadgeText}>SELF</Text>
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

      {/* ✅ NEW: Action Buttons for Pending */}
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
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Plans</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* PENDING SECTION */}
        {pendingPlans.length > 0 && (
            <>
                <Text style={[styles.sectionHeader, {color: '#EA580C'}]}>PENDING INVITES ({pendingPlans.length})</Text>
                {pendingPlans.map(p => renderPlanCard(p))}
            </>
        )}

        <Text style={styles.sectionHeader}>ACTIVE ({activePlans.length})</Text>
        {activePlans.length > 0 ? (
            activePlans.map(p => renderPlanCard(p))
        ) : (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No active plans.</Text>
            </View>
        )}

        {completedPlans.length > 0 && (
            <>
                <Text style={[styles.sectionHeader, { marginTop: 24 }]}>COMPLETED ({completedPlans.length})</Text>
                {completedPlans.map(p => renderPlanCard(p, true))}
            </>
        )}
      </ScrollView>

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('ProgramBuilder', { squadMode: false })}
      >
        <Plus size={32} color="#FFF" />
      </TouchableOpacity>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 24, paddingVertical: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  scrollContent: { padding: 24, paddingBottom: 100 },
  sectionHeader: { fontSize: 12, fontWeight: '700', color: '#94A3B8', marginBottom: 12, letterSpacing: 0.5 },
  card: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.small, padding: 16 },
  completedCard: { backgroundColor: '#F8FAFC', opacity: 0.7 },
  pendingCard: { borderColor: '#FED7AA', backgroundColor: '#FFF7ED' },
  cardHeader: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  iconContainer: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  planTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', flex: 1, marginRight: 8 },
  planSub: { fontSize: 13, color: '#64748B' },
  coachBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#7C3AED', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  coachBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFF' },
  playerBadge: { backgroundColor: '#E0F2FE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  playerBadgeText: { fontSize: 10, fontWeight: '800', color: '#0284C7' },
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
  emptyContainer: { alignItems: 'center', padding: 30, borderStyle: 'dashed', borderWidth: 2, borderColor: '#E2E8F0', borderRadius: 16, marginTop: 10 },
  emptyText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
  fab: { position: 'absolute', bottom: 32, alignSelf: 'center', width: 64, height: 64, borderRadius: 32, backgroundColor: '#15803D', alignItems: 'center', justifyContent: 'center', elevation: 8 },

  // ✅ Pending Action Styles
  pendingActions: { flexDirection: 'row', gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#FDBA74' },
  acceptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#DCFCE7', padding: 10, borderRadius: 8 },
  acceptText: { color: '#16A34A', fontWeight: '700', fontSize: 13 },
  declineBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FEE2E2', padding: 10, borderRadius: 8 },
  declineText: { color: '#DC2626', fontWeight: '700', fontSize: 13 }
});