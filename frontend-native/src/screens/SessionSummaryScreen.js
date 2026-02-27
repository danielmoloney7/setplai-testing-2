import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Clock, Activity, CheckCircle, XCircle, Trophy, BarChart2, ArrowRight, Share2 } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { fetchSessionLogs, fetchPrograms } from '../services/api';
import ShareCardModal from '../components/ShareCardModal';

export default function SessionSummaryScreen({ navigation, route }) {
  // Ensure we have fallbacks if params are missing
  const { session = {}, programId } = route.params || {};
  
  const [logs, setLogs] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // State for completion
  const [programData, setProgramData] = useState(null);
  
  // Controls whether we show the special "Finish Program" button
  const [isNewProgramCompletion, setIsNewProgramCompletion] = useState(false);

  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
        console.log("🔄 Checking Program Completion for ID:", programId);

        const [allLogs, allPrograms] = await Promise.all([
            fetchSessionLogs(),
            fetchPrograms()
        ]);
        
        // 1. Find the Log for THIS specific session
        const matchLog = allLogs.find(l => 
            l.program_id === programId && 
            Number(l.session_id) === Number(session.day_order)
        );
        setLogs(matchLog);

        // 2. Determine if the ENTIRE Program is complete
        const matchProgram = allPrograms.find(p => p.id === programId);
        
        if (matchProgram) {
            setProgramData(matchProgram);

            // A. Get all 'Day Orders' required by the schedule (e.g. [1, 2, 3, 4])
            const requiredDays = new Set(
                (matchProgram.schedule || matchProgram.sessions || []).map(s => Number(s.day_order || s.day))
            );

            // B. Get all 'Session IDs' completed by the user for this program
            const completedDays = new Set(
                allLogs
                .filter(l => l.program_id === programId)
                .map(l => Number(l.session_id))
            );

            // C. Add the CURRENT session (in case the API fetch was slightly too fast and missed the newest log)
            completedDays.add(Number(session.day_order));

            // D. Check if we have done every required day
            const isComplete = Array.from(requiredDays).every(day => completedDays.has(day));

            console.log(`📊 Progress: ${completedDays.size}/${requiredDays.size} Sessions Completed.`);
            
            // ✅ THE FIX: Only trigger the celebration if the program is technically finished 
            // BUT hasn't actually been marked 'COMPLETED' in the database yet.
            if (isComplete && matchProgram.status !== 'COMPLETED') {
                console.log("🎉 NEW PROGRAM COMPLETION DETECTED!");
                setIsNewProgramCompletion(true);
            } else {
                console.log("Program is either unfinished, or was already completed previously.");
                setIsNewProgramCompletion(false);
            }
        }

    } catch (e) {
        console.error("Failed to load summary data", e);
    } finally {
        setLoading(false);
    }
  };

  const handleContinue = () => {
      if (isNewProgramCompletion) {
          // 🎉 Navigate to Celebration Screen (Replace prevents going back)
          navigation.replace('ProgramComplete', { program: programData });
      } else {
          // Normal return to Dashboard
          navigation.navigate('Main');
      }
  };

  // --- Render Helpers ---
  const Header = () => (
    <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session Summary</Text>
        <View style={{width: 24}} />
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* STATS CARD */}
        <View style={styles.statsCard}>
            <Text style={styles.sessionTitle}>{session.title || "Training Session"}</Text>
            <Text style={styles.date}>{logs ? new Date(logs.date_completed || Date.now()).toDateString() : "Just Now"}</Text>
            
            <View style={styles.statRow}>
                <View style={styles.statItem}>
                    <Clock size={20} color="#64748B" />
                    <Text style={styles.statValue}>{logs?.duration_minutes || 0}m</Text>
                    <Text style={styles.statLabel}>Duration</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statItem}>
                    <Activity size={20} color={(logs?.rpe || 0) > 7 ? '#EF4444' : '#10B981'} />
                    <Text style={[styles.statValue, { color: (logs?.rpe || 0) > 7 ? '#EF4444' : '#10B981' }]}>
                        {logs?.rpe || '-'}/10
                    </Text>
                    <Text style={styles.statLabel}>Intensity</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statItem}>
                    <Trophy size={20} color="#F59E0B" />
                    <Text style={styles.statValue}>+{logs?.xp_earned || 50}</Text>
                    <Text style={styles.statLabel}>XP</Text>
                </View>
            </View>
        </View>

        {/* DRILL LIST */}
        <Text style={styles.sectionTitle}>Drill Performance</Text>
        {session.items && session.items.map((item, index) => {
            // Logic to match drill result to drill item
            const drillId = item.drill_id || item.drillId || item.id;
            const perf = logs?.drill_performances?.find(p => p.drill_id === drillId) || logs?.drill_performances?.[index];
            
            // ✅ IDENTIFY OUTCOMES ROBUSTLY
            const isSuccess = perf?.outcome === 'success';
            const isSkipped = perf?.outcome === 'skipped' || !perf; // Check explicit skipped flag or missing log

            return (
                <View key={index} style={[styles.drillCard, isSkipped && { opacity: 0.6 }]}>
                    <View style={styles.drillHeader}>
                        <View style={{flex: 1}}>
                            <Text style={styles.drillName}>{item.drill_name || item.name || "Drill"}</Text>
                            <Text style={styles.drillMeta}>{item.duration_minutes || 10} min</Text>
                        </View>
                        {isSkipped ? (
                            <Text style={styles.skippedText}>Skipped</Text>
                        ) : isSuccess ? (
                            <CheckCircle color="#16A34A" size={24} />
                        ) : (
                            <XCircle color="#DC2626" size={24} />
                        )}
                    </View>

                    {/* ✅ ONLY SHOW PERFORMANCE DETAILS IF ACTUALLY ATTEMPTED */}
                    {!isSkipped && perf && (
                        <View style={styles.perfRow}>
                             <View style={[styles.badge, { backgroundColor: isSuccess ? '#DCFCE7' : '#FEE2E2' }]}>
                                <Text style={[styles.badgeText, { color: isSuccess ? '#16A34A' : '#DC2626' }]}>
                                    {isSuccess ? 'COMPLETED' : 'ATTEMPTED'}
                                </Text>
                            </View>
                            {perf.achieved_value > 0 && (
                                <View style={styles.targetBox}>
                                    <BarChart2 size={14} color="#64748B" />
                                    <Text style={styles.targetText}>Score: {perf.achieved_value}</Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>
            );
        })}

        {/* 🔥 FIXED ACTION BUTTONS */}
        <View style={styles.actionContainer}>
            <TouchableOpacity 
                style={styles.shareBtn} 
                onPress={() => setShowShareModal(true)}
                activeOpacity={0.8}
            >
                <Share2 size={20} color="#0F172A" />
                <Text style={styles.shareBtnText}>Share to Social</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.continueBtn, isNewProgramCompletion && styles.completeBtn]} 
                onPress={handleContinue}
                activeOpacity={0.9}
            >
                <Text style={styles.continueText}>
                    {isNewProgramCompletion ? "Finish Program" : "Return to Dashboard"}
                </Text>
                {isNewProgramCompletion ? <Trophy size={20} color="#FFF" /> : <ArrowRight size={20} color="#FFF" />}
            </TouchableOpacity>
        </View>

      </ScrollView>

      {/* 🔥 THE MODAL */}
      <ShareCardModal 
          visible={showShareModal} 
          onClose={() => setShowShareModal(false)} 
          sessionLog={{ ...session, ...logs }} 
      />
      
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E2E8F0' },
    headerTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
    backBtn: { padding: 4 },
    content: { padding: 24, paddingBottom: 40 },
    statsCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 24, ...SHADOWS.medium },
    sessionTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
    date: { fontSize: 14, color: '#64748B', marginBottom: 20 },
    statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statItem: { alignItems: 'center', flex: 1 },
    statValue: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginTop: 4 },
    statLabel: { fontSize: 12, color: '#64748B', marginTop: 2 },
    divider: { width: 1, height: 40, backgroundColor: '#E2E8F0' },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 12 },
    
    // Drill Card Styles
    drillCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
    drillHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    drillName: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
    drillMeta: { fontSize: 12, color: '#64748B' },
    skippedText: { fontSize: 13, fontStyle: 'italic', color: '#94A3B8', fontWeight: '600' },
    
    // Performance Row inside Drill Card
    perfRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 12 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeText: { fontSize: 10, fontWeight: '800' },
    targetBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0' },
    targetText: { fontSize: 12, color: '#475569', fontWeight: '600' },
    
    // Action Buttons Container
    actionContainer: {
        marginTop: 32,
        gap: 12,
    },
    shareBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: '#FFF', 
        paddingVertical: 18,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        ...SHADOWS.small
    },
    shareBtnText: {
        color: '#0F172A',
        fontSize: 16,
        fontWeight: '800',
    },
    continueBtn: {
        backgroundColor: '#334155', // Default Gray/Slate
        paddingVertical: 18,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        ...SHADOWS.medium
    },
    completeBtn: {
        backgroundColor: COLORS.primary, // Green/Brand Color for Celebration
    },
    continueText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800'
    }
});