import React, { useState, useCallback, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, RefreshControl, 
  TouchableOpacity, ActivityIndicator, StatusBar, Animated, Easing 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
    Plus, Users, Zap, Target, Clock, Dumbbell, Bell, ChevronRight, 
    PlayCircle, ClipboardList, RefreshCw, PenTool, Trophy, Sparkles
} from 'lucide-react-native';

import { fetchPrograms, fetchSessionLogs, fetchSquads, fetchCoachActivity, fetchUserProfile, fetchDrills } from '../services/api'; 
import { generateAIProgram } from '../services/geminiService'; 
import { COLORS, SHADOWS } from '../constants/theme';

export default function DashboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({ name: '', role: 'PLAYER', goals: '', xp: 0, level: 'Intermediate' }); 
  
  // Player State
  const [upNextSessions, setUpNextSessions] = useState([]); 
  const [activePrograms, setActivePrograms] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [userProfile, setUserProfile] = useState(null);

  // Auto-Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null); 
  const hasAutoTriggered = useRef(false); 
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Coach State
  const [mySquads, setMySquads] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  // ✅ IMPROVED ANIMATION: Smoother "Pulse" (No shrinking)
  const startBouncing = () => {
    scaleAnim.setValue(1);
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { 
          toValue: 1.05, // Grow slightly
          duration: 600, 
          easing: Easing.out(Easing.quad), // Smooth deceleration
          useNativeDriver: true 
        }),
        Animated.timing(scaleAnim, { 
          toValue: 1, // Return to normal
          duration: 600, 
          easing: Easing.in(Easing.quad), // Smooth acceleration
          useNativeDriver: true 
        })
      ])
    ).start();
  };

  const stopBouncing = () => {
    scaleAnim.stopAnimation();
    scaleAnim.setValue(1);
  };

  // --- DATA LOADING ---
  const loadDashboard = async () => {
    setLoading(true);
    try {
        const role = await AsyncStorage.getItem('user_role'); 
        const safeRole = (role || 'PLAYER').toUpperCase(); 
        
        let profileData = null;
        try {
            profileData = await fetchUserProfile();
            setUserProfile(profileData);
        } catch (e) { console.log("Profile fetch failed"); }

        const currentUser = { 
            id: profileData?.id,
            name: profileData?.name || 'Athlete', 
            role: safeRole,
            goals: profileData?.goals || '',
            xp: profileData?.xp || 0,
            level: profileData?.level || 'Intermediate',
            years_experience: profileData?.years_experience || 0
        };

        setUser(currentUser);

        if (safeRole === 'PLAYER') {
            await loadPlayerDashboard(currentUser);
        } else {
            await loadCoachDashboard();
        }
    } catch (error) {
        console.log("Dashboard Error:", error);
    } finally {
        setLoading(false);
    }
  };

  const loadPlayerDashboard = async (currentUser) => {
      const [myPrograms, myLogs] = await Promise.all([
          fetchPrograms(),
          fetchSessionLogs()
      ]); 
      
      const pending = myPrograms.filter(p => (p.status || '').toUpperCase() === 'PENDING');
      setPendingCount(pending.length);

      const active = myPrograms.filter(p => (p.status || '').toUpperCase() === 'ACTIVE');
      setActivePrograms(active); 
      calculateNextSessions(active, myLogs);

      if (active.length === 0 && pending.length === 0 && !generatedPlan && !hasAutoTriggered.current) {
          triggerAutoGeneration(currentUser);
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

  useFocusEffect(
    useCallback(() => { 
        loadDashboard(); 
    }, [])
  );

  // --- AI GENERATION LOGIC ---
  const triggerAutoGeneration = async (profileData) => {
      if (isGenerating) return;
      
      hasAutoTriggered.current = true;
      setIsGenerating(true);
      startBouncing(); // Start animation immediately

      // ✅ FIX: Small delay to let animation start smoothly BEFORE heavy JS work begins
      setTimeout(async () => {
        try {
            const [historyLogs, allDrills] = await Promise.all([
               fetchSessionLogs(),
               fetchDrills()
            ]);
  
            const level = profileData.level || "Intermediate";
            const goals = profileData.goals || "General Improvement";
            const experience = profileData.years_experience || "some";
  
            const prompt = `Create a 4-week tennis program for a ${level} player with ${experience} years of experience. Their main goal is: "${goals}".`;
  
            const aiResult = await generateAIProgram(
                prompt,
                allDrills,
                { 
                    id: profileData.id, 
                    role: profileData.role, 
                    level: level, 
                    goals: goals,
                    yearsExperience: experience 
                },
                historyLogs, 
                { weeks: 4 }
            );
  
            if (aiResult) {
                setGeneratedPlan(aiResult);
            } 
        } catch (error) {
            console.error("Auto-generation failed:", error);
        } finally {
            setIsGenerating(false);
            stopBouncing();
        }
      }, 200); // 200ms delay unblocks the UI thread
  };

  const handleReviewGeneratedPlan = () => {
      if (!generatedPlan) return;
      navigation.navigate('ProgramBuilder', { 
          preGeneratedProgram: generatedPlan, 
          passedUserProfile: userProfile 
      });
  };

  const calculateNextSessions = (programs, logs) => {
      if (!programs || programs.length === 0) {
          setUpNextSessions([]);
          return;
      }
      
      const sortedPrograms = programs.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

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
              const totalMins = sessionDrills.reduce((sum, d) => sum + (parseInt(d.duration_minutes || d.duration || 0)), 0);

              upcoming.push({
                  uniqueId: `${program.id}_day_${nextDayNum}`,
                  title: `Day ${nextDayNum} Training`, 
                  programTitle: program.title || "Untitled Program",
                  coachName: program.coach_name,
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

  const renderAssessmentBanner = () => (
      <View style={styles.assessmentSection}>
          <View style={styles.assessmentHeaderRow}>
              <Target size={20} color={COLORS.primary} />
              <Text style={styles.sectionHeaderTitle}>Level Assessment</Text>
          </View>
          <View style={styles.assessmentCard}>
              <View style={styles.assessmentContent}>
                  <View style={styles.assessmentIconBox}><ClipboardList size={24} color="#0284C7" /></View>
                  <View style={{flex: 1}}>
                      <Text style={styles.assessmentTitle}>Find Your Baseline</Text>
                      <Text style={styles.assessmentSub}>Take a short skills test to personalize your training plans.</Text>
                  </View>
              </View>
              <TouchableOpacity style={styles.assessmentBtn} onPress={() => navigation.navigate('Assessment')}>
                  <Text style={styles.assessmentBtnText}>Start Assessment</Text>
              </TouchableOpacity>
          </View>
      </View>
  );

  const renderAutoGenerationCard = () => (
      <View style={styles.suggestionContainer}>
          <View style={styles.suggestionHeader}>
              <View style={[styles.suggestedBadge, isGenerating && { backgroundColor: '#EAB308' }]}>
                <Text style={styles.suggestedBadgeText}>
                    {isGenerating ? "BUILDING PLAN..." : "PLAN READY"}
                </Text>
              </View>
          </View>
          
          <Text style={styles.suggestionTitle}>
              {generatedPlan ? generatedPlan.title : (user.goals ? `${user.goals} Program` : "Personalized Training Plan")}
          </Text>
          <Text style={styles.suggestionDesc}>
              {isGenerating 
                ? "Analyzing your profile, history, and goals to build the perfect 4-week schedule..." 
                : "Your custom AI program has been generated and is ready for review."}
          </Text>

          <View style={styles.suggestionActions}>
              <Animated.View style={{ flex: 1, transform: [{ scale: scaleAnim }] }}>
                <TouchableOpacity 
                    style={[
                        styles.acceptPlanBtn, 
                        isGenerating ? styles.generatingBtn : styles.readyBtn
                    ]} 
                    onPress={handleReviewGeneratedPlan}
                    disabled={isGenerating}
                >
                    {isGenerating ? (
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                             <RefreshCw size={18} color="#FFF" style={{ transform: [{ rotate: '45deg' }] }} /> 
                             <Text style={styles.acceptPlanText}>Building...</Text>
                        </View>
                    ) : (
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                             <Sparkles size={18} color="#FFF" /> 
                             <Text style={styles.acceptPlanText}>Review & Start</Text>
                        </View>
                    )}
                </TouchableOpacity>
              </Animated.View>
          </View>
      </View>
  );

  const renderCoachView = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.grid}>
        <TouchableOpacity style={[styles.actionCard, { backgroundColor: COLORS.primary }]} onPress={() => navigation.navigate('ProgramBuilder', { squadMode: true })}>
          <Plus color="#FFF" size={32} />
          <Text style={[styles.actionText, { color: '#FFF' }]}>Create Plan</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Team')}>
          <Users color={COLORS.secondary} size={32} />
          <Text style={styles.actionText}>My Team</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPlayerView = () => (
    <View style={styles.playerContainer}>
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
            <Text style={styles.sectionTitle}>Tools</Text>
            <View style={styles.grid}>
                <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('MatchDiary')}>
                    <Trophy size={28} color="#D97706" />
                    <Text style={styles.actionText}>Match Diary</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('ProgramBuilder', { squadMode: false })}>
                    <PenTool size={28} color={COLORS.primary} />
                    <Text style={styles.actionText}>Create Plan</Text>
                </TouchableOpacity>
            </View>
        </View>

        {user.xp === 0 && renderAssessmentBanner()}

        {pendingCount > 0 && (
            <TouchableOpacity style={styles.inviteBanner} onPress={() => navigation.navigate('Main', { screen: 'Plans' })}>
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

        <View style={styles.upNextHeaderRow}>
            <Zap size={20} color={COLORS.primary} style={{marginRight: 6}} />
            <Text style={styles.sectionHeaderTitle}>Up Next</Text>
        </View>
        
        <View style={{ paddingHorizontal: 24 }}>
          {activePrograms.length === 0 ? (
              renderAutoGenerationCard()
          ) : (
              upNextSessions.length > 0 ? (
                upNextSessions.map((sessionItem) => (
                    <TouchableOpacity 
                        key={sessionItem.uniqueId}
                        style={styles.upNextCard}
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
                                    <View style={styles.metaItem}><Clock size={14} color="#64748B" /><Text style={styles.metaText}>{sessionItem.duration} min</Text></View>
                                    <View style={styles.metaItem}><Dumbbell size={14} color="#64748B" /><Text style={styles.metaText}>{sessionItem.drillCount} Drills</Text></View>
                                </View>
                            </View>
                            <PlayCircle size={32} color={COLORS.primary} fill="#E0F2FE" style={{marginTop: 4}}/>
                        </View>
                    </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyCard}><Text style={styles.emptyText}>All caught up! No sessions for today.</Text></View>
              )
          )}
        </View>

        <Text style={styles.sectionHeader}>Quick Start</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll} contentContainerStyle={{paddingHorizontal: 24}}>
          <TouchableOpacity style={styles.quickCard}>
            <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}><Zap size={20} color={COLORS.primary} /></View>
            <Text style={styles.quickTitle}>Serve Power Up</Text>
            <Text style={styles.quickDesc}>30-min session to boost speed.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard}>
              <View style={[styles.iconBox, { backgroundColor: '#E0F2FE' }]}><Target size={20} color="#0284C7" /></View>
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
                <Text style={styles.headerSubtitle}>{user.goals ? `Goal: ${user.goals}` : "Let's get to work."}</Text>
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
  grid: { flexDirection: 'row', gap: 16 },
  actionCard: { flex: 1, backgroundColor: '#FFF', padding: 24, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 12, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.card },
  actionText: { fontWeight: 'bold', fontSize: 14, color: '#334155' },

  assessmentSection: { marginBottom: 32, paddingHorizontal: 24 },
  assessmentHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginLeft: 8 },
  assessmentCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.small },
  assessmentContent: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  assessmentIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center' }, 
  assessmentTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  assessmentSub: { fontSize: 13, color: '#64748B', lineHeight: 18 },
  assessmentBtn: { backgroundColor: '#15803D', paddingVertical: 12, borderRadius: 10, alignItems: 'center', width: 160 }, 
  assessmentBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  suggestionContainer: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, borderWidth: 2, borderColor: '#16A34A', borderStyle: 'dashed', ...SHADOWS.small },
  suggestionHeader: { marginBottom: 12 },
  suggestedBadge: { backgroundColor: '#15803D', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, alignSelf: 'flex-start' },
  suggestedBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  suggestionTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  suggestionDesc: { fontSize: 13, color: '#64748B', lineHeight: 20, marginBottom: 20 },
  suggestionActions: { flexDirection: 'row', gap: 12 },
  
  acceptPlanBtn: { flex: 1, backgroundColor: '#15803D', paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  generatingBtn: { backgroundColor: '#EAB308' }, 
  readyBtn: { backgroundColor: COLORS.primary }, 
  acceptPlanText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  
  regenerateBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingVertical: 12 },
  regenerateText: { color: '#64748B', fontWeight: '600', fontSize: 14 },

  upNextHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginBottom: 12 },
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
  horizontalScroll: { marginBottom: 24, marginHorizontal: 0 },
  quickCard: { backgroundColor: '#FFF', width: 160, padding: 16, borderRadius: 16, marginRight: 12, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.small },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  quickTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  quickDesc: { fontSize: 12, color: '#64748B', lineHeight: 16 },
});