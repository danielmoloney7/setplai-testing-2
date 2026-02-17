import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, TextInput, 
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Switch, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, Plus, Trophy, Edit3, X, Calendar, ClipboardList, User, Search, Check } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { fetchMatches, createMatchLog, updateMatchDetails, fetchMyTeam } from '../services/api';

export default function MatchDiaryScreen({ navigation, route }) {
  const { userId: paramUserId, userName: paramUserName } = route.params || {};
  
  const [matches, setMatches] = useState([]);
  const [activeTab, setActiveTab] = useState('UPCOMING');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('PLAYER');
  
  // ✅ NEW: Main Search State
  const [searchQuery, setSearchQuery] = useState('');

  // ✅ COACHING STATE
  const [myAthletes, setMyAthletes] = useState([]);
  const [selectedAthlete, setSelectedAthlete] = useState(null); 
  const [athleteSearch, setAthleteSearch] = useState('');

  // Form State
  const [event, setEvent] = useState('');
  const [round, setRound] = useState(''); 
  const [opponent, setOpponent] = useState('');
  const [tactics, setTactics] = useState('');
  
  // Post-Match State
  const [isComplete, setIsComplete] = useState(false); 
  const [score, setScore] = useState('');
  const [result, setResult] = useState('Win'); 
  const [reflection, setReflection] = useState('');

  // --- INITIALIZATION ---
  useEffect(() => {
      const init = async () => {
          const userRole = await AsyncStorage.getItem('user_role');
          const safeRole = userRole?.toUpperCase() || 'PLAYER';
          setRole(safeRole);

          if (safeRole === 'COACH') {
              const team = await fetchMyTeam();
              setMyAthletes(team);
          }
          
          if (paramUserId) {
              setSelectedAthlete({ id: paramUserId, name: paramUserName || 'Athlete' });
          }
      };
      init();
  }, [paramUserId, paramUserName]);

  // --- LOAD MATCHES ---
  const loadData = async () => {
    setLoading(true);
    try {
      const targetId = selectedAthlete?.id || paramUserId || null;
      const data = await fetchMatches(targetId); 
      setMatches(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { loadData(); }, [selectedAthlete]));

  // --- SAVE HANDLER ---
  const handleSave = async () => {
    if (role === 'COACH' && !selectedAthlete?.id) {
        Alert.alert("Select Athlete", "Please tag the player this match belongs to.");
        return;
    }

    if (!event.trim() || !opponent.trim() || !round.trim()) {
        Alert.alert("Missing Details", "Please enter Event Name, Round, and Opponent.");
        return;
    }

    try {
      const payload = {
        event_name: event,
        opponent_name: opponent,
        round: round, 
        tactics: tactics,
        player_id: selectedAthlete?.id || null,
        score: isComplete ? score : null,
        result: isComplete ? result : 'Scheduled',
        reflection: isComplete ? reflection : null,
      };

      if (editingMatch) {
        await updateMatchDetails(editingMatch.id, payload);
      } else {
        await createMatchLog({
            ...payload,
            date: new Date().toISOString(),
        });
      }
      setModalVisible(false);
      resetForm();
      loadData();
      Alert.alert("Success", "Match entry saved & player notified.");
    } catch (e) {
      console.error("Save Match Error:", e);
      Alert.alert("Error", "Could not save match.");
    }
  };

  const openEdit = (match) => {
    setEditingMatch(match);
    setEvent(match.event_name || '');
    setOpponent(match.opponent_name || '');
    setRound(match.round || ''); 
    setTactics(match.tactics || '');
    
    if (role === 'COACH' && match.user_id) {
        const found = myAthletes.find(a => a.id === match.user_id);
        if (found) setSelectedAthlete(found);
    }

    const hasResults = !!match.score || (match.result && match.result !== 'Scheduled');
    setIsComplete(hasResults);
    
    setScore(match.score || '');
    setResult(match.result && match.result !== 'Scheduled' ? match.result : 'Win');
    setReflection(match.reflection || '');
    setModalVisible(true);
  };

  const resetForm = () => {
    setEditingMatch(null);
    setEvent('');
    setOpponent('');
    setRound('');
    setTactics('');
    setIsComplete(false);
    setScore('');
    setResult('Win');
    setReflection('');
    if (!paramUserId) setSelectedAthlete(null);
    setAthleteSearch(''); // Reset search
  };

  // ✅ UPDATED: Filter Logic (Tabs + Search)
  const filteredMatches = matches.filter(m => {
    // 1. Tab Filter
    const isFinished = m.score || (m.result && m.result !== 'Scheduled');
    const matchesTab = activeTab === 'PAST' ? isFinished : !isFinished;
    if (!matchesTab) return false;

    // 2. Search Filter
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const opp = m.opponent_name?.toLowerCase() || '';
    const evt = m.event_name?.toLowerCase() || '';
    const rnd = m.round?.toLowerCase() || '';
    return opp.includes(q) || evt.includes(q) || rnd.includes(q);
  });

  // ✅ NEW: Filter Athletes for Modal
  const filteredAthletes = myAthletes.filter(a => 
      a.name.toLowerCase().includes(athleteSearch.toLowerCase())
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => openEdit(item)}>
      <View style={styles.cardHeader}>
        <View style={{flexDirection:'row', gap: 6, alignItems:'center'}}>
             <Calendar size={14} color="#94A3B8"/>
             <Text style={styles.date}>{new Date(item.date).toLocaleDateString()}</Text>
        </View>
        <Text style={styles.round}>{item.round || 'Match'}</Text>
      </View>
      
      <View style={styles.versusRow}>
        <Text style={styles.eventName}>{item.event_name}</Text>
        <Text style={styles.vsText}>•</Text>
        <Text style={styles.oppText}>vs {item.opponent_name}</Text>
      </View>

      {item.score ? (
         <View style={[styles.resultBadge, item.result === 'Loss' ? styles.lossBadge : styles.winBadge]}>
             <Trophy size={14} color={item.result === 'Loss' ? '#EF4444' : '#10B981'} />
             <Text style={[styles.resultText, item.result === 'Loss' ? {color:'#EF4444'} : {color:'#10B981'}]}>
                 {item.result ? item.result.toUpperCase() : 'COMPLETE'} - {item.score}
             </Text>
         </View>
      ) : (
         <View style={styles.tacticsPreview}>
             <ClipboardList size={14} color="#64748B" />
             <Text style={styles.tacticsText} numberOfLines={1}>
                {item.tactics ? "Game plan active" : "Tap to set game plan"}
             </Text>
         </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <View>
            <Text style={styles.headerTitle}>Match Diary</Text>
            {selectedAthlete && <Text style={styles.headerSub}>{selectedAthlete.name}</Text>}
        </View>
        <TouchableOpacity style={styles.addIconBtn} onPress={() => { resetForm(); setModalVisible(true); }}>
            <Plus size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* ✅ NEW: MAIN SEARCH BAR */}
      <View style={styles.searchContainer}>
          <Search size={20} color="#94A3B8" style={{marginRight: 8}} />
          <TextInput 
              style={styles.searchInput}
              placeholder="Search opponent, event..."
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

      <View style={styles.tabRow}>
          <TouchableOpacity onPress={() => setActiveTab('UPCOMING')} style={[styles.tab, activeTab === 'UPCOMING' && styles.activeTab]}>
              <Text style={[styles.tabText, activeTab === 'UPCOMING' && styles.activeTabText]}>Upcoming</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('PAST')} style={[styles.tab, activeTab === 'PAST' && styles.activeTab]}>
              <Text style={[styles.tabText, activeTab === 'PAST' && styles.activeTabText]}>History</Text>
          </TouchableOpacity>
      </View>

      {loading ? (
          <ActivityIndicator style={{marginTop: 40}} color={COLORS.primary} />
      ) : (
          <FlatList
            data={filteredMatches}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
                <View style={{alignItems:'center', marginTop: 40}}>
                    <Text style={styles.emptyText}>
                        {role === 'COACH' && !selectedAthlete 
                            ? "Select a player to view their matches." 
                            : (searchQuery ? "No matches match your search." : "No matches found.")}
                    </Text>
                </View>
            }
          />
      )}

      {/* --- CREATE/EDIT MODAL --- */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex:1}}>
        <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                    {editingMatch ? "Edit Match" : "New Match Entry"}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}><X size={24} color="#0F172A"/></TouchableOpacity>
            </View>
            
            <ScrollView contentContainerStyle={{padding: 20, paddingBottom: 50}}>
                
                {/* ✅ COACH: PLAYER SELECTOR WITH SEARCH */}
                {role === 'COACH' && !editingMatch && (
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionHeader}>ASSIGN TO PLAYER</Text>
                        
                        {/* Athlete Search Input */}
                        <View style={styles.miniSearch}>
                            <Search size={16} color="#94A3B8" />
                            <TextInput 
                                style={{flex: 1, fontSize: 13, color: '#0F172A', paddingVertical: 4}}
                                placeholder="Filter players..."
                                value={athleteSearch}
                                onChangeText={setAthleteSearch}
                            />
                        </View>

                        <View style={styles.athleteSelector}>
                            {filteredAthletes.map(athlete => (
                                <TouchableOpacity 
                                    key={athlete.id}
                                    style={[styles.athleteChip, selectedAthlete?.id === athlete.id && styles.athleteChipActive]}
                                    onPress={() => setSelectedAthlete(athlete)}
                                >
                                    <User size={14} color={selectedAthlete?.id === athlete.id ? '#FFF' : '#64748B'} style={{marginRight:6}}/>
                                    <Text style={[styles.athleteChipText, selectedAthlete?.id === athlete.id && {color:'#FFF'}]}>
                                        {athlete.name}
                                    </Text>
                                    {selectedAthlete?.id === athlete.id && <Check size={14} color="#FFF" style={{marginLeft:4}}/>}
                                </TouchableOpacity>
                            ))}
                            {filteredAthletes.length === 0 && (
                                <Text style={{fontSize: 12, color: '#94A3B8', fontStyle: 'italic'}}>No players found.</Text>
                            )}
                        </View>
                    </View>
                )}

                {/* --- MATCH DETAILS --- */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionHeader}>MATCH DETAILS</Text>
                    
                    <Text style={styles.label}>Event Name</Text>
                    <TextInput style={styles.input} value={event} onChangeText={setEvent} placeholder="e.g. Club Championship"/>
                    
                    <View style={{flexDirection: 'row', gap: 12}}>
                        <View style={{flex: 1}}>
                            <Text style={styles.label}>Round</Text>
                            <TextInput style={styles.input} value={round} onChangeText={setRound} placeholder="e.g. SF"/>
                        </View>
                        <View style={{flex: 1}}>
                            <Text style={styles.label}>Opponent</Text>
                            <TextInput style={styles.input} value={opponent} onChangeText={setOpponent} placeholder="Name"/>
                        </View>
                    </View>
                </View>

                {/* --- GAME PLAN --- */}
                <View style={[styles.sectionContainer, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
                    <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                        <Text style={[styles.sectionHeader, {color: '#0369A1'}]}>GAME PLAN / TACTICS</Text>
                        <Edit3 size={16} color="#0369A1"/>
                    </View>
                    <TextInput 
                        style={[styles.input, styles.textArea, {backgroundColor: '#FFF', borderColor: '#E0F2FE'}]} 
                        value={tactics} 
                        onChangeText={setTactics} 
                        multiline 
                        placeholder="Key focus areas, opponent weaknesses..."
                    />
                </View>

                {/* --- POST-MATCH --- */}
                <View style={[styles.sectionContainer, isComplete ? {backgroundColor: '#F0FDF4', borderColor: '#BBF7D0'} : {}]}>
                    <View style={{flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom: 12}}>
                        <Text style={[styles.sectionHeader, isComplete ? {color: '#15803D'} : {}]}>POST-MATCH RESULT</Text>
                        <Switch 
                            value={isComplete} 
                            onValueChange={setIsComplete} 
                            trackColor={{false: '#E2E8F0', true: '#16A34A'}}
                        />
                    </View>
                    
                    {isComplete && (
                        <View>
                            <View style={{flexDirection: 'row', gap: 12}}>
                                <View style={{flex: 1}}>
                                    <Text style={styles.label}>Outcome</Text>
                                    <View style={{flexDirection:'row', borderRadius: 8, overflow:'hidden', borderWidth: 1, borderColor: '#CBD5E1'}}>
                                        {['Win', 'Loss'].map((r) => (
                                            <TouchableOpacity 
                                                key={r} 
                                                style={[styles.resultToggle, result === r && (r === 'Win' ? styles.winBg : styles.lossBg)]}
                                                onPress={() => setResult(r)}
                                            >
                                                <Text style={[styles.resultToggleText, result === r && {color: '#FFF'}]}>{r}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                                <View style={{flex: 1}}>
                                    <Text style={styles.label}>Score</Text>
                                    <TextInput style={[styles.input, {backgroundColor:'#FFF'}]} value={score} onChangeText={setScore} placeholder="6-4, 6-2"/>
                                </View>
                            </View>
                            
                            <Text style={styles.label}>Reflection</Text>
                            <TextInput 
                                style={[styles.input, styles.textArea, {backgroundColor: '#FFF'}]} 
                                value={reflection} 
                                onChangeText={setReflection} 
                                multiline 
                                placeholder="Debrief notes..."
                            />
                        </View>
                    )}
                    {!isComplete && (
                        <Text style={{color: '#94A3B8', fontStyle: 'italic', fontSize: 12}}>Enable to log scores and reflection.</Text>
                    )}
                </View>

                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                    <Text style={styles.saveBtnText}>Save Entry</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  headerSub: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  backBtn: { padding: 4 },
  addIconBtn: { padding: 4 },

  // ✅ NEW SEARCH STYLES
  searchContainer: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: '#FFF', 
      marginHorizontal: 16, 
      marginTop: 8,
      marginBottom: 8, 
      paddingHorizontal: 12, 
      paddingVertical: 10, 
      borderRadius: 12, 
      borderWidth: 1, 
      borderColor: '#E2E8F0', 
      ...SHADOWS.small 
  },
  searchInput: { flex: 1, fontSize: 15, color: '#0F172A' },
  miniSearch: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F8FAFC',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderRadius: 8,
      paddingHorizontal: 10,
      marginBottom: 12,
      gap: 8
  },
  
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFF' },
  tab: { paddingVertical: 12, marginRight: 24, borderBottomWidth: 2, borderColor: 'transparent' },
  activeTab: { borderColor: COLORS.primary },
  tabText: { fontWeight: '600', color: '#64748B' },
  activeTabText: { color: COLORS.primary },

  list: { padding: 16 },
  card: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, ...SHADOWS.small },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  date: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  round: { fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  
  versusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  eventName: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  vsText: { color: '#CBD5E1' },
  oppText: { fontSize: 14, color: '#334155' },

  tacticsPreview: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8 },
  tacticsText: { fontSize: 12, color: '#64748B', fontStyle: 'italic' },
  
  resultBadge: { flexDirection: 'row', gap: 6, alignItems: 'center', padding: 8, borderRadius: 8, alignSelf: 'flex-start' },
  winBadge: { backgroundColor: '#DCFCE7' },
  lossBadge: { backgroundColor: '#FEE2E2' },
  resultText: { fontWeight: '700', fontSize: 12 },

  modalContent: { flex: 1, backgroundColor: '#FFF', paddingTop: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 10 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  
  sectionContainer: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionHeader: { fontSize: 11, fontWeight: '800', color: '#94A3B8', marginBottom: 12, letterSpacing: 0.5 },

  // Athlete Selector Styles
  athleteSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  athleteChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  athleteChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  athleteChipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },

  label: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, fontSize: 15, color: '#0F172A' },
  textArea: { height: 80, textAlignVertical: 'top' },

  resultToggle: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#F1F5F9' },
  winBg: { backgroundColor: '#16A34A' },
  lossBg: { backgroundColor: '#DC2626' },
  resultToggleText: { fontWeight: '700', color: '#64748B', fontSize: 12 },

  saveBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12, marginBottom: 40 },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 40 }
});