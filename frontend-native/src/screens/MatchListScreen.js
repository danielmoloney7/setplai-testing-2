import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, TextInput, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Plus, Calendar, CheckCircle, ChevronRight, Clock, ChevronLeft, Search, X, User, Trophy } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { fetchMatches } from '../services/api';

export default function MatchListScreen({ navigation, route }) {
  // viewMode: 'TEAM' (for coach consolidated view) or undefined (single player)
  const { userId, userName, viewMode } = route.params || {};
  const isTeamView = viewMode === 'TEAM';

  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadMatches = async () => {
    try {
        console.log(`📡 Fetching matches... User: ${userId}, TeamView: ${isTeamView}`);
        
        const data = await fetchMatches(userId, isTeamView);
        
        console.log("📦 Matches received:", JSON.stringify(data, null, 2)); // LOG THE DATA
        
        setMatches(data);
    } catch (e) {
        console.error("❌ Error loading matches:", e);
    } finally {
        setLoading(false);
        setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadMatches();
    }, [userId, viewMode])
  );

  const onRefresh = () => {
      setRefreshing(true);
      loadMatches();
  };

  const filteredMatches = matches.filter(m => {
      const query = searchQuery.toLowerCase();
      const opponent = m.opponent_name ? m.opponent_name.toLowerCase() : '';
      const event = m.event_name ? m.event_name.toLowerCase() : '';
      const player = m.player_name ? m.player_name.toLowerCase() : '';
      
      // ✅ Allow searching by Player Name too if in Team View
      return opponent.includes(query) || event.includes(query) || (isTeamView && player.includes(query));
  });

  const upcoming = filteredMatches.filter(m => !m.score && (!m.result || m.result === 'Scheduled'));
  const history = filteredMatches.filter(m => m.score || (m.result && m.result !== 'Scheduled'));

  const renderMatchCard = ({ item }) => {
      const isCompleted = item.score || (item.result && item.result !== 'Scheduled');
      
      return (
        <TouchableOpacity 
            style={styles.card} 
            onPress={() => navigation.navigate('MatchDiary', { 
                userId: item.user_id, // Pass the specific player's ID
                userName: item.player_name || userName 
            })}
        >
            <View style={styles.cardLeft}>
                {/* ✅ Show Player Name in Team View */}
                {isTeamView && (
                    <View style={styles.playerTag}>
                        <User size={10} color="#64748B" />
                        <Text style={styles.playerName}>{item.player_name}</Text>
                    </View>
                )}

                <View style={{flexDirection:'row', gap: 12, alignItems:'center', marginTop: isTeamView ? 4 : 0}}>
                    <View style={[styles.iconBox, isCompleted ? styles.iconComplete : styles.iconUpcoming]}>
                        {isCompleted ? <CheckCircle size={20} color="#166534" /> : <Calendar size={20} color="#854D0E" />}
                    </View>
                    <View>
                        <Text style={styles.opponent}>vs {item.opponent_name}</Text>
                        <Text style={styles.event}>{item.event_name || 'Match'}</Text>
                        
                        <View style={styles.metaRow}>
                            {item.round && (
                                <View style={styles.tag}>
                                    <Text style={styles.tagText}>{item.round}</Text>
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
            </View>

            <View style={styles.cardRight}>
                {isCompleted ? (
                    <View style={{alignItems: 'flex-end'}}>
                        <Text style={[styles.result, item.result === 'Win' ? styles.win : styles.loss]}>
                            {item.result ? item.result.toUpperCase() : 'DONE'}
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
        >
            <ChevronLeft size={28} color="#0F172A" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>
            {isTeamView ? "All Team Matches" : (userName ? `${userName}'s Matches` : "Match Diary")}
        </Text>
        
        <View style={{width: 28}} /> 
      </View>

      <View style={styles.searchContainer}>
          <Search size={20} color="#94A3B8" style={{marginRight: 8}} />
          <TextInput 
              style={styles.searchInput}
              placeholder={isTeamView ? "Search player, opponent..." : "Search opponent or event..."}
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
          />
          {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={20} color="#94A3B8" />
              </TouchableOpacity>
          )}
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
                        <Trophy size={48} color="#CBD5E1" />
                        <Text style={styles.emptyText}>No matches found.</Text>
                    </View>
                )}
            </>
        }
        renderItem={({ item }) => {
            const isFirstHistory = history.length > 0 && item === history[0];
            return (
                <View>
                    {isFirstHistory && <Text style={[styles.sectionTitle, { marginTop: 24 }]}>HISTORY</Text>}
                    {renderMatchCard({ item })}
                </View>
            );
        }}
      />
      
      {/* Floating Action Button (Only show if NOT in Team View, to keep it simple) */}
      {!isTeamView && (
          <TouchableOpacity 
            style={styles.fab} 
            onPress={() => navigation.navigate('MatchDiary', { userId: userId, userName: userName })} 
          >
              <Plus size={24} color="#FFF" />
          </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  backBtn: { padding: 4 },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', margin: 16, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.small },
  searchInput: { flex: 1, fontSize: 16, color: '#0F172A' },

  listContent: { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#94A3B8', marginBottom: 12, letterSpacing: 1 },
  
  card: { backgroundColor: '#FFF', flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.small },
  cardLeft: { flex: 1 },
  
  iconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  iconUpcoming: { backgroundColor: '#FEF9C3' },
  iconComplete: { backgroundColor: '#DCFCE7' },
  
  playerTag: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 4 },
  playerName: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },

  opponent: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  event: { fontSize: 13, color: '#64748B', marginBottom: 4 },
  metaRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tag: { backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagText: { fontSize: 10, fontWeight: '700', color: '#64748B' },
  
  cardRight: { alignItems: 'flex-end', justifyContent: 'center', marginLeft: 12 },
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