import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Clock, Activity, Calendar, CheckCircle, XCircle, FileText, User } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';

export default function SessionLogDetailScreen({ route, navigation }) {
  const { sessionLog } = route.params;

  // Formatting Helpers
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown Date';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const getRpeColor = (rpe) => {
    if (rpe >= 8) return '#EF4444'; // Red
    if (rpe >= 5) return '#F59E0B'; // Orange
    return '#22C55E'; // Green
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session Report</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* 1. Overview Card */}
        <View style={styles.overviewCard}>
          <View style={styles.programBadge}>
             <Text style={styles.programText}>{sessionLog.program?.title || "Training Session"}</Text>
          </View>
          <Text style={styles.sessionTitle}>{sessionLog.title || `Session ${sessionLog.session_id}`}</Text>
          
          <View style={styles.metaRow}>
             <View style={styles.metaItem}>
                <User size={14} color="#64748B"/>
                <Text style={styles.metaText}>{sessionLog.player_name || "Athlete"}</Text>
             </View>
             <View style={styles.metaItem}>
                <Calendar size={14} color="#64748B"/>
                <Text style={styles.metaText}>{formatDate(sessionLog.date_completed)}</Text>
             </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
               <Clock size={20} color={COLORS.primary} style={{marginBottom: 4}}/>
               <Text style={styles.statValue}>{sessionLog.duration_minutes}m</Text>
               <Text style={styles.statLabel}>Duration</Text>
            </View>
            <View style={styles.statBox}>
               <Activity size={20} color={getRpeColor(sessionLog.rpe)} style={{marginBottom: 4}}/>
               <Text style={[styles.statValue, {color: getRpeColor(sessionLog.rpe)}]}>{sessionLog.rpe}/10</Text>
               <Text style={styles.statLabel}>Intensity</Text>
            </View>
          </View>
        </View>

        {/* 2. Player Notes */}
        {sessionLog.notes && (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Athlete Notes</Text>
                <View style={styles.noteCard}>
                    <FileText size={16} color="#64748B" style={{marginRight: 8, marginTop: 2}}/>
                    <Text style={styles.noteText}>{sessionLog.notes}</Text>
                </View>
            </View>
        )}

        {/* 3. Drill Breakdown */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Drill Performance</Text>
            {sessionLog.drill_performances && sessionLog.drill_performances.length > 0 ? (
                sessionLog.drill_performances.map((perf, index) => (
                    <View key={index} style={styles.drillRow}>
                        <View style={styles.drillInfo}>
                            <Text style={styles.drillName}>{perf.drill_name || "Drill " + (index + 1)}</Text>
                            {perf.achieved_value > 0 && (
                                <Text style={styles.drillResult}>
                                    Result: <Text style={{fontWeight: '700', color: '#0F172A'}}>{perf.achieved_value}</Text> reps
                                </Text>
                            )}
                        </View>
                        <View style={styles.drillStatus}>
                            {perf.outcome === 'success' ? (
                                <View style={[styles.statusBadge, {backgroundColor: '#DCFCE7'}]}>
                                    <CheckCircle size={14} color="#16A34A"/>
                                    <Text style={[styles.statusText, {color: '#16A34A'}]}>PASSED</Text>
                                </View>
                            ) : (
                                <View style={[styles.statusBadge, {backgroundColor: '#FEE2E2'}]}>
                                    <XCircle size={14} color="#DC2626"/>
                                    <Text style={[styles.statusText, {color: '#DC2626'}]}>MISSED</Text>
                                </View>
                            )}
                        </View>
                    </View>
                ))
            ) : (
                <Text style={{color: '#94A3B8', fontStyle: 'italic'}}>No drill data recorded.</Text>
            )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  backBtn: { padding: 4 },
  content: { padding: 24 },

  overviewCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.medium },
  programBadge: { alignSelf: 'flex-start', backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 8 },
  programText: { color: '#2563EB', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  sessionTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  metaRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: '#64748B' },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 16 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  statLabel: { fontSize: 12, color: '#64748B', fontWeight: '600', marginTop: 4 },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  
  noteCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row' },
  noteText: { flex: 1, fontSize: 14, color: '#334155', lineHeight: 20 },

  drillRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  drillName: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  drillResult: { fontSize: 13, color: '#64748B' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 },
  statusText: { fontSize: 11, fontWeight: '800' }
});