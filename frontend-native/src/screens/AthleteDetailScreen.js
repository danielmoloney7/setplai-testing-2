import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, TrendingUp, Clock, Trophy, ChevronRight } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { fetchPlayerLogs } from '../services/api'; 
import FeedCard from '../components/FeedCard';

export default function AthleteDetailScreen({ navigation, route }) {
  const { athlete } = route.params || {};
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    if (athlete?.id) {
      try {
        const data = await fetchPlayerLogs(athlete.id);
        setLogs(data || []);
      } catch (e) {
        console.error("Failed to load athlete history", e);
      } finally {
        setLoading(false);
      }
    }
  };

  // ✅ FALLBACK MAPPING: Logic aligned with Dashboard to prevent 0-minute stats
  // Supports duration_minutes (Backend), durationMin (Web), and duration (Legacy)
  const totalMinutes = logs.reduce((acc, sess) => {
      const duration = parseInt(sess.duration_minutes || sess.durationMin || sess.duration || 0);
      return acc + duration;
  }, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Athlete Profile</Text>
        <View style={{width: 24}} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>{athlete?.name ? athlete.name[0].toUpperCase() : '?'}</Text>
            </View>
            <Text style={styles.name}>{athlete?.name || 'Unknown Athlete'}</Text>
            <Text style={styles.email}>{athlete?.email || ''}</Text>
            
            <View style={styles.badge}>
                <Trophy size={14} color="#CA8A04" />
                <Text style={styles.badgeText}>{athlete?.xp || 0} XP</Text>
            </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsRow}>
            <View style={styles.statCard}>
                <TrendingUp size={20} color={COLORS.primary} style={{marginBottom:8}} />
                <Text style={styles.statValue}>{logs.length}</Text>
                <Text style={styles.statLabel}>Sessions</Text>
            </View>
            <View style={styles.statCard}>
                <Clock size={20} color={COLORS.primary} style={{marginBottom:8}} />
                <Text style={styles.statValue}>{totalMinutes}</Text>
                <Text style={styles.statLabel}>Minutes</Text>
            </View>
        </View>

        {/* ✅ NEW: Actions Section (Match Diary) */}
        <Text style={styles.sectionTitle}>Actions</Text>
        <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => navigation.navigate('MatchDiary', { userId: athlete.id, userName: athlete.name })}
        >
            <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
                <Trophy size={24} color="#D97706" />
            </View>
            <View style={{flex: 1}}>
                <Text style={styles.actionTitle}>Match Diary</Text>
                <Text style={styles.actionDesc}>Set tactics & review results</Text>
            </View>
            <ChevronRight size={20} color="#CBD5E1" />
        </TouchableOpacity>

        {/* History List */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {loading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : (
            <View>
                {logs.length === 0 ? (
                    <Text style={styles.emptyText}>No training activity yet.</Text>
                ) : (
                    logs.map((log, index) => (
                        <FeedCard key={log.id || index} session={log} />
                    ))
                )}
            </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  backBtn: { padding: 4 },
  content: { padding: 24, paddingBottom: 100 },
  
  profileCard: { alignItems: 'center', marginBottom: 24 },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', marginBottom: 12, ...SHADOWS.small },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#64748B' },
  name: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  email: { fontSize: 14, color: '#64748B', marginBottom: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF9C3', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#CA8A04' },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  statCard: { flex: 1, backgroundColor: '#FFF', padding: 16, borderRadius: 16, alignItems: 'center', ...SHADOWS.small, borderWidth: 1, borderColor: '#E2E8F0' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  statLabel: { fontSize: 12, color: '#64748B', fontWeight: '600' },

  // Action Card Styles
  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: '#E2E8F0', gap: 16, ...SHADOWS.small },
  iconBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  actionDesc: { fontSize: 13, color: '#64748B' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 20, fontStyle: 'italic' }
});