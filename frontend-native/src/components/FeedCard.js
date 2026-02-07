import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native'; // ✅ Added Hook
import { Clock, Activity, ThumbsUp, ThumbsDown, Calendar } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';

export default function FeedCard({ session }) {
  const navigation = useNavigation(); // ✅ Initialize Navigation

  // Format Date & Time safely
  const dateObj = new Date(session.date_completed || session.created_at || Date.now());
  const date = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Calculate stats from the drill_performances array
  const nailedCount = session.drill_performances?.filter(p => p.outcome === 'success').length || 0;
  const struggleCount = session.drill_performances?.filter(p => p.outcome === 'fail').length || 0;

  // ✅ Handle Click -> Navigate to Details
  const handlePress = () => {
    navigation.navigate('SessionLogDetail', { sessionLog: session });
  };

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={handlePress} 
      activeOpacity={0.7}
    >
      {/* Header Section */}
      <View style={styles.header}>
        <View style={{flex: 1}}>
          <Text style={styles.programTitle}>
            {session.program_title || session.title || "Training Session"}
          </Text>
          <View style={styles.dateRow}>
             <Calendar size={12} color="#94A3B8" />
             <Text style={styles.dateText}>{date} at {time}</Text>
          </View>
        </View>
        
        {/* Duration Badge */}
        <View style={styles.durationBadge}>
          <Clock size={12} color={COLORS.primary} />
          <Text style={styles.durationText}>{session.duration_minutes || 0} min</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Activity size={14} color="#64748B" />
          <Text style={styles.statText}>RPE {session.rpe || '-'}/10</Text>
        </View>
        
        {/* Feedback Counts (Only show if data exists) */}
        {(nailedCount > 0 || struggleCount > 0) && (
            <View style={styles.feedbackContainer}>
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
        )}
      </View>

      {/* Optional Notes Preview */}
      {session.notes ? (
        <View style={styles.notesBox}>
          <Text style={styles.notesText} numberOfLines={2}>
            "{session.notes}"
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.small, // Ensure SHADOWS is defined in your theme
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  programTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  dateText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500'
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  feedbackContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  notesBox: {
    marginTop: 8,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
  },
  notesText: {
    fontSize: 13,
    color: '#475569',
    fontStyle: 'italic',
  },
});