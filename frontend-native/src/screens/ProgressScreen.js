import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { fetchMyHistory } from '../services/api';
import FeedCard from '../components/FeedCard';
import ProgressChart from '../components/ProgressChart'; // ✅ Import Chart
import { COLORS, SHADOWS } from '../constants/theme';

export default function ProgressScreen() {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchMyHistory();
      setHistory(data || []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // --- STATS CALCULATIONS ---
  const totalMinutes = history.reduce((sum, item) => sum + (item.duration_minutes || 0), 0);
  
  // Calculate Consistency: Mock goal of 5 sessions = 100%
  // In a real app, this would check "sessions this week" vs "weekly goal"
  const weeklyGoal = 5;
  const consistencyScore = Math.min((history.length / weeklyGoal) * 100, 100);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Progress</Text>
      </View>

      {/* Stats Overview with Chart */}
      <View style={styles.statsContainer}>
        
        {/* Left Side: Chart */}
        <View style={styles.chartCard}>
            <ProgressChart percentage={consistencyScore} size={100} />
        </View>

        {/* Right Side: Numeric Stats */}
        <View style={{ flex: 1, gap: 12 }}>
            <View style={styles.statCard}>
                <Text style={styles.statValue}>{history.length}</Text>
                <Text style={styles.statLabel}>TOTAL SESSIONS</Text>
            </View>
            <View style={styles.statCard}>
                <Text style={styles.statValue}>{totalMinutes}</Text>
                <Text style={styles.statLabel}>MINUTES TRAINED</Text>
            </View>
        </View>
      </View>

      <Text style={styles.sectionHeader}>Recent History</Text>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={history}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <FeedCard session={item} />}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No sessions logged yet.</Text>
                <Text style={styles.emptySub}>Complete a session to see your progress!</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 24, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  
  statsContainer: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, marginBottom: 24 },
  
  // New Chart Card Style
  chartCard: { 
    flex: 1.2, 
    backgroundColor: '#FFF', 
    borderRadius: 16, 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 16, 
    borderWidth: 1, 
    borderColor: '#E2E8F0',
    ...SHADOWS.small
  },

  statCard: { 
    flex: 1, 
    backgroundColor: '#FFF', 
    padding: 12, 
    borderRadius: 16, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1, 
    borderColor: '#E2E8F0',
    ...SHADOWS.small
  },
  
  statValue: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', marginTop: 4, textAlign: 'center' },

  sectionHeader: { fontSize: 18, fontWeight: '700', color: '#334155', paddingHorizontal: 24, marginBottom: 12 },
  
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#64748B', fontWeight: '700', fontSize: 16 },
  emptySub: { color: '#94A3B8', fontSize: 14, marginTop: 4 }
});