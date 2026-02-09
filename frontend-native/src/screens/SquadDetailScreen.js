import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, Edit2, Trash2, Plus, Play, Check, Clock, Dumbbell, Calendar, TrendingUp } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { fetchPrograms, fetchSessionLogs, fetchSquadMembers } from '../services/api';

export default function SquadDetailScreen({ navigation, route }) {
  const { squad } = route.params;
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [members, setMembers] = useState([]);
  const [activeProgram, setActiveProgram] = useState(null); 
  
  // Coach Execution State
  const [coachProgress, setCoachProgress] = useState(0);
  const [nextCoachSession, setNextCoachSession] = useState(null);
  
  // Player Execution State
  const [playerStats, setPlayerStats] = useState([]);
  const [aggPlayerProgress, setAggPlayerProgress] = useState(0);

  const loadData = async () => {
    setLoading(true);
    try {
        // 1. Fetch Core Data
        const [allPrograms, myLogs, squadMembers] = await Promise.all([
            fetchPrograms(),
            fetchSessionLogs(), // Coach's logs (to track Squad Program progress)
            fetchSquadMembers(squad.id)
        ]);

        // Ensure we have a list of member IDs for matching
        const memberList = squadMembers || [];
        const memberIds = new Set(memberList.map(m => m.id));
        setMembers(memberList);

        // 2. Find the Most Recent Program Assigned to this Squad
        // ✅ FIX: Match if assigned to Squad ID directly OR if assigned to ANY squad member
        const relevantProgram = allPrograms
            .filter(p => {
                if (p.status === 'ARCHIVED') return false;
                
                const assignees = p.assigned_to || [];
                // Check if the Squad ID is in the list
                const assignedToSquad = assignees.some(a => a.id === squad.id);
                // Check if any Squad Member is in the list (Handling expanded assignments)
                const assignedToMember = assignees.some(a => memberIds.has(a.id));
                
                return assignedToSquad || assignedToMember;
            })
            .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0];

        if (relevantProgram) {
            setActiveProgram(relevantProgram);

            // --- A. COACH'S SQUAD PROGRAM LOGIC ---
            // Coach execution tracking
            const totalSessions = relevantProgram.schedule ? new Set(relevantProgram.schedule.map(s => s.day_order)).size : 0;
            
            const coachCompletedIds = new Set(
                myLogs
                .filter(l => l.program_id === relevantProgram.id)
                .map(l => l.session_id)
            );
            
            const cProg = totalSessions > 0 ? (coachCompletedIds.size / totalSessions) * 100 : 0;
            setCoachProgress(cProg);

            // Find Next Session for Coach
            if (coachCompletedIds.size < totalSessions) {
                const dayOrders = [...new Set(relevantProgram.schedule.map(s => s.day_order))].sort((a,b)=>a-b);
                const nextDay = dayOrders.find(d => !coachCompletedIds.has(d));
                
                if (nextDay) {
                    const items = relevantProgram.schedule.filter(s => s.day_order === nextDay);
                    const duration = items.reduce((acc, i) => acc + (i.duration_minutes || i.duration || 0), 0);
                    
                    setNextCoachSession({
                        day_order: nextDay,
                        title: `Session ${nextDay}`,
                        duration: duration,
                        drillCount: items.length,
                        items: items
                    });
                }
            } else {
                setNextCoachSession(null); 
            }

            // --- B. PLAYERS' PROGRAM LOGIC ---
            // Track individual player progress
            if (memberList.length > 0) {
                const stats = await Promise.all(memberList.map(async (member) => {
                    try {
                        const memberAllLogs = await fetchSessionLogs(member.id); 
                        const relevantLogs = memberAllLogs.filter(l => l.program_id === relevantProgram.id);
                        const uniqueSessionsDone = new Set(relevantLogs.map(l => l.session_id)).size;
                        const prog = totalSessions > 0 ? (uniqueSessionsDone / totalSessions) * 100 : 0;

                        return { 
                            ...member, 
                            logCount: uniqueSessionsDone, 
                            progress: Math.min(prog, 100) 
                        };
                    } catch (e) {
                        return { ...member, logCount: 0, progress: 0 };
                    }
                }));
                
                setPlayerStats(stats);
                const totalProg = stats.reduce((acc, s) => acc + s.progress, 0);
                setAggPlayerProgress(stats.length > 0 ? totalProg / stats.length : 0);
            }
        } else {
            // No program found
            setActiveProgram(null);
            setCoachProgress(0);
            setAggPlayerProgress(0);
            setPlayerStats(memberList.map(m => ({ ...m, logCount: 0, progress: 0 })));
        }

    } catch (e) {
        console.error("Squad Load Error:", e);
    } finally {
        setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [squad])
  );

  const handleStartSession = () => {
    if (!nextCoachSession || !activeProgram) return;
    navigation.navigate('Session', { 
        session: nextCoachSession, 
        programId: activeProgram.id 
    });
  };

  const handleAssignProgram = () => {
    navigation.navigate('ProgramBuilder', { 
        squadMode: true, 
        initialPrompt: `Create a program for ${squad.name} (${squad.level})` 
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Squad Profile</Text>
        <View style={{flexDirection: 'row', gap: 12}}>
            <TouchableOpacity style={styles.iconBtn}><Edit2 size={20} color="#64748B"/></TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}>
        
        {/* Squad Info */}
        <View style={styles.titleSection}>
            <Text style={styles.squadName}>{squad.name}</Text>
            <Text style={styles.squadSub}>
                {squad.level || 'General'} • {members.length} Members
            </Text>
        </View>

        {/* --- COACH'S SQUAD PROGRAM CARD --- */}
        <Text style={styles.sectionLabel}>CURRENT SQUAD PROGRAM</Text>
        {activeProgram ? (
            nextCoachSession ? (
                <View style={styles.upNextCard}>
                    <View style={styles.upNextHeader}>
                        <View style={styles.tag}><Text style={styles.tagText}>UP NEXT</Text></View>
                        <Text style={styles.programName}>{activeProgram.title}</Text>
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
            <TouchableOpacity style={styles.createBanner} onPress={handleAssignProgram}>
                <Plus size={24} color="#FFF" />
                <Text style={styles.createText}>Create Squad Program</Text>
            </TouchableOpacity>
        )}

        {/* --- STATS GRID --- */}
        <View style={styles.statsGrid}>
            <View style={styles.statCard}>
                <Text style={[styles.bigPercent, { color: '#10B981' }]}>{Math.round(coachProgress)}%</Text>
                <Text style={styles.statLabel}>COACH EXECUTION</Text>
                <View style={styles.miniBarBg}>
                    <View style={[styles.miniBarFill, { width: `${coachProgress}%`, backgroundColor: '#10B981' }]} />
                </View>
            </View>

            <View style={styles.statCard}>
                <Text style={[styles.bigPercent, { color: '#3B82F6' }]}>{Math.round(aggPlayerProgress)}%</Text>
                <Text style={styles.statLabel}>PLAYER COMPLETION</Text>
                <View style={styles.miniBarBg}>
                    <View style={[styles.miniBarFill, { width: `${aggPlayerProgress}%`, backgroundColor: '#3B82F6' }]} />
                </View>
            </View>
        </View>

        {/* --- PLAYER PROGRESS LIST --- */}
        <Text style={styles.sectionLabel}>PLAYER PROGRESS ({activeProgram ? 'Active' : 'None'})</Text>
        
        <View style={styles.listContainer}>
            {playerStats.length > 0 ? (
                playerStats.map((player, idx) => (
                    <View key={idx} style={styles.playerRow}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{player.name ? player.name[0] : 'U'}</Text>
                        </View>
                        
                        <View style={{flex: 1, marginHorizontal: 12}}>
                            <Text style={styles.playerName}>{player.name}</Text>
                            <Text style={styles.playerSub}>
                                {activeProgram 
                                    ? `${player.logCount} Sessions Done`
                                    : 'No active program assigned'}
                            </Text>
                        </View>

                        {activeProgram && (
                            <View style={{alignItems: 'flex-end'}}>
                                <Text style={[styles.percentText, { color: player.progress === 100 ? '#10B981' : '#3B82F6' }]}>
                                    {Math.round(player.progress)}%
                                </Text>
                                <View style={styles.rowBarBg}>
                                    <View style={[styles.rowBarFill, { width: `${player.progress}%`, backgroundColor: player.progress === 100 ? '#10B981' : '#3B82F6' }]} />
                                </View>
                            </View>
                        )}
                    </View>
                ))
            ) : (
                <Text style={styles.emptyText}>No players in squad.</Text>
            )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24, backgroundColor: '#FFF' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  backBtn: { padding: 4 },
  iconBtn: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 8 },
  content: { paddingHorizontal: 24, paddingBottom: 100 },

  titleSection: { marginBottom: 24 },
  squadName: { fontSize: 32, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  squadSub: { fontSize: 14, color: '#64748B', fontWeight: '500' },

  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#94A3B8', marginBottom: 12, marginTop: 8, letterSpacing: 0.5 },

  // Up Next Card
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

  // Banners
  createBanner: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 24 },
  createText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  completedBanner: { backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 24 },
  completedText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  // Stats
  statsGrid: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 20, alignItems: 'center', ...SHADOWS.small },
  bigPercent: { fontSize: 36, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 12, textAlign: 'center' },
  miniBarBg: { width: '100%', height: 6, backgroundColor: '#F1F5F9', borderRadius: 3 },
  miniBarFill: { height: '100%', borderRadius: 3 },

  // Player List
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