import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, RefreshControl, 
  TouchableOpacity, ActivityIndicator, StatusBar 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Users, Zap, Target, Clock, Dumbbell, Bell, ChevronRight } from 'lucide-react-native';

import { fetchPrograms } from '../services/api'; // ✅ Fetch ALL programs (DB)
import { COLORS, SHADOWS } from '../constants/theme';

export default function DashboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({ name: 'Athlete', role: 'PLAYER' }); 
  const [nextSession, setNextSession] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  // --- DATA LOADING ---
  const loadDashboard = async () => {
    setLoading(true);
    try {
        const role = await AsyncStorage.getItem('user_role'); 
        const name = await AsyncStorage.getItem('user_name');
        // Ensure role is safe
        const safeRole = (role || 'PLAYER').toUpperCase(); 
        
        setUser({ name: name || 'Athlete', role: safeRole });

        if (safeRole === 'PLAYER') {
            // 1. Fetch Programs (API returns all assigned to me)
            const myPrograms = await fetchPrograms(); 
            
            // 2. Count Pending (Case Insensitive Fix)
            const pending = myPrograms.filter(p => 
                (p.status || '').toUpperCase() === 'PENDING'
            );
            setPendingCount(pending.length);

            // 3. Find Active (Case Insensitive Fix)
            const active = myPrograms.filter(p => 
                (p.status || '').toUpperCase() === 'ACTIVE'
            );
            
            console.log(`Dashboard Debug: Found ${active.length} active programs.`);
            calculateNextSession(active);
        }
    } catch (error) {
        console.log("Dashboard Error:", error);
    } finally {
        setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => { loadDashboard(); }, [])
  );

  // --- LOGIC: FIND NEXT SESSION ---
  const calculateNextSession = (activePrograms) => {
      // 1. Safety Check
      if (!activePrograms || activePrograms.length === 0) {
          setNextSession(null);
          return;
      }

      // 2. Sort by Newest First (Robust Date & ID Check)
      const sortedPrograms = activePrograms.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          
          // If dates are different, sort by date
          if (dateB !== dateA) return dateB - dateA;
          
          // Fallback: Sort by ID (assuming higher ID = newer)
          return (parseInt(b.id) || 0) - (parseInt(a.id) || 0);
      });

      const priorityProgram = sortedPrograms[0];
      console.log("Displaying Next Up For:", priorityProgram.title);

      // 3. Get Schedule
      const rawSchedule = priorityProgram.schedule || priorityProgram.sessions || [];
      
      if (rawSchedule.length === 0) {
          setNextSession(null);
          return;
      }

      // 4. Find Day 1 Content
      const firstItem = rawSchedule[0];
      // Group all drills that belong to this day (in case API returns flat list)
      const sessionDrills = rawSchedule.filter(i => i.day_order === firstItem.day_order);
      
      const totalMins = sessionDrills.reduce((sum, d) => sum + (parseInt(d.duration_minutes) || 0), 0);

      setNextSession({
          title: `Day ${firstItem.day_order} Training`, 
          programTitle: priorityProgram.title,
          duration: totalMins > 0 ? totalMins : 45,
          drillCount: sessionDrills.length,
          programId: priorityProgram.id,
          // Pass full object to session screen
          fullSessionData: {
              day_order: firstItem.day_order,
              title: `Day ${firstItem.day_order}`,
              items: sessionDrills
          }
      });
  };

  const getInitials = (n) => n ? n[0].toUpperCase() : 'U';

  // --- RENDERERS ---

  const renderCoachView = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Coach Actions</Text>
      <View style={styles.grid}>
        <TouchableOpacity 
          style={[styles.actionCard, { backgroundColor: COLORS.primary }]}
          onPress={() => navigation.navigate('ProgramBuilder', { squadMode: true })}
        >
          <Plus color="#FFF" size={32} />
          <Text style={[styles.actionText, { color: '#FFF' }]}>Create Plan</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => navigation.navigate('Team')} 
        >
          <Users color={COLORS.secondary} size={32} />
          <Text style={styles.actionText}>My Team</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPlayerView = () => (
    <View style={styles.playerContainer}>
        {/* 1. Pending Invites Notification */}
        {pendingCount > 0 && (
            <TouchableOpacity 
                style={styles.inviteBanner}
                onPress={() => navigation.navigate('Main', { screen: 'Programs' })} 
            >
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                    <View style={styles.notifIcon}><Bell size={20} color="#B45309" /></View>
                    <View>
                        <Text style={styles.inviteTitle}>New Program Assigned</Text>
                        <Text style={styles.inviteSub}>Coach has sent you {pendingCount} new plan(s).</Text>
                    </View>
                </View>
                <ChevronRight size={20} color="#B45309" />
            </TouchableOpacity>
        )}

        {/* 2. Next Up Card */}
        <Text style={[styles.sectionHeader, { paddingHorizontal: 24 }]}>Up Next</Text>
        <View style={{ paddingHorizontal: 24 }}>
          {nextSession ? (
            <TouchableOpacity 
                style={styles.upNextCard} 
                activeOpacity={0.9} 
                onPress={() => navigation.navigate('Session', { 
                    session: nextSession.fullSessionData, 
                    programId: nextSession.programId 
                })}
            >
              <View style={styles.upNextHeader}>
                <View style={styles.tag}><Text style={styles.tagText}>TODAY</Text></View>
                <View style={styles.planBadge}><Text style={styles.planBadgeText}>My Plan</Text></View>
              </View>
              
              <Text style={styles.upNextTitle}>{nextSession.title}</Text>
              <Text style={styles.upNextSubtitle}>{nextSession.programTitle}</Text>
              
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Clock size={14} color="#64748B" />
                  <Text style={styles.metaText}>{nextSession.duration} min</Text>
                </View>
                <View style={styles.metaItem}>
                  <Dumbbell size={14} color="#64748B" />
                  <Text style={styles.metaText}>{nextSession.drillCount} Drills</Text>
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No active plan.</Text>
              <Text style={styles.subText}>Check your invites or create a new plan!</Text>
            </View>
          )}
        </View>

        {/* 3. Quick Start */}
        <Text style={styles.sectionHeader}>Quick Start</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll} contentContainerStyle={{paddingHorizontal: 24}}>
          <TouchableOpacity style={styles.quickCard}>
            <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
              <Zap size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.quickTitle}>Serve Power Up</Text>
            <Text style={styles.quickDesc}>30-min session to boost speed.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard}>
              <View style={[styles.iconBox, { backgroundColor: '#E0F2FE' }]}>
              <Target size={20} color="#0284C7" />
            </View>
            <Text style={styles.quickTitle}>Baseline Drill</Text>
            <Text style={styles.quickDesc}>Improve depth & consistency.</Text>
          </TouchableOpacity>
        </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <View style={styles.headerBlock}>
         <SafeAreaView edges={['top', 'left', 'right']}>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.headerTitle}>{user.role.includes('COACH') ? 'Coach Dashboard' : `Hello, ${user.name}`}</Text>
                <Text style={styles.headerSubtitle}>Let's get to work.</Text>
              </View>
              {user.role.includes('COACH') ? (
                  <TouchableOpacity style={styles.avatarBtn} onPress={() => navigation.navigate('Profile')}>
                      <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
                  </TouchableOpacity>
              ) : (
                  <TouchableOpacity style={styles.iconBtn}>
                      <Bell color="#FFF" size={20} />
                      {pendingCount > 0 && <View style={styles.badgeDot} />}
                  </TouchableOpacity>
              )}
            </View>
         </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadDashboard} />}>
        {loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 50}} /> : 
           (user.role.includes('COACH') ? renderCoachView() : renderPlayerView())
        }
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBlock: { backgroundColor: COLORS.primary, paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, ...SHADOWS.medium },
  headerRow: { paddingHorizontal: 24, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFF' },
  headerSubtitle: { fontSize: 14, color: '#DCFCE7', fontWeight: '600', marginTop: 2 },
  iconBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  badgeDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1, borderColor: COLORS.primary },
  avatarBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', ...SHADOWS.small },
  avatarText: { color: COLORS.primary, fontWeight: '800', fontSize: 16 },
  scrollContent: { paddingVertical: 24, paddingBottom: 100 },
  sectionHeader: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 12, marginTop: 8, paddingHorizontal: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 16 },
  section: { marginBottom: 24, paddingHorizontal: 24 },
  inviteBanner: { backgroundColor: '#FFF7ED', marginHorizontal: 24, marginBottom: 24, padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#FED7AA' },
  notifIcon: { width: 40, height: 40, backgroundColor: '#FFEDD5', borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  inviteTitle: { fontSize: 15, fontWeight: '700', color: '#9A3412' },
  inviteSub: { fontSize: 13, color: '#C2410C' },
  horizontalScroll: { marginBottom: 24, marginHorizontal: 0 },
  quickCard: { backgroundColor: '#FFF', width: 160, padding: 16, borderRadius: 16, marginRight: 12, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.small },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  quickTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  quickDesc: { fontSize: 12, color: '#64748B', lineHeight: 16 },
  upNextCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.medium },
  upNextHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  tag: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tagText: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
  planBadge: { backgroundColor: '#DBEAFE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  planBadgeText: { fontSize: 11, fontWeight: '700', color: '#2563EB' },
  upNextTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 6 },
  upNextSubtitle: { fontSize: 14, color: '#64748B', marginBottom: 16 },
  metaRow: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: '#475569', fontWeight: '500' },
  emptyCard: { padding: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, borderStyle: 'dashed' },
  emptyText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
  subText: { color: '#CBD5E1', fontSize: 12, marginTop: 4 },
  grid: { flexDirection: 'row', gap: 16 },
  actionCard: { flex: 1, backgroundColor: '#FFF', padding: 24, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 12, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.card },
  actionText: { fontWeight: 'bold', fontSize: 16, color: '#334155' },
});