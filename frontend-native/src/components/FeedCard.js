import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Clock, Activity, ThumbsUp, ThumbsDown } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';

export default function FeedCard({ session }) {
  const date = new Date(session.date_completed).toLocaleDateString();
  const time = new Date(session.date_completed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Calculate stats
  const nailedCount = session.drill_performances?.filter(p => p.outcome === 'success').length || 0;
  const struggleCount = session.drill_performances?.filter(p => p.outcome === 'fail').length || 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.programTitle}>Training Session</Text>
          <Text style={styles.date}>{date} at {time}</Text>
        </View>
        <View style={styles.durationBadge}>
          <Clock size={12} color={COLORS.primary} />
          <Text style={styles.durationText}>{session.duration_minutes} min</Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Activity size={14} color="#64748B" />
          <Text style={styles.statText}>RPE {session.rpe}/10</Text>
        </View>
        <View style={styles.divider} />
        
        {/* Feedback Counts */}
        <View style={styles.feedbackRow}>
          {nailedCount > 0 && (
            <View style={[styles.pill, { backgroundColor: '#DCFCE7' }]}>
              <ThumbsUp size={12} color="#16A34A" />
              <Text style={[styles.pillText, { color: '#16A34A' }]}>{nailedCount}</Text>
            </View>
          )}
          {struggleCount > 0 && (
            <View style={[styles.pill, { backgroundColor: '#FEE2E2' }]}>
              <ThumbsDown size={12} color="#DC2626" />
              <Text style={[styles.pillText, { color: '#DC2626' }]}>{struggleCount}</Text>
            </View>
          )}
        </View>
      </View>

      {session.notes ? (
        <View style={styles.notesBox}>
          <Text style={styles.notesText}>"{session.notes}"</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.small
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  programTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  date: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  durationBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  durationText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  divider: { width: 1, height: 16, backgroundColor: '#E2E8F0' },
  feedbackRow: { flexDirection: 'row', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  pillText: { fontSize: 11, fontWeight: '700' },
  notesBox: { backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8 },
  notesText: { fontSize: 13, color: '#475569', fontStyle: 'italic' }
});