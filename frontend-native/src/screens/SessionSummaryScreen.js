import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Clock, Activity, CheckCircle, XCircle, Trophy, BarChart2, Bug } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { fetchSessionLogs } from '../services/api';

export default function SessionSummaryScreen({ navigation, route }) {
  const { session, programId } = route.params;
  const [logs, setLogs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
        const allLogs = await fetchSessionLogs();
        
        // Match Log by Program ID + Session Index
        const match = allLogs.find(l => 
            l.program_id === programId && 
            String(l.session_id) === String(session.day_order)
        );
        
        setLogs(match);

    } catch (e) {
        console.error("Failed to load logs", e);
    } finally {
        setLoading(false);
    }
  };

  const Header = () => (
    <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session Summary</Text>
        <View style={{width: 24}} />
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;

  if (!logs) return (
      <SafeAreaView style={styles.container}>
          <Header />
          <View style={styles.center}>
              <Text style={styles.emptyText}>No data recorded for this session.</Text>
          </View>
      </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* STATS CARD */}
        <View style={styles.statsCard}>
            <Text style={styles.sessionTitle}>{session.title}</Text>
            <Text style={styles.date}>{new Date(logs.created_at || Date.now()).toDateString()}</Text>
            
            <View style={styles.statRow}>
                <View style={styles.statItem}>
                    <Clock size={20} color="#64748B" />
                    <Text style={styles.statValue}>{logs.duration_minutes || 0}m</Text>
                    <Text style={styles.statLabel}>Duration</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statItem}>
                    <Activity size={20} color={(logs.rpe || 0) > 7 ? '#EF4444' : '#10B981'} />
                    <Text style={[styles.statValue, { color: (logs.rpe || 0) > 7 ? '#EF4444' : '#10B981' }]}>
                        {logs.rpe || '-'}/10
                    </Text>
                    <Text style={styles.statLabel}>Intensity</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statItem}>
                    <Trophy size={20} color="#F59E0B" />
                    <Text style={styles.statValue}>{logs.xp_earned || 50}</Text>
                    <Text style={styles.statLabel}>XP Earned</Text>
                </View>
            </View>
        </View>

        {/* DRILL LIST */}
        <Text style={styles.sectionTitle}>Drill Performance</Text>
        
        {session.items.map((item, index) => {
            // --- ROBUST MATCHING LOGIC ---
            const targetId = item.drill_id || item.drillId || item.id;
            const targetName = (item.drill_name || item.name || "").trim().toLowerCase();

            // 1. Try ID Match
            let perf = logs.drill_performances?.find(p => 
                p.drill_id === targetId || 
                p.drill_id === item.drill_id
            );

            // 2. Try Name Match
            if (!perf) {
                perf = logs.drill_performances?.find(p => 
                    (p.drill_name || "").trim().toLowerCase() === targetName
                );
            }

            // 3. Try Index Match (Last Resort)
            if (!perf && logs.drill_performances && logs.drill_performances[index]) {
                // Only if IDs look like they might be missing or generated
                perf = logs.drill_performances[index];
            }

            const isSuccess = perf?.outcome === 'success';
            
            return (
                <View key={index} style={styles.drillCard}>
                    <View style={styles.drillHeader}>
                        <View style={{flex: 1}}>
                            <Text style={styles.drillName}>{item.drill_name || item.name}</Text>
                            <Text style={styles.drillMeta}>{item.duration_minutes || 10} min</Text>
                        </View>
                        {perf ? (
                            isSuccess ? <CheckCircle color="#16A34A" size={24} /> : <XCircle color="#DC2626" size={24} />
                        ) : (
                            <Text style={styles.skippedText}>Skipped</Text>
                        )}
                    </View>

                    {/* Performance Details */}
                    {perf ? (
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
                    ) : (
                        // DEBUG VIEW: Only shows if Skipped
                        <View style={{marginTop: 8, padding: 8, backgroundColor: '#F1F5F9', borderRadius: 8}}>
                             <Text style={{fontSize: 10, color: '#64748B', fontFamily: 'monospace'}}>
                                Looking for: {targetId} / "{targetName}"
                             </Text>
                        </View>
                    )}
                </View>
            );
        })}

      </ScrollView>
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
    drillCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
    drillHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    drillName: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
    drillMeta: { fontSize: 12, color: '#64748B' },
    skippedText: { fontSize: 12, fontStyle: 'italic', color: '#94A3B8' },
    perfRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 12 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeText: { fontSize: 10, fontWeight: '800' },
    targetBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0' },
    targetText: { fontSize: 12, color: '#475569' },
    emptyText: { color: '#64748B' },
    
    // Debug Styles
    debugSection: { marginTop: 40, padding: 16, backgroundColor: '#E2E8F0', borderRadius: 12 },
    debugTitle: { fontWeight: '700', color: '#475569' },
    debugText: { fontSize: 12, color: '#334155', marginBottom: 8, fontWeight: '600' },
    debugItem: { fontSize: 10, fontFamily: 'monospace', color: '#64748B', marginBottom: 2 }
});