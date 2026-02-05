import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { fetchMyHistory } from '../services/api';
import FeedCard from '../components/FeedCard';
import { COLORS } from '../constants/theme';

export default function ProgressScreen() {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchMyHistory();
      setHistory(data);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  // Reload when tab is focused (so new sessions appear immediately)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const totalMinutes = history.reduce((sum, item) => sum + (item.duration_minutes || 0), 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Progress</Text>
      </View>

      {/* Stats Overview */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{history.length}</Text>
          <Text style={styles.statLabel}>SESSIONS</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalMinutes}</Text>
          <Text style={styles.statLabel}>MINUTES</Text>
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
            <Text style={styles.emptyText}>No sessions logged yet. Go train!</Text>
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
  statCard: { flex: 1, backgroundColor: '#FFF', padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  statValue: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  statLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', marginTop: 4 },

  sectionHeader: { fontSize: 18, fontWeight: '700', color: '#334155', paddingHorizontal: 24, marginBottom: 12 },
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 30 }
});