import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Plus, Calendar, CheckCircle, ChevronRight, Clock, ChevronLeft } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { fetchMatches } from '../services/api';

// ✅ Accept route params
export default function MatchListScreen({ navigation, route }) {
  const { athleteId, athleteName } = route.params || {}; // Get athlete info if passed

  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadMatches = async () => {
    try {
        // ✅ Pass athleteId to the API
        const data = await fetchMatches(athleteId);
        setMatches(data);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
        setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadMatches();
    }, [athleteId]) // Reload if athleteId changes
  );

  const onRefresh = () => {
      setRefreshing(true);
      loadMatches();
  };

  const upcoming = matches.filter(m => !m.result || m.result === 'Scheduled');
  const history = matches.filter(m => m.result && m.result !== 'Scheduled');

  // ... (renderMatchCard function remains exactly the same) ...
  const renderMatchCard = ({ item }) => {
      const isCompleted = item.result && item.result !== 'Scheduled';
      return (
        <TouchableOpacity 
            style={styles.card} 
            onPress={() => navigation.navigate('MatchDetail', { matchData: item })}
        >
            <View style={styles.cardLeft}>
                <View style={[styles.iconBox, isCompleted ? styles.iconComplete : styles.iconUpcoming]}>
                    {isCompleted ? <CheckCircle size={20} color="#166534" /> : <Calendar size={20} color="#854D0E" />}
                </View>
                <View>
                    <Text style={styles.opponent}>{item.opponent_name}</Text>
                    <Text style={styles.event}>{item.event_name}</Text>
                    <View style={styles.metaRow}>
                        {item.surface && (
                            <View style={styles.tag}>
                                <Text style={styles.tagText}>{item.surface}</Text>
                            </View>
                        )}
                        {item.match_format === 'Doubles' && (
                            <View style={[styles.tag, {backgroundColor: '#E0E7FF'}]}>
                                <Text style={[styles.tagText, {color: '#4338CA'}]}>Doubles</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
            <View style={styles.cardRight}>
                {isCompleted ? (
                    <View style={{alignItems: 'flex-end'}}>
                        <Text style={[styles.result, item.result === 'Win' ? styles.win : styles.loss]}>
                            {item.result.toUpperCase()}
                        </Text>
                        <Text style={styles.score}>{item.score}</Text>
                    </View>
                ) : (
                    <View style={styles.scheduledBadge}>
                        <Clock size={12} color="#B45309" />
                        <Text style={styles.scheduledText}>PLANNED</Text>
                    </View>
                )}
                <ChevronRight size={16} color="#CBD5E1" style={{marginTop: 8}}/>
            </View>
        </TouchableOpacity>
      );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backBtn}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
        >
            <ChevronLeft size={28} color="#0F172A" />
        </TouchableOpacity>
        
        {/* ✅ Dynamic Title */}
        <Text style={styles.headerTitle}>
            {athleteName ? `${athleteName}'s Matches` : "Match Diary"}
        </Text>
        
        <View style={{width: 28}} />
      </View>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={[...upcoming, ...history]}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
            <>
                {upcoming.length > 0 && <Text style={styles.sectionTitle}>UPCOMING ({upcoming.length})</Text>}
                {upcoming.length === 0 && history.length === 0 && !loading && (
                    <View style={styles.emptyState}>
                        <Calendar size={48} color="#CBD5E1" />
                        <Text style={styles.emptyText}>No matches logged yet.</Text>
                        {/* Only show "Schedule" hint if it's the player looking at their own diary */}
                        {!athleteId && <Text style={styles.emptySub}>Schedule your next match to start tracking.</Text>}
                    </View>
                )}
            </>
        }
        renderItem={({ item }) => {
            if (item === history[0] && history.length > 0) {
                return (
                    <>
                        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>HISTORY</Text>
                        {renderMatchCard({ item })}
                    </>
                );
            }
            return renderMatchCard({ item });
        }}
      />
      
      {/* Hide FAB if Coach is viewing Player (optional, or let Coach add matches for player) */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('MatchDetail')} 
      >
          <Plus size={24} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  backBtn: { padding: 4 },
  listContent: { padding: 20, paddingBottom: 100 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#94A3B8', marginBottom: 12, letterSpacing: 1 },
  card: { backgroundColor: '#FFF', flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.small },
  cardLeft: { flexDirection: 'row', gap: 12, alignItems: 'center', flex: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  iconUpcoming: { backgroundColor: '#FEF9C3' },
  iconComplete: { backgroundColor: '#DCFCE7' },
  opponent: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  event: { fontSize: 13, color: '#64748B', marginBottom: 4 },
  metaRow: { flexDirection: 'row', gap: 6 },
  tag: { backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagText: { fontSize: 10, fontWeight: '700', color: '#64748B' },
  cardRight: { alignItems: 'flex-end', justifyContent: 'center' },
  result: { fontSize: 12, fontWeight: '800' },
  win: { color: '#16A34A' },
  loss: { color: '#DC2626' },
  score: { fontSize: 13, color: '#64748B', marginTop: 2 },
  scheduledBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF7ED', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  scheduledText: { fontSize: 10, fontWeight: '700', color: '#B45309' },
  emptyState: { alignItems: 'center', marginTop: 60, padding: 20 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#64748B', marginTop: 16 },
  emptySub: { fontSize: 14, color: '#94A3B8', marginTop: 4 },
  fab: { position: 'absolute', bottom: 32, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', ...SHADOWS.medium },
});