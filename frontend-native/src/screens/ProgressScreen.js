import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ClipboardList, ChevronRight } from 'lucide-react-native'; 

import { fetchMyHistory, fetchDrills } from '../services/api';
import FeedCard from '../components/FeedCard';
import RadarChart from '../components/RadarChart'; 
import { COLORS, SHADOWS } from '../constants/theme';

export default function ProgressScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Data State
  const [allHistory, setAllHistory] = useState([]);
  const [allDrillsList, setAllDrillsList] = useState([]);
  
  // Filter State
  const [timeFilter, setTimeFilter] = useState('W'); // W, M, Y, ALL

  const loadData = async (isPullToRefresh = false) => {
    if (isPullToRefresh) setIsRefreshing(true);
    else if (allHistory.length === 0) setLoading(true);

    try {
      const [logs, allDrills] = await Promise.all([
          fetchMyHistory(),
          fetchDrills()
      ]);
      setAllHistory(logs || []);
      setAllDrillsList(allDrills || []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData(false);
    }, [])
  );

  // --- FILTERING LOGIC (NRC Calendar Style) ---
  const getFilteredLogs = () => {
      const now = new Date();
      let startDate;

      if (timeFilter === 'W') {
          // Current Week (Starting from the most recent Monday)
          startDate = new Date(now);
          const day = startDate.getDay();
          const distanceToMonday = day === 0 ? 6 : day - 1; 
          startDate.setDate(now.getDate() - distanceToMonday);
          startDate.setHours(0, 0, 0, 0);

      } else if (timeFilter === 'M') {
          // Current Month (From the 1st of the current month)
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          startDate.setHours(0, 0, 0, 0);

      } else if (timeFilter === 'Y') {
          // Current Year (From January 1st)
          startDate = new Date(now.getFullYear(), 0, 1);
          startDate.setHours(0, 0, 0, 0);

      } else {
          // ALL - Return everything
          return allHistory;
      }

      return allHistory.filter(log => {
          // Handle logs that might be missing date_completed
          if (!log.date_completed && !log.created_at) return false;
          
          const logDate = new Date(log.date_completed || log.created_at);
          return logDate >= startDate;
      });
  };

  const currentLogs = getFilteredLogs();

  // --- STATS CALCULATIONS ---
  const totalMinutes = currentLogs.reduce((sum, item) => sum + (item.duration_minutes || 0), 0);
  const hoursPlayed = (totalMinutes / 60).toFixed(1); // e.g. "1.5"
  
  // Calculate Radar Chart Data dynamically
  const getRadarData = () => {
      let counts = { forehand: 0, backhand: 0, serve: 0, volley: 0, movement: 0 };
      
      currentLogs.forEach(log => {
          (log.drill_performances || []).forEach(perf => {
              if (perf.outcome === 'skipped') return;
              
              const drillInfo = allDrillsList.find(d => d.id === perf.drill_id);
              const searchString = `${drillInfo?.name || ''} ${drillInfo?.category || ''} ${perf.drill_name || ''}`.toLowerCase();

              if (searchString.includes('forehand')) counts.forehand += 1;
              if (searchString.includes('backhand')) counts.backhand += 1;
              if (searchString.includes('serve')) counts.serve += 1;
              if (searchString.includes('volley') || searchString.includes('net')) counts.volley += 1;
              if (searchString.includes('movement') || searchString.includes('footwork') || searchString.includes('cardio')) counts.movement += 1;
          });
      });

      const maxCount = Math.max(...Object.values(counts), 1);

      const data = [
          { label: 'Forehand', value: (counts.forehand / maxCount) * 100 },
          { label: 'Backhand', value: (counts.backhand / maxCount) * 100 },
          { label: 'Serve', value: (counts.serve / maxCount) * 100 },
          { label: 'Volleys', value: (counts.volley / maxCount) * 100 },
          { label: 'Movement', value: (counts.movement / maxCount) * 100 }
      ];

      if (maxCount === 1 && Object.values(counts).every(v => v === 0)) {
          return data.map(d => ({...d, value: 0}));
      }
      return data;
  };

  const radarData = getRadarData();

  // --- COMPONENT RENDERING ---
  const renderHeader = () => (
    <View>
        <View style={styles.statsContainer}>
            {/* The Radar Chart */}
            <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Skill Focus</Text>
                <RadarChart data={radarData} />
            </View>

            {/* The Numeric KPIs below the chart */}
            <View style={styles.rowCards}>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{currentLogs.length}</Text>
                    <Text style={styles.statLabel}>SESSIONS</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{hoursPlayed}h</Text>
                    <Text style={styles.statLabel}>COURT TIME</Text>
                </View>
            </View>
        </View>

        <TouchableOpacity 
            style={styles.assessmentCard}
            onPress={() => navigation.navigate('Assessment')}
        >
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                <View style={styles.iconBox}>
                    <ClipboardList size={20} color="#0284C7" />
                </View>
                <View>
                    <Text style={styles.cardTitle}>Find Your Baseline</Text>
                    <Text style={styles.cardSub}>Take the 2-min skill assessment.</Text>
                </View>
            </View>
            <ChevronRight size={20} color="#0284C7" />
        </TouchableOpacity>

        <Text style={[styles.sectionHeader, { marginTop: 8 }]}>Filtered History</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      
      {/* HEADER WITH TABS */}
      <View style={styles.header}>
        <Text style={styles.title}>Your Progress</Text>
        
        {/* NRC Style Time Filter */}
        <View style={styles.filterRow}>
            {['W', 'M', 'Y', 'ALL'].map(tab => (
                <TouchableOpacity 
                    key={tab} 
                    style={[styles.filterBtn, timeFilter === tab && styles.filterBtnActive]}
                    onPress={() => setTimeFilter(tab)}
                >
                    <Text style={[styles.filterText, timeFilter === tab && styles.filterTextActive]}>
                        {tab}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={currentLogs} // Pass the dynamically filtered logs down here
          keyExtractor={item => item.id}
          renderItem={({ item }) => <FeedCard session={item} />}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadData(true)} />}
          ListHeaderComponent={renderHeader} 
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No sessions found.</Text>
                <Text style={styles.emptySub}>No activity logged during this period.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  title: { fontSize: 28, fontWeight: '900', color: '#0F172A', marginBottom: 16 },
  
  // NRC Filter Tabs
  filterRow: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 8, padding: 4 },
  filterBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  filterBtnActive: { backgroundColor: '#FFF', ...SHADOWS.small },
  filterText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  filterTextActive: { color: '#0F172A' },

  statsContainer: { paddingHorizontal: 24, paddingTop: 24, marginBottom: 24, gap: 12 },
  
  chartCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.small
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    alignSelf: 'flex-start',
    marginBottom: 4,
  },

  rowCards: { flexDirection: 'row', gap: 12 },
  statCard: { 
    flex: 1, 
    backgroundColor: '#FFF', 
    padding: 16, 
    borderRadius: 16, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1, 
    borderColor: '#E2E8F0',
    ...SHADOWS.small
  },
  
  statValue: { fontSize: 28, fontWeight: '900', color: '#0F172A', letterSpacing: -1 },
  statLabel: { fontSize: 11, fontWeight: '800', color: '#94A3B8', marginTop: 2, textAlign: 'center', letterSpacing: 0.5 },

  assessmentCard: {
    backgroundColor: '#F0F9FF', 
    marginHorizontal: 24, 
    marginBottom: 24, 
    padding: 16, 
    borderRadius: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    borderWidth: 1, 
    borderColor: '#BAE6FD'
  },
  iconBox: { 
    width: 40, 
    height: 40, 
    backgroundColor: '#E0F2FE', 
    borderRadius: 20, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0369A1' },
  cardSub: { fontSize: 13, color: '#0284C7' },

  sectionHeader: { fontSize: 18, fontWeight: '800', color: '#334155', paddingHorizontal: 24, marginBottom: 12 },
  
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#64748B', fontWeight: '700', fontSize: 16 },
  emptySub: { color: '#94A3B8', fontSize: 14, marginTop: 4 }
});