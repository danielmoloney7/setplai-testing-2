import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, RefreshControl, 
  TouchableOpacity, ActivityIndicator, StatusBar 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Users, Zap, Target, Clock, Dumbbell, Bell, ChevronRight, PlayCircle, ClipboardList, User, Trophy, PenTool } from 'lucide-react-native';

import { fetchPrograms, fetchSessionLogs, fetchSquads, fetchCoachActivity } from '../services/api'; 
import { COLORS, SHADOWS } from '../constants/theme';
import FeedCard from '../components/FeedCard'; 

export default function DashboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({ name: 'Athlete', role: 'PLAYER' }); 
  
  // Player State
  const [upNextSessions, setUpNextSessions] = useState([]); 
  const [pendingCount, setPendingCount] = useState(0);

  // Coach State
  const [mySquads, setMySquads] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  // --- DATA LOADING ---
  const loadDashboard = async () => {
    setLoading(true);
    try {
        const role = await AsyncStorage.getItem('user_role'); 
        const name = await AsyncStorage.getItem('user_name');
        const safeRole = (role || 'PLAYER').toUpperCase(); 
        
        setUser({ name: name || 'Athlete', role: safeRole });

        if (safeRole === 'PLAYER') {
            await loadPlayerDashboard();
        } else {
            await loadCoachDashboard();
        }
    } catch (error) {
        console.log("Dashboard Error:", error);
    } finally {
        setLoading(false);
    }
  };

  const loadPlayerDashboard = async () => {
      const [myPrograms, myLogs] = await Promise.all([
          fetchPrograms(),
          fetchSessionLogs()
      ]); 
      
      const pending = myPrograms.filter(p => (p.status || '').toUpperCase() === 'PENDING');
      setPendingCount(pending.length);

      const active = myPrograms.filter(p => (p.status || '').toUpperCase() === 'ACTIVE');
      calculateNextSessions(active, myLogs);
  };

  const loadCoachDashboard = async () => {
      const [squadsData, activityData] = await Promise.all([
          fetchSquads(),
          fetchCoachActivity()
      ]);
      setMySquads(squadsData || []);
      setRecentActivity(activityData || []);
  };

  useFocusEffect(
    useCallback(() => { loadDashboard(); }, [])
  );

  // --- LOGIC: FIND NEXT SESSIONS (PLAYER) ---
  const calculateNextSessions = (activePrograms, logs) => {
      if (!activePrograms || activePrograms.length === 0) {
          setUpNextSessions([]);
          return;
      }
      
      const sortedPrograms = activePrograms.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          if (dateB !== dateA) return dateB - dateA;
          return (parseInt(b.id) || 0) - (parseInt(a.id) || 0);
      });

      const upcoming = [];
      sortedPrograms.forEach(program => {
          const rawSchedule = program.schedule || program.sessions || [];
          if (rawSchedule.length === 0) return;
          
          const completedDays = logs
              .filter(log => log.program_id === program.id)
              .map(log => log.session_id);

          const nextDrill = rawSchedule.find(item => !completedDays.includes(item.day_order));

          if (nextDrill) {
              const nextDayNum = nextDrill.day_order;
              const sessionDrills = rawSchedule.filter(i => i.day_order === nextDayNum);
              
              const totalMins = sessionDrills.reduce((sum, d) => 
                  sum + (parseInt(d.duration_minutes || d.targetDurationMin || d.duration || 0)), 0
              );

              upcoming.push({
                  uniqueId: `${program.id}_day_${nextDayNum}`,
                  title: `Day ${nextDayNum} Training`, 
                  programTitle: program.title || "Untitled Program",
                  coachName: program.coach_name || "Self-Guided",
                  duration: totalMins > 0 ? totalMins : 15,
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

  // --- COACH VIEW ---
  const renderCoachView = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
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

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>My Squads</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginHorizontal: -24}} contentContainerStyle={{paddingHorizontal: 24}}>
          {mySquads.length > 0 ? (
              mySquads.map(squad => (
                <TouchableOpacity 
                    key={squad.id} 
                    style={styles.squadCard}
                    onPress={() => navigation.navigate('SquadDetail', { squad })}
                >
                    <View style={styles.squadIcon}><Text style={styles.squadInitial}>{squad.name[0]}</Text></View>
                    <Text style={styles.squadName}>{squad.name}</Text>
                    <Text style={styles.squadCount}>{squad.member_count} Athletes</Text>
                </TouchableOpacity>
              ))
          ) : (
              <View style={styles.emptyBox}><Text style={styles.emptyText}>No squads yet.</Text></View>
          )}
          <TouchableOpacity style={[styles.squadCard, {borderStyle:'dashed', borderColor: COLORS.primary}]} onPress={() => navigation.navigate('Team')}>
             <View style={[styles.squadIcon, {backgroundColor: '#F0FDF4'}]}><Plus size={24} color={COLORS.primary}/></View>
             <Text style={[styles.squadName, {color: COLORS.primary}]}>Add Squad</Text>
          </TouchableOpacity>
      </ScrollView>

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Recent Activity</Text>
      <View style={{ gap: 12 }}>
          {recentActivity.length > 0 ? (
              recentActivity.map(log => (
                  <View key={log.id}>
                      <View style={{flexDirection:'row', alignItems:'center', marginBottom: 4, marginLeft: 4}}>
                          <User size={12} color="#64748B" />
                          <Text style={{fontSize: 12, fontWeight: '700', color: '#64748B', marginLeft: 6}}>
                              {log.player_name || 'Athlete'}
                          </Text>
                      </View>
                      <FeedCard session={log} />
                  </View>
              ))
          ) : (
              <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No recent activity from your team.</Text>
              </View>
          )}
      </View>
    </View>
  );

  // --- PLAYER VIEW ---
  const renderPlayerView = () => (
    <View style={styles.playerContainer}>
        {/* Tools Section */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
            <Text style={styles.sectionTitle}>Tools</Text>
            <View style={styles.grid}>
                {/* Match Diary Tool */}
                <TouchableOpacity 
                    style={styles.actionCard} 
                    onPress={() => navigation.navigate('MatchDiary')}
                >
                    <Trophy size={28} color="#D97706" />
                    <Text style={styles.actionText}>Match Diary</Text>
                </TouchableOpacity>

                {/* ✅ NEW: Create Program Shortcut */}
                <TouchableOpacity 
                    style={styles.actionCard} 
                    onPress={() => navigation.navigate('ProgramBuilder', { squadMode: false })}
                >
                    <PenTool size={28} color={COLORS.primary} />
                    <Text style={styles.actionText}>Create Plan</Text>
                </TouchableOpacity>
            </View>
        </View>

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

        {pendingCount > 0 && (
            <TouchableOpacity 
                style={styles.inviteBanner}
                onPress={() => navigation.navigate('Main', { screen: 'Plans' })} 
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

        <Text style={[styles.sectionHeader, { paddingHorizontal: 24 }]}>Up Next</Text>
        <View style={{ paddingHorizontal: 24 }}>
          {upNextSessions.length > 0 ? (
            upNextSessions.map((sessionItem) => (
                <TouchableOpacity 
                    key={sessionItem.uniqueId}
                    style={styles.upNextCard}
                    activeOpacity={0.9} 
                    onPress={() => navigation.navigate('Session', { 
                        session: sessionItem.fullSessionData, 
                        programId: sessionItem.programId 
                    })}
                >
                <View style={styles.upNextHeader}>
                    <View style={styles.tag}><Text style={styles.tagText}>READY</Text></View>
                    {sessionItem.coachName && sessionItem.coachName !== 'Self-Guided' && sessionItem.coachName !== 'System' ? (
                        <View style={[styles.planBadge, { backgroundColor: '#7C3AED' }]}>
                            <Text style={[styles.planBadgeText, { color: '#FFF' }]}>COACH ASSIGNED</Text>
                        </View>
                    ) : (
                        <View style={styles.planBadge}>
                            <Text style={styles.planBadgeText}>Active Plan</Text>
                        </View>
                    )}
                </View>

                <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start'}}>
                    <View style={{flex: 1, marginRight: 12}}>
                        <Text style={styles.upNextTitle}>{sessionItem.title}</Text>
                        <Text style={styles.upNextSubtitle}>{sessionItem.programTitle}</Text>
                        <View style={styles.metaRow}>
                            <View style={styles.metaItem}><Clock size={14} color="#64748B" /><Text style={styles.metaText}>{sessionItem.duration} min</Text></View>
                            <View style={styles.metaItem}><Dumbbell size={14} color="#64748B" /><Text style={styles.metaText}>{sessionItem.drillCount} Drills</Text></View>
                        </View>
                    </View>
                    <PlayCircle size={32} color={COLORS.primary} fill="#E0F2FE" style={{marginTop: 4}}/>
                </View>
                </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No active sessions.</Text>
            </View>
          )}
        </View>

        {/* ✅ ADDED: Quick Start Section Restored */}
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
                  <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Notifications')}>
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
  
  // Squad Cards
  squadCard: { width: 140, padding: 16, backgroundColor: '#FFF', borderRadius: 16, marginRight: 12, alignItems: 'flex-start', borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.small },
  squadIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  squadInitial: { fontSize: 16, fontWeight: '700', color: '#64748B' },
  squadName: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  squadCount: { fontSize: 12, color: '#64748B' },
  emptyBox: { padding: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, borderStyle: 'dashed' },
  
  // Player Cards
  inviteBanner: { backgroundColor: '#FFF7ED', marginHorizontal: 24, marginBottom: 24, padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#FED7AA' },
  notifIcon: { width: 40, height: 40, backgroundColor: '#FFEDD5', borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  inviteTitle: { fontSize: 15, fontWeight: '700', color: '#9A3412' },
  inviteSub: { fontSize: 13, color: '#C2410C' },
  
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

  emptyCard: { padding: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, borderStyle: 'dashed' },
  emptyText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
  subText: { color: '#CBD5E1', fontSize: 12, marginTop: 4 },

  grid: { flexDirection: 'row', gap: 16 },
  actionCard: { flex: 1, backgroundColor: '#FFF', padding: 24, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 12, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.card },
  actionText: { fontWeight: 'bold', fontSize: 14, color: '#334155' },
  
  horizontalScroll: { marginBottom: 24, marginHorizontal: 0 },
  quickCard: { backgroundColor: '#FFF', width: 160, padding: 16, borderRadius: 16, marginRight: 12, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.small },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  quickTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  quickDesc: { fontSize: 12, color: '#64748B', lineHeight: 16 },
});