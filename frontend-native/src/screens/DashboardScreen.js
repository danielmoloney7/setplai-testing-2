import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, RefreshControl, 
  TouchableOpacity, ActivityIndicator, StatusBar 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Users, Zap, Target, Clock, Dumbbell, Bell, ChevronRight, PlayCircle, ClipboardList } from 'lucide-react-native';

import { fetchPrograms, fetchSessionLogs } from '../services/api'; 
import { COLORS, SHADOWS } from '../constants/theme';

export default function DashboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({ name: 'Athlete', role: 'PLAYER' }); 
  
  // ✅ CHANGED: Now an array to hold multiple sessions
  const [upNextSessions, setUpNextSessions] = useState([]); 
  const [pendingCount, setPendingCount] = useState(0);

  // --- DATA LOADING ---
  const loadDashboard = async () => {
    setLoading(true);
    try {
        const role = await AsyncStorage.getItem('user_role'); 
        const name = await AsyncStorage.getItem('user_name');
        const safeRole = (role || 'PLAYER').toUpperCase(); 
        
        setUser({ name: name || 'Athlete', role: safeRole });

        if (safeRole === 'PLAYER') {
            // 1. Fetch Programs AND Logs in parallel
            const [myPrograms, myLogs] = await Promise.all([
                fetchPrograms(),
                fetchSessionLogs()
            ]); 
            
            // 2. Count Pending
            const pending = myPrograms.filter(p => 
                (p.status || '').toUpperCase() === 'PENDING'
            );
            setPendingCount(pending.length);

            // 3. Find Active
            const active = myPrograms.filter(p => 
                (p.status || '').toUpperCase() === 'ACTIVE'
            );
            
            console.log(`Dashboard Debug: Found ${active.length} active programs.`);
            
            // ✅ CHANGED: Calculate for ALL active programs
            calculateNextSessions(active, myLogs);
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

  // --- LOGIC: FIND NEXT SESSIONS (ALL PROGRAMS) ---
  const calculateNextSessions = (activePrograms, logs) => {
      if (!activePrograms || activePrograms.length === 0) {
          setUpNextSessions([]);
          return;
      }

      // Sort by Newest First
      const sortedPrograms = activePrograms.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          if (dateB !== dateA) return dateB - dateA;
          return (parseInt(b.id) || 0) - (parseInt(a.id) || 0);
      });

      const upcoming = [];

      // ✅ Loop through ALL active programs
      sortedPrograms.forEach(program => {
          const rawSchedule = program.schedule || program.sessions || [];
          if (rawSchedule.length === 0) return;

          // 1. Check Logs for Completed Days for THIS program
          const completedDays = logs
              .filter(log => log.program_id === program.id)
              .map(log => log.session_id);

          // 2. Find first incomplete day
          const nextDrill = rawSchedule.find(item => !completedDays.includes(item.day_order));

          // 3. If found, add to list
          if (nextDrill) {
              const nextDayNum = nextDrill.day_order;
              const sessionDrills = rawSchedule.filter(i => i.day_order === nextDayNum);
              const totalMins = sessionDrills.reduce((sum, d) => sum + (parseInt(d.duration_minutes) || 0), 0);

              upcoming.push({
                  uniqueId: `${program.id}_day_${nextDayNum}`, // React key
                  title: `Day ${nextDayNum} Training`, 
                  programTitle: program.title,
                  duration: totalMins > 0 ? totalMins : 45,
                  drillCount: sessionDrills.length,
                  programId: program.id,
                  fullSessionData: {
                      day_order: nextDayNum,
                      title: `Day ${nextDayNum}`,
                      items: sessionDrills,
                      totalMinutes: totalMins
                  }
              });
          }
      });

      setUpNextSessions(upcoming);
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
        {/* 0. Assessment Call-to-Action */}
        <TouchableOpacity 
            style={[styles.inviteBanner, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}
            onPress={() => navigation.navigate('Assessment')}
        >
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                <View style={[styles.notifIcon, { backgroundColor: '#E0F2FE' }]}>
                    <ClipboardList size={20} color="#0284C7" />
                </View>
                <View>
                    <Text style={[styles.inviteTitle, { color: '#0369A1' }]}>Find Your Baseline</Text>
                    <Text style={[styles.inviteSub, { color: '#0284C7' }]}>Take the 2-min skill assessment.</Text>
                </View>
            </View>
            <ChevronRight size={20} color="#0284C7" />
        </TouchableOpacity>

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

        {/* 2. Next Up Cards (List of Active Sessions) */}
        <Text style={[styles.sectionHeader, { paddingHorizontal: 24 }]}>Up Next</Text>
        <View style={{ paddingHorizontal: 24 }}>
          {upNextSessions.length > 0 ? (
            upNextSessions.map((sessionItem) => (
                <TouchableOpacity 
                    key={sessionItem.uniqueId}
                    style={styles.upNextCard} // Uses marginBottom from style
                    activeOpacity={0.9} 
                    onPress={() => navigation.navigate('Session', { 
                        session: sessionItem.fullSessionData, 
                        programId: sessionItem.programId 
                    })}
                >
                  <View style={styles.upNextHeader}>
                    <View style={styles.tag}><Text style={styles.tagText}>READY</Text></View>
                    <View style={styles.planBadge}><Text style={styles.planBadgeText}>Active Plan</Text></View>
                  </View>
                  
                  <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start'}}>
                      <View style={{flex: 1, marginRight: 12}}>
                        <Text style={styles.upNextTitle}>{sessionItem.title}</Text>
                        <Text style={styles.upNextSubtitle}>{sessionItem.programTitle}</Text>
                        
                        <View style={styles.metaRow}>
                            <View style={styles.metaItem}>
                                <Clock size={14} color="#64748B" />
                                <Text style={styles.metaText}>{sessionItem.duration} min</Text>
                            </View>
                            <View style={styles.metaItem}>
                                <Dumbbell size={14} color="#64748B" />
                                <Text style={styles.metaText}>{sessionItem.drillCount} Drills</Text>
                            </View>
                        </View>
                      </View>
                      <PlayCircle size={32} color={COLORS.primary} fill="#E0F2FE" style={{marginTop: 4}}/>
                  </View>
                </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No active sessions.</Text>
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
  
  // Banners
  inviteBanner: { backgroundColor: '#FFF7ED', marginHorizontal: 24, marginBottom: 24, padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#FED7AA' },
  notifIcon: { width: 40, height: 40, backgroundColor: '#FFEDD5', borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  inviteTitle: { fontSize: 15, fontWeight: '700', color: '#9A3412' },
  inviteSub: { fontSize: 13, color: '#C2410C' },
  
  horizontalScroll: { marginBottom: 24, marginHorizontal: 0 },
  
  // Quick Card
  quickCard: { backgroundColor: '#FFF', width: 160, padding: 16, borderRadius: 16, marginRight: 12, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.small },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  quickTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  quickDesc: { fontSize: 12, color: '#64748B', lineHeight: 16 },
  
  // Up Next Styles
  upNextCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.medium, marginBottom: 16 },
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
  
  // Complete / Empty Styles
  completeCard: { backgroundColor: '#F0FDF4', borderRadius: 20, padding: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#BBF7D0' },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#64748B', textAlign: 'center' },
  
  emptyCard: { padding: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, borderStyle: 'dashed' },
  emptyText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
  subText: { color: '#CBD5E1', fontSize: 12, marginTop: 4 },
  
  grid: { flexDirection: 'row', gap: 16 },
  actionCard: { flex: 1, backgroundColor: '#FFF', padding: 24, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 12, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.card },
  actionText: { fontWeight: 'bold', fontSize: 16, color: '#334155' },
});