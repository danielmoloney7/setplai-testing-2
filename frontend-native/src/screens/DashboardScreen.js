import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, RefreshControl, 
  TouchableOpacity, ActivityIndicator, StatusBar, Animated, Alert 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Users, Zap, Target, Clock, Dumbbell, Bell, ChevronRight, PlayCircle, ClipboardList, User, Trophy, PenTool, RefreshCw, CheckCircle, Calendar } from 'lucide-react-native';

import { fetchPrograms, fetchSessionLogs, fetchSquads, fetchCoachActivity, fetchUserProfile, fetchDrills, createProgram, fetchNotifications } from '../services/api'; 
import { generateAIProgram } from '../services/geminiService';
import { COLORS, SHADOWS } from '../constants/theme';
import FeedCard from '../components/FeedCard'; 

export default function DashboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState({ name: 'Athlete', role: 'PLAYER', id: null }); 
  
  // Player State
  const [upNextSessions, setUpNextSessions] = useState([]); 
  const [pendingCount, setPendingCount] = useState(0);
  const [activePlanCount, setActivePlanCount] = useState(0); 
  const [hasHistory, setHasHistory] = useState(false); 
  
  // Notification State
  const [unreadCount, setUnreadCount] = useState(0);

  // AI Suggestion State
  const [suggestedProgram, setSuggestedProgram] = useState(null);
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
  const bounceAnim = useRef(new Animated.Value(1)).current;

  // Coach State
  const [mySquads, setMySquads] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  // --- ANIMATION ---
  useEffect(() => {
    if (isGeneratingSuggestion) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, { toValue: 1.02, duration: 800, useNativeDriver: true }),
          Animated.timing(bounceAnim, { toValue: 1, duration: 800, useNativeDriver: true })
        ])
      ).start();
    } else {
      bounceAnim.setValue(1);
    }
  }, [isGeneratingSuggestion]);

  // --- DATA LOADING ---
  const loadDashboard = async () => {
    try {
        const [role, name, storedId] = await Promise.all([
            AsyncStorage.getItem('user_role'),
            AsyncStorage.getItem('user_name'),
            AsyncStorage.getItem('user_id')
        ]);

        const safeRole = (role || 'PLAYER').toUpperCase(); 
        
        // Update user state immediately
        const currentUser = { 
            name: name || 'Athlete', 
            role: safeRole, 
            id: storedId 
        };
        setUser(currentUser);

        // Fetch Notifications
        try {
            const notifs = await fetchNotifications();
            const unread = notifs.filter(n => !n.is_read).length;
            setUnreadCount(unread);
        } catch (e) { console.log("Notif fetch error", e); }

        if (safeRole === 'PLAYER') {
            await loadPlayerDashboard(storedId); 
        } else {
            await loadCoachDashboard();
        }
    } catch (error) {
        console.log("Dashboard Error:", error);
    } finally {
        setLoading(false); 
        setRefreshing(false); 
    }
  };

  const onRefresh = () => {
      setRefreshing(true); 
      loadDashboard();
  };

  const loadPlayerDashboard = async (initialUserId) => {
      let currentUserId = initialUserId;

      // 1. Ensure we have a valid User ID from profile if storage was empty
      try {
          const profile = await fetchUserProfile();
          if (profile?.id) {
              currentUserId = profile.id;
              await AsyncStorage.setItem('user_id', profile.id.toString());
              // Update state so the render logic has the ID
              setUser(prev => ({ ...prev, id: profile.id }));
          }
      } catch(e) { console.log("Profile fetch error in dash", e); }

      const [myPrograms, myLogs] = await Promise.all([
          fetchPrograms(),
          fetchSessionLogs()
      ]); 
      
      setHasHistory(myLogs.length > 0);

      const pending = myPrograms.filter(p => (p.status || '').toUpperCase() === 'PENDING');
      setPendingCount(pending.length);

      const active = myPrograms.filter(p => (p.status || '').toUpperCase() === 'ACTIVE');
      setActivePlanCount(active.length);
      
      // ✅ FIX: Pass the confirmed currentUserId explicitly
      calculateNextSessions(active, myLogs, currentUserId);

      const unfinishedActivePrograms = active.filter(p => {
          const schedule = p.schedule || p.sessions || [];
          if (schedule.length === 0) return false; 
          const completedDays = new Set(myLogs.filter(l => l.program_id === p.id).map(l => l.session_id));
          const distinctDays = new Set(schedule.map(s => s.day_order)).size;
          return completedDays.size < distinctDays;
      });

      if (unfinishedActivePrograms.length > 0 || pending.length > 0) {
          setSuggestedProgram(null);
          if (currentUserId) AsyncStorage.removeItem(`suggested_program_${currentUserId}`);
          return;
      }

      let foundSuggestion = null;
      if (currentUserId) {
          try {
              const savedJson = await AsyncStorage.getItem(`suggested_program_${currentUserId}`);
              if (savedJson) {
                  foundSuggestion = JSON.parse(savedJson);
                  setSuggestedProgram(foundSuggestion);
              }
          } catch (e) {}
      }

      if (!foundSuggestion && !suggestedProgram && !isGeneratingSuggestion) {
          generateSuggestion({}, myLogs, currentUserId);
      }
  };

  const loadCoachDashboard = async () => {
      const [squadsData, activityData] = await Promise.all([
          fetchSquads(),
          fetchCoachActivity()
      ]);
      setMySquads(squadsData || []);
      setRecentActivity(activityData || []);
  };

  useFocusEffect(useCallback(() => { loadDashboard(); }, []));

  const generateSuggestion = async (profile, logs, userId) => {
    if (!userId) return;
    setIsGeneratingSuggestion(true);
    try {
        const drills = await fetchDrills();
        const userContext = { ...user, ...profile, id: userId };
        const aiResult = await generateAIProgram("Create a program based on history.", drills, userContext, logs, { weeks: 4 });
        if (aiResult) {
             setSuggestedProgram(aiResult);
             await AsyncStorage.setItem(`suggested_program_${userId}`, JSON.stringify(aiResult));
        }
    } catch (e) { console.log("AI Gen Error", e); } finally { setIsGeneratingSuggestion(false); }
  };

  const handleAcceptSuggestion = async () => {
      if (!suggestedProgram) return;
      setLoading(true);
      try {
          const allDrills = await fetchDrills();
          const drillMap = new Map(allDrills.map(d => [d.id, d.name]));
          const formattedSessions = suggestedProgram.sessions.map((session, index) => ({
              day: index + 1,
              drills: (session.items || []).map(item => ({
                  drill_id: item.drillId,
                  drill_name: drillMap.get(item.drillId) || item.drillName || "Custom Drill", 
                  duration: parseInt(item.targetDurationMin || item.duration || 10),
                  notes: item.notes || "",
                  target_value: item.reps ? parseInt(item.reps) : null,
                  target_prompt: item.mode || (item.sets ? `${item.sets} Sets` : "")
              }))
          }));
          const payload = {
              title: suggestedProgram.title || "AI Training Plan",
              description: suggestedProgram.description || "Generated by SetPlai AI",
              status: 'ACTIVE',
              assigned_to: ['SELF'],
              program_type: 'PLAYER_PLAN',
              sessions: formattedSessions
          };
          await createProgram(payload);
          setSuggestedProgram(null);
          if (user.id) await AsyncStorage.removeItem(`suggested_program_${user.id}`);
          loadDashboard(); 
          Alert.alert("Success", "Plan added to your schedule!");
      } catch (e) { Alert.alert("Error", "Could not save plan."); } finally { setLoading(false); }
  };

  const handleRegenerateSuggestion = async () => {
      setSuggestedProgram(null);
      if (user.id) await AsyncStorage.removeItem(`suggested_program_${user.id}`);
      const [profile, logs] = await Promise.all([fetchUserProfile(), fetchSessionLogs()]);
      generateSuggestion(profile, logs, user.id);
  };

  // ✅ FIX: Calculate assignment status HERE using the explicit user ID
  const calculateNextSessions = (activePrograms, logs, currentUserId) => {
      if (!activePrograms || activePrograms.length === 0) { setUpNextSessions([]); return; }
      
      const sortedPrograms = activePrograms.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const upcoming = [];
      
      sortedPrograms.forEach(program => {
          const rawSchedule = program.schedule || program.sessions || [];
          if (rawSchedule.length === 0) return;
          
          const completedDays = logs.filter(log => log.program_id === program.id).map(log => log.session_id);
          const nextDrill = rawSchedule.find(item => !completedDays.includes(item.day_order));
          
          if (nextDrill) {
              const nextDayNum = nextDrill.day_order;
              const sessionDrills = rawSchedule.filter(i => i.day_order === nextDayNum);
              const totalMins = sessionDrills.reduce((sum, d) => sum + (parseInt(d.duration_minutes || d.duration || 0)), 0);
              
              // ✅ LOGIC: If creator_id exists AND it matches currentUserId -> Player Assigned
              // If creator_id exists AND it does NOT match -> Coach Assigned
              // Default to Player Assigned if unsure (avoids frightening "Coach Assigned" label)
              let isCoachAssigned = false;
              if (program.creator_id && currentUserId) {
                  isCoachAssigned = String(program.creator_id) !== String(currentUserId);
              }

              upcoming.push({
                  uniqueId: `${program.id}_day_${nextDayNum}`,
                  title: `Day ${nextDayNum} Training`, 
                  programTitle: program.title || "Untitled Program",
                  coachName: program.coach_name || "Self-Guided",
                  isCoachAssigned: isCoachAssigned, 
                  duration: totalMins > 0 ? totalMins : 15,
                  drillCount: sessionDrills.length,
                  programId: program.id,
                  fullSessionData: { day_order: nextDayNum, title: `Day ${nextDayNum}`, items: sessionDrills, totalMinutes: totalMins }
              });
          }
      });
      setUpNextSessions(upcoming);
  };

  const getInitials = (n) => n ? n[0].toUpperCase() : 'U';

  const renderCoachView = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.grid}>
        <TouchableOpacity 
          style={[styles.actionCard, { backgroundColor: COLORS.primary }]}
          onPress={() => navigation.navigate('CoachAction')} 
        >
          <Plus color="#FFF" size={32} />
          <Text style={[styles.actionText, { color: '#FFF' }]}>Create Plan</Text>
        </TouchableOpacity>

        <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('MatchList', { viewMode: 'TEAM' })} 
        >
            <Trophy color="#D97706" size={32} />
            <Text style={styles.actionText}>Team Matches</Text>
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
              recentActivity.map(item => (
                  <View key={item.id}>
                      <View style={{flexDirection:'row', alignItems:'center', marginBottom: 4, marginLeft: 4}}>
                          <Users size={12} color="#64748B" />
                          <Text style={{fontSize: 12, fontWeight: '700', color: '#64748B', marginLeft: 6}}>
                              {item.player_name || 'Athlete'}
                          </Text>
                      </View>

                      {item.opponent_name ? (
                          <TouchableOpacity 
                            style={styles.matchFeedCard}
                            onPress={() => navigation.navigate('MatchDiary', { userId: item.user_id })} 
                          >
                              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                                  <View style={{flex: 1}}>
                                      <Text style={styles.matchEvent}>{item.event_name || 'Match'}</Text>
                                      <Text style={styles.matchVs}>vs {item.opponent_name}</Text>
                                  </View>
                                  {item.score ? (
                                      <View style={[styles.matchResultBadge, item.result === 'Loss' ? {backgroundColor:'#FEE2E2'} : {backgroundColor:'#DCFCE7'}]}>
                                          <Text style={[styles.matchResultText, item.result === 'Loss' ? {color:'#DC2626'} : {color:'#16A34A'}]}>
                                              {item.result ? item.result.toUpperCase() : 'COMPLETED'}
                                          </Text>
                                          <Text style={styles.matchScore}>{item.score}</Text>
                                      </View>
                                  ) : (
                                      <View style={styles.plannedBadge}>
                                          <Calendar size={12} color="#B45309" />
                                          <Text style={styles.plannedText}>PLANNED</Text>
                                      </View>
                                  )}
                              </View>
                          </TouchableOpacity>
                      ) : (
                          <FeedCard session={item} />
                      )}
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

  const renderPlayerView = () => (
    <View style={styles.playerContainer}>
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
            <Text style={styles.sectionTitle}>Tools</Text>
            <View style={styles.grid}>
                <TouchableOpacity 
                    style={styles.actionCard} 
                    onPress={() => navigation.navigate('MatchDiary')}
                >
                    <Trophy size={28} color="#D97706" />
                    <Text style={styles.actionText}>Match Diary</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.actionCard} 
                    onPress={() => navigation.navigate('ProgramBuilder', { squadMode: false })}
                >
                    <PenTool size={28} color={COLORS.primary} />
                    <Text style={styles.actionText}>Create Plan</Text>
                </TouchableOpacity>
            </View>
        </View>

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
                <CheckCircle size={20} color="#B45309" />
            </TouchableOpacity>
        )}

        {!hasHistory && activePlanCount === 0 && (
            <TouchableOpacity 
                style={[styles.inviteBanner, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD', marginHorizontal: 24, marginBottom: 24 }]}
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
        )}

        <Text style={[styles.sectionHeader, { paddingHorizontal: 24 }]}>Up Next</Text>
        <View style={{ paddingHorizontal: 24 }}>
          {(isGeneratingSuggestion || suggestedProgram) && (
              <Animated.View style={[styles.suggestedCard, { transform: [{ scale: bounceAnim }] }]}>
                  <View style={styles.suggestedBadge}>
                      <Text style={styles.suggestedBadgeText}>SUGGESTED FOR YOU</Text>
                  </View>
                  
                  {isGeneratingSuggestion ? (
                      <View style={{padding: 20, alignItems: 'center'}}>
                          <ActivityIndicator color={COLORS.primary} />
                          <Text style={{color: COLORS.primary, marginTop: 12, fontWeight: '600'}}>Analyzing your game...</Text>
                      </View>
                  ) : (
                      <>
                          <Text style={styles.suggestedTitle}>{suggestedProgram?.title || "Custom AI Plan"}</Text>
                          <Text style={styles.suggestedDesc}>{suggestedProgram?.description || "A personalized plan based on your recent activity."}</Text>
                          
                          <View style={styles.suggestedActions}>
                              <TouchableOpacity style={styles.acceptAiBtn} onPress={handleAcceptSuggestion}>
                                  <Text style={styles.acceptAiText}>Accept Plan</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.regenBtn} onPress={handleRegenerateSuggestion}>
                                  <RefreshCw size={16} color="#64748B" style={{marginRight: 6}} />
                                  <Text style={styles.regenText}>Regenerate</Text>
                              </TouchableOpacity>
                          </View>
                      </>
                  )}
              </Animated.View>
          )}

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
                    
                    {/* ✅ FIXED: Use the pre-calculated logic */}
                    {sessionItem.isCoachAssigned ? (
                        <View style={[styles.planBadge, { backgroundColor: '#7C3AED' }]}>
                            <Text style={[styles.planBadgeText, { color: '#FFF' }]}>COACH ASSIGNED</Text>
                        </View>
                    ) : (
                        <View style={styles.planBadge}>
                            <Text style={styles.planBadgeText}>PLAYER ASSIGNED</Text>
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
            !isGeneratingSuggestion && !suggestedProgram && (
                <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>No active sessions.</Text>
                </View>
            )
          )}
        </View>

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
              
              {/* ✅ NEW: Row for Bell + Profile (Both roles see both) */}
              <View style={{flexDirection: 'row', gap: 12}}>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Notifications')}>
                      <Bell color="#FFF" size={20} />
                      {unreadCount > 0 && <View style={styles.badgeDot} />}
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.avatarBtn} onPress={() => navigation.navigate('Profile')}>
                      <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
                  </TouchableOpacity>
              </View>

            </View>
          </SafeAreaView>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading && !suggestedProgram ? <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 50}} /> : 
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
  squadCard: { width: 140, padding: 16, backgroundColor: '#FFF', borderRadius: 16, marginRight: 12, alignItems: 'flex-start', borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.small },
  squadIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  squadInitial: { fontSize: 16, fontWeight: '700', color: '#64748B' },
  squadName: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  squadCount: { fontSize: 12, color: '#64748B' },
  emptyBox: { padding: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, borderStyle: 'dashed' },
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
  grid: { flexDirection: 'row', gap: 16 },
  actionCard: { flex: 1, backgroundColor: '#FFF', padding: 24, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 12, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.card },
  actionText: { fontWeight: 'bold', fontSize: 14, color: '#334155' },
  suggestedCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, borderWidth: 2, borderColor: '#15803D', borderStyle: 'dashed', ...SHADOWS.medium, marginBottom: 20 },
  suggestedBadge: { backgroundColor: '#15803D', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginBottom: 12 },
  suggestedBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  suggestedTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 6 },
  suggestedDesc: { fontSize: 13, color: '#64748B', lineHeight: 20, marginBottom: 16 },
  suggestedActions: { flexDirection: 'row', gap: 12 },
  acceptAiBtn: { flex: 2, backgroundColor: '#15803D', padding: 12, borderRadius: 10, alignItems: 'center' },
  acceptAiText: { color: '#FFF', fontWeight: '700' },
  regenBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10 },
  regenText: { color: '#64748B', fontWeight: '600' },
  horizontalScroll: { marginBottom: 24, marginHorizontal: 0 },
  quickCard: { backgroundColor: '#FFF', width: 160, padding: 16, borderRadius: 16, marginRight: 12, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.small },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  quickTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  quickDesc: { fontSize: 12, color: '#64748B', lineHeight: 16 },
  matchFeedCard: { backgroundColor: '#FFF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.small },
  matchEvent: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  matchVs: { fontSize: 12, color: '#64748B' },
  matchResultBadge: { alignItems: 'flex-end', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  matchResultText: { fontSize: 10, fontWeight: '800' },
  matchScore: { fontSize: 12, fontWeight: '600', color: '#334155' },
  plannedBadge: { flexDirection: 'row', gap: 4, backgroundColor: '#FFF7ED', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  plannedText: { fontSize: 10, fontWeight: '800', color: '#B45309' },
  playerContainer: { flex: 1 }
});