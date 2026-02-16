import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, Edit2, Play, Check, Clock, Dumbbell, UserCheck } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { 
    fetchPrograms, 
    fetchSessionLogs, 
    fetchSquadMembers, 
    fetchPlayerLogs, 
    fetchSquadLeaderboard, 
    markSquadAttendance 
} from '../services/api';

export default function SquadDetailScreen({ navigation, route }) {
  const { squad } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  
  // Data State
  const [members, setMembers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  
  // Attendance State
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedForAttendance, setSelectedForAttendance] = useState([]);
  const [isSessionLaunch, setIsSessionLaunch] = useState(false); 

  // Program State
  const [squadProgram, setSquadProgram] = useState(null);
  const [coachProgress, setCoachProgress] = useState(0);
  const [nextCoachSession, setNextCoachSession] = useState(null);
  
  const [playerProgram, setPlayerProgram] = useState(null);
  const [playerStats, setPlayerStats] = useState([]);
  const [aggPlayerProgress, setAggPlayerProgress] = useState(0);

  const loadData = async () => {
    if (!squad?.id) return;
    setLoading(true);
    
    try {
        const lbPromise = typeof fetchSquadLeaderboard === 'function' ? fetchSquadLeaderboard(squad.id) : Promise.resolve([]);

        const [allPrograms, myLogs, squadMembers, lbData] = await Promise.all([
            fetchPrograms(),
            fetchSessionLogs(),
            fetchSquadMembers(squad.id),
            lbPromise
        ]);

        const memberList = squadMembers || [];
        setMembers(memberList);
        setLeaderboard(lbData || []);
        
        setSelectedForAttendance(memberList.map(m => m.id));

        // ------------------------------------------------------
        // 1. SQUAD PROGRAM (Coach-Led Sessions)
        // ------------------------------------------------------
        const activeSquadProgram = allPrograms
            .filter(p => p.program_type === 'SQUAD_SESSION' && p.squad_id === squad.id && p.status !== 'ARCHIVED')
            .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0];

        if (activeSquadProgram) {
            setSquadProgram(activeSquadProgram);
            const totalSessions = activeSquadProgram.schedule ? new Set(activeSquadProgram.schedule.map(s => s.day_order)).size : 0;
            const coachCompletedIds = new Set(
                myLogs.filter(l => l.program_id === activeSquadProgram.id).map(l => l.session_id)
            );
            setCoachProgress(totalSessions > 0 ? (coachCompletedIds.size / totalSessions) * 100 : 0);

            if (coachCompletedIds.size < totalSessions) {
                const dayOrders = [...new Set(activeSquadProgram.schedule.map(s => s.day_order))].sort((a,b)=>a-b);
                const nextDay = dayOrders.find(d => !coachCompletedIds.has(d));
                if (nextDay) {
                    const items = activeSquadProgram.schedule.filter(s => s.day_order === nextDay);
                    const duration = items.reduce((acc, i) => acc + (i.duration_minutes || i.duration || 0), 0);
                    setNextCoachSession({ day_order: nextDay, title: `Session ${nextDay}`, duration, drillCount: items.length, items });
                }
            }
        }

        // ------------------------------------------------------
        // 2. PLAYER PROGRAM (The "Team Plan")
        // ------------------------------------------------------
        // Logic: Must be PLAYER_PLAN type AND explicitly assigned to the Squad ID
        
        const activePlayerProgram = allPrograms
            .filter(p => {
                const isPlayerPlan = p.program_type === 'PLAYER_PLAN' || !p.program_type; // Default to player plan if null
                if (!isPlayerPlan || p.status === 'ARCHIVED') return false;

                // Check 1: Is the 'squad_id' field set on the program row?
                if (p.squad_id === squad.id) return true;

                // Check 2: Is the squad ID inside the 'assigned_to' array?
                // assigned_to can be array of strings ["squad_123"] or objects [{id: "squad_123"}]
                const isAssignedDirectly = p.assigned_to?.some(target => {
                    const targetId = typeof target === 'string' ? target : target.id;
                    return targetId === squad.id;
                });

                return isAssignedDirectly;
            })
            // If multiple exist, take the most recently created one
            .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0];

        if (activePlayerProgram) {
            setPlayerProgram(activePlayerProgram);
            
            if (memberList.length > 0) {
                // Calculate unique session days in the program
                const totalPlayerSessions = activePlayerProgram.schedule ? new Set(activePlayerProgram.schedule.map(s => s.day_order)).size : 0;
                
                // Calculate stats for each member against THIS program only
                const stats = await Promise.all(memberList.map(async (member) => {
                    try {
                        const memberAllLogs = await fetchPlayerLogs(member.id); 
                        
                        // Strict Filter: Only count logs for this specific program ID
                        const relevantLogs = memberAllLogs.filter(l => l.program_id === activePlayerProgram.id);
                        
                        const uniqueSessionsDone = new Set(relevantLogs.map(l => l.session_id)).size;
                        const prog = totalPlayerSessions > 0 ? (uniqueSessionsDone / totalPlayerSessions) * 100 : 0;
                        
                        return { ...member, logCount: uniqueSessionsDone, progress: Math.min(prog, 100) };
                    } catch (e) { 
                        return { ...member, logCount: 0, progress: 0 }; 
                    }
                }));
                
                setPlayerStats(stats);
                const totalProg = stats.reduce((acc, s) => acc + s.progress, 0);
                setAggPlayerProgress(stats.length > 0 ? totalProg / stats.length : 0);
            }
        } else {
            // No team plan found
            setPlayerProgram(null);
            setPlayerStats(memberList.map(m => ({ ...m, logCount: 0, progress: 0 })));
            setAggPlayerProgress(0);
        }

    } catch (e) {
        console.error("Squad Load Error:", e);
        Alert.alert("Error", "Failed to load squad data.");
    } finally {
        setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, [squad]));

  // --- ACTIONS ---

  const handleSubmitAttendance = async () => {
      try {
          if (typeof markSquadAttendance !== 'function') throw new Error("API not updated");
          await markSquadAttendance(squad.id, selectedForAttendance);
          
          if (isSessionLaunch) {
              setShowAttendanceModal(false);
              setIsSessionLaunch(false);
              if (nextCoachSession && squadProgram) {
                  navigation.navigate('Session', { 
                      session: nextCoachSession, 
                      programId: squadProgram.id, 
                      squadId: squad.id
                  });
              }
          } else {
              Alert.alert("Success", "Attendance recorded!");
              setShowAttendanceModal(false);
              loadData(); 
          }
      } catch (e) {
          Alert.alert("Error", "Could not mark attendance.");
      }
  };

  const handleStartSession = () => {
    if (!nextCoachSession || !squadProgram) return;
    setIsSessionLaunch(true); 
    setShowAttendanceModal(true);
  };

  const handleCreateSquadProgram = () => {
    // Navigates to builder in 'Squad Mode' but for assigning a plan
    navigation.navigate('ProgramBuilder', { 
        squadMode: true, // This ensures it associates with the squad
        initialPrompt: `Create a training plan for ${squad?.name}`, 
        autoStart: false, 
        targetIds: [squad.id] // Pre-selects this squad ID
    });
  };

  const toggleAttendance = (id) => {
      if (selectedForAttendance.includes(id)) {
          setSelectedForAttendance(prev => prev.filter(i => i !== id));
      } else {
          setSelectedForAttendance(prev => [...prev, id]);
      }
  };

  const handleCancelAttendance = () => {
      setShowAttendanceModal(false);
      setIsSessionLaunch(false); 
  };

  if (!squad) return null;
  if (loading) return (
      <SafeAreaView style={styles.container}>
          <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      </SafeAreaView>
  );

  const renderOverview = () => (
      <>
        {/* 1. COACH-LED SECTION */}
        <Text style={styles.sectionLabel}>SQUAD SESSION (COACH LED)</Text>
        {squadProgram ? (
            nextCoachSession ? (
                <View style={styles.upNextCard}>
                    <View style={styles.upNextHeader}>
                        <View style={styles.tag}><Text style={styles.tagText}>UP NEXT</Text></View>
                        <Text style={styles.programName}>{squadProgram.title}</Text>
                    </View>
                    <View style={styles.sessionRow}>
                        <View style={{flex: 1}}>
                            <Text style={styles.sessionTitle}>{nextCoachSession.title}</Text>
                            <View style={styles.metaRow}>
                                <View style={styles.metaItem}><Clock size={14} color="#64748B" /><Text style={styles.metaText}>{nextCoachSession.duration}m</Text></View>
                                <View style={styles.metaItem}><Dumbbell size={14} color="#64748B" /><Text style={styles.metaText}>{nextCoachSession.drillCount} Drills</Text></View>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.playBtn} onPress={handleStartSession}>
                            <Play size={24} color="#FFF" fill="#FFF" style={{marginLeft: 2}} />
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <TouchableOpacity style={styles.completedBanner} disabled>
                    <Check size={20} color="#FFF" />
                    <Text style={styles.completedText}>Squad Program Completed</Text>
                </TouchableOpacity>
            )
        ) : (
            <TouchableOpacity style={styles.createBanner} onPress={() => navigation.navigate('ProgramBuilder', { squadMode: true, targetIds: [squad.id] })}>
                <Edit2 size={24} color="#FFF" />
                <Text style={styles.createText}>Create Squad Program</Text>
            </TouchableOpacity>
        )}

        {/* 2. STATS GRID */}
        <View style={styles.statsGrid}>
            {/* Left: Coach Progress */}
            <View style={styles.statCard}>
                <Text style={[styles.bigPercent, { color: '#10B981' }]}>{Math.round(coachProgress)}%</Text>
                <Text style={styles.statLabel}>COACH EXECUTION</Text>
                <View style={styles.miniBarBg}><View style={[styles.miniBarFill, { width: `${coachProgress}%`, backgroundColor: '#10B981' }]} /></View>
            </View>
            
            {/* Right: Player Progress (Aggregated from Team Plan) */}
            <View style={styles.statCard}>
                <Text style={[styles.bigPercent, { color: '#3B82F6' }]}>{Math.round(aggPlayerProgress)}%</Text>
                <Text style={styles.statLabel}>PLAYER COMPLETION</Text>
                <View style={styles.miniBarBg}><View style={[styles.miniBarFill, { width: `${aggPlayerProgress}%`, backgroundColor: '#3B82F6' }]} /></View>
            </View>
        </View>

        {/* 3. PLAYER PROGRESS LIST */}
        <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
            <Text style={styles.sectionLabel}>PLAYER PROGRESS {playerProgram ? `(${playerProgram.title})` : ''}</Text>
            {/* Button to assign a player plan to the squad */}
            {!playerProgram && (
                <TouchableOpacity onPress={() => navigation.navigate('ProgramBuilder', { squadMode: false, targetIds: [squad.id] })}>
                    <Text style={{fontSize: 12, color: COLORS.primary, fontWeight: '700'}}>+ Assign Plan</Text>
                </TouchableOpacity>
            )}
        </View>

        <View style={styles.listContainer}>
            {playerStats.length > 0 ? (
                playerStats.map((player, idx) => (
                    <View key={idx} style={styles.playerRow}>
                        <View style={styles.avatar}><Text style={styles.avatarText}>{player.name ? player.name[0] : 'U'}</Text></View>
                        <View style={{flex: 1, marginHorizontal: 12}}>
                            <Text style={styles.playerName}>{player.name}</Text>
                            <Text style={styles.playerSub}>{playerProgram ? `${player.logCount} Sessions Done` : 'No team plan assigned'}</Text>
                        </View>
                        {playerProgram && (
                            <View style={{alignItems: 'flex-end'}}>
                                <Text style={[styles.percentText, { color: player.progress === 100 ? '#10B981' : '#3B82F6' }]}>{Math.round(player.progress)}%</Text>
                                <View style={styles.rowBarBg}><View style={[styles.rowBarFill, { width: `${player.progress}%`, backgroundColor: player.progress === 100 ? '#10B981' : '#3B82F6' }]} /></View>
                            </View>
                        )}
                    </View>
                ))
            ) : <Text style={styles.emptyText}>No players in squad.</Text>}
        </View>
      </>
  );

  const renderLeaderboard = () => (
      <View style={{gap: 16}}>
          <View style={styles.lbHeaderRow}>
              <Text style={[styles.lbHeaderCell, {flex: 2}]}>Athlete</Text>
              <Text style={styles.lbHeaderCell}>Attend</Text>
              <Text style={styles.lbHeaderCell}>Sessions</Text>
              <Text style={styles.lbHeaderCell}>Score</Text>
          </View>
          
          {leaderboard.length > 0 ? (
              leaderboard.map((item, index) => (
                  <View key={item.player_id} style={styles.lbRow}>
                      <View style={[styles.rankBadge, index < 3 && styles[`rank${index}`]]}>
                          <Text style={[styles.rankText, index < 3 && {color:'#FFF'}]}>{index + 1}</Text>
                      </View>
                      <View style={{flex: 2, flexDirection:'row', alignItems:'center', gap: 8}}>
                          <View style={styles.lbAvatar}><Text style={{fontSize:10, fontWeight:'700', color: '#64748B'}}>{item.name ? item.name[0] : '?'}</Text></View>
                          <Text style={styles.lbName} numberOfLines={1}>{item.name}</Text>
                      </View>
                      <Text style={styles.lbValue}>{item.attendance_count}</Text>
                      <Text style={styles.lbValue}>{item.sessions_completed}</Text>
                      <Text style={[styles.lbValue, {color: COLORS.primary}]}>{item.drill_score}</Text>
                  </View>
              ))
          ) : <Text style={styles.emptyText}>No data yet.</Text>}

          <TouchableOpacity style={styles.attendanceBtn} onPress={() => { setIsSessionLaunch(false); setShowAttendanceModal(true); }}>
              <UserCheck size={20} color="#FFF" />
              <Text style={styles.attendanceBtnText}>Mark Attendance</Text>
          </TouchableOpacity>
      </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ChevronLeft size={24} color="#0F172A" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Squad Profile</Text>
        <View style={{flexDirection: 'row', gap: 12}}>
            <TouchableOpacity style={styles.iconBtn}><Edit2 size={20} color="#64748B"/></TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabRow}>
          <TouchableOpacity onPress={() => setActiveTab('OVERVIEW')} style={[styles.tab, activeTab === 'OVERVIEW' && styles.activeTab]}>
              <Text style={[styles.tabText, activeTab === 'OVERVIEW' && styles.activeTabText]}>Overview</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('LEADERBOARD')} style={[styles.tab, activeTab === 'LEADERBOARD' && styles.activeTab]}>
              <Text style={[styles.tabText, activeTab === 'LEADERBOARD' && styles.activeTabText]}>Leaderboard</Text>
          </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}>
        <View style={styles.titleSection}>
            <Text style={styles.squadName}>{squad.name}</Text>
            <Text style={styles.squadSub}>{squad.level || 'General'} • {members.length} Members</Text>
        </View>

        {activeTab === 'OVERVIEW' ? renderOverview() : renderLeaderboard()}
      </ScrollView>

      {/* ATTENDANCE MODAL */}
      <Modal visible={showAttendanceModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>{isSessionLaunch ? "Who is here today?" : "Mark Attendance"}</Text>
                  <Text style={styles.modalSub}>{isSessionLaunch ? "Confirm attendance before starting." : "Select players present today:"}</Text>
                  
                  <ScrollView style={{maxHeight: 300, marginVertical: 16}}>
                      {members.map(m => (
                          <TouchableOpacity key={m.id} style={styles.checkRow} onPress={() => toggleAttendance(m.id)}>
                              <Text style={styles.checkName}>{m.name}</Text>
                              <View style={[styles.checkBox, selectedForAttendance.includes(m.id) && styles.checkedBox]}>
                                  {selectedForAttendance.includes(m.id) && <Check size={14} color="#FFF"/>}
                              </View>
                          </TouchableOpacity>
                      ))}
                  </ScrollView>

                  <View style={{flexDirection: 'row', gap: 12}}>
                      <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelAttendance}>
                          <Text style={styles.cancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.saveBtn, isSessionLaunch && {backgroundColor: '#16A34A'}]} 
                        onPress={handleSubmitAttendance}
                      >
                          <Text style={styles.saveText}>{isSessionLaunch ? "Start Session" : "Save Attendance"}</Text>
                      </TouchableOpacity>
                  </View>
              </View>
          </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24, backgroundColor: '#FFF' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  backBtn: { padding: 4 },
  iconBtn: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 8 },
  content: { paddingHorizontal: 24, paddingBottom: 100 },

  titleSection: { marginBottom: 24 },
  squadName: { fontSize: 32, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  squadSub: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#94A3B8', marginBottom: 12, marginTop: 8, letterSpacing: 0.5 },

  tabRow: { flexDirection: 'row', paddingHorizontal: 24, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tab: { paddingVertical: 12, marginRight: 24, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  activeTabText: { color: COLORS.primary },

  lbHeaderRow: { flexDirection: 'row', marginBottom: 12, paddingHorizontal: 8 },
  lbHeaderCell: { flex: 1, fontSize: 11, fontWeight: '700', color: '#94A3B8', textAlign: 'center' },
  lbRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 12, marginBottom: 8, ...SHADOWS.small },
  rankBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rank0: { backgroundColor: '#F59E0B' },
  rank1: { backgroundColor: '#94A3B8' },
  rank2: { backgroundColor: '#B45309' },
  rankText: { fontSize: 12, fontWeight: '800', color: '#64748B' },
  lbAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  lbName: { fontSize: 14, fontWeight: '700', color: '#334155' },
  lbValue: { flex: 1, textAlign: 'center', fontSize: 14, fontWeight: '700', color: '#334155' },
  
  attendanceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#334155', padding: 16, borderRadius: 12, marginTop: 24 },
  attendanceBtnText: { color: '#FFF', fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  modalSub: { fontSize: 14, color: '#64748B', marginBottom: 12 },
  checkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  checkName: { fontSize: 16, color: '#334155' },
  checkBox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  checkedBox: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  cancelBtn: { flex: 1, padding: 14, alignItems: 'center' },
  cancelText: { color: '#64748B', fontWeight: '700' },
  saveBtn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  saveText: { color: '#FFF', fontWeight: '700' },

  upNextCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 24, ...SHADOWS.medium, borderLeftWidth: 4, borderLeftColor: COLORS.primary },
  upNextHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  tag: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tagText: { fontSize: 10, fontWeight: '800', color: '#15803D' },
  programName: { fontSize: 12, color: '#64748B', flex: 1, textAlign: 'right' },
  sessionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sessionTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  metaRow: { flexDirection: 'row', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#64748B' },
  playBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  createBanner: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 24 },
  createText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  completedBanner: { backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 24 },
  completedText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 20, alignItems: 'center', ...SHADOWS.small },
  bigPercent: { fontSize: 36, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 12, textAlign: 'center' },
  miniBarBg: { width: '100%', height: 6, backgroundColor: '#F1F5F9', borderRadius: 3 },
  miniBarFill: { height: '100%', borderRadius: 3 },
  listContainer: { backgroundColor: '#FFF', borderRadius: 16, padding: 8, ...SHADOWS.small, marginBottom: 24 },
  playerRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#0284C7' },
  playerName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  playerSub: { fontSize: 12, color: '#64748B' },
  percentText: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  rowBarBg: { width: 60, height: 4, backgroundColor: '#F1F5F9', borderRadius: 2 },
  rowBarFill: { height: '100%', borderRadius: 2 },
  emptyText: { color: '#94A3B8', fontStyle: 'italic', padding: 12, textAlign: 'center' },
});