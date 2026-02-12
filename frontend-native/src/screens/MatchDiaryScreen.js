import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, TextInput, 
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, Plus, Trophy, Edit3, X, User } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { fetchMatches, createMatchLog, updateMatchLog } from '../services/api';

export default function MatchDiaryScreen({ navigation, route }) {
  // ✅ Accept userId from params (Coach View) or default to self
  const { userId, userName } = route.params || {};
  
  const [matches, setMatches] = useState([]);
  const [activeTab, setActiveTab] = useState('UPCOMING');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('PLAYER');
  
  // Form State
  const [event, setEvent] = useState('');
  const [opponent, setOpponent] = useState('');
  const [tactics, setTactics] = useState('');
  const [score, setScore] = useState('');
  const [reflection, setReflection] = useState('');
  const [round, setRound] = useState('Round 1');

  useEffect(() => {
      AsyncStorage.getItem('user_role').then(r => setRole(r?.toUpperCase() || 'PLAYER'));
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // ✅ Fetch specific user's matches if userId is present
      const data = await fetchMatches(userId);
      setMatches(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { loadData(); }, [userId]));

  const handleSave = async () => {
    try {
      if (editingMatch) {
        await updateMatchLog(editingMatch.id, { score, reflection, tactics });
      } else {
        await createMatchLog({
          date: new Date().toISOString(),
          event_name: event,
          opponent_name: opponent,
          round: round,
          tactics: tactics,
          player_id: userId // ✅ Create for this player if Coach
        });
      }
      setModalVisible(false);
      resetForm();
      loadData();
      Alert.alert("Success", "Match entry saved.");
    } catch (e) {
      Alert.alert("Error", "Could not save match.");
    }
  };

  const openEdit = (match) => {
    setEditingMatch(match);
    setEvent(match.event_name);
    setOpponent(match.opponent_name);
    setTactics(match.tactics || '');
    setScore(match.score || '');
    setReflection(match.reflection || '');
    setRound(match.round || 'Round 1');
    setModalVisible(true);
  };

  const resetForm = () => {
    setEditingMatch(null);
    setEvent('');
    setOpponent('');
    setTactics('');
    setScore('');
    setReflection('');
    setRound('Round 1');
  };

  const filteredMatches = matches.filter(m => {
    const hasResult = m.score || m.result;
    return activeTab === 'PAST' ? hasResult : !hasResult;
  });

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => openEdit(item)}>
      <View style={styles.cardHeader}>
        <Text style={styles.date}>{new Date(item.date).toDateString()}</Text>
        <Text style={styles.round}>{item.round || 'Match'}</Text>
      </View>
      
      <View style={styles.versusRow}>
        <Text style={styles.meText}>{userName || 'Me'}</Text>
        <Text style={styles.vsText}>vs</Text>
        <Text style={styles.oppText}>{item.opponent_name}</Text>
      </View>
      
      <Text style={styles.eventName}>{item.event_name}</Text>

      {item.score ? (
         <View style={styles.resultBadge}>
             <Trophy size={14} color="#FFF" />
             <Text style={styles.resultText}>{item.score}</Text>
         </View>
      ) : (
         <View style={styles.tacticsPreview}>
             <Edit3 size={14} color="#64748B" />
             <Text style={styles.tacticsText} numberOfLines={1}>
                {item.tactics ? "Tactics set" : "Tap to add tactics"}
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
        <Text style={styles.headerTitle}>{userName ? `${userName}'s Diary` : 'Match Diary'}</Text>
        <View style={{width: 24}} />
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
            ListEmptyComponent={<Text style={styles.emptyText}>No matches found.</Text>}
          />
      )}

      {/* Show FAB if it's my diary OR if I'm a coach adding for a player */}
      <TouchableOpacity style={styles.fab} onPress={() => { resetForm(); setModalVisible(true); }}>
        <Plus size={32} color="#FFF" />
      </TouchableOpacity>

      {/* Edit/Create Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex:1}}>
        <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                    {editingMatch ? (editingMatch.score ? "Review Match" : "Match Prep") : "New Match"}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}><X size={24} color="#0F172A"/></TouchableOpacity>
            </View>
            
            <ScrollView contentContainerStyle={{padding: 20}}>
                {/* --- COACH / PRE-MATCH SECTION --- */}
                {(!editingMatch || !editingMatch.score) && (
                    <>
                        <View style={styles.sectionBadge}>
                            <Text style={styles.sectionBadgeText}>PRE-MATCH PLANNING</Text>
                        </View>
                        
                        <Text style={styles.label}>Event Name</Text>
                        <TextInput style={styles.input} value={event} onChangeText={setEvent} placeholder="e.g. Club Championship" editable={!editingMatch}/>
                        
                        <Text style={styles.label}>Opponent</Text>
                        <TextInput style={styles.input} value={opponent} onChangeText={setOpponent} placeholder="Opponent Name" editable={!editingMatch}/>
                        
                        <Text style={styles.label}>Tactical Plan</Text>
                        <TextInput 
                            style={[styles.input, styles.textArea]} 
                            value={tactics} 
                            onChangeText={setTactics} 
                            multiline 
                            placeholder={role === 'COACH' ? "Coach instructions..." : "My game plan..."}
                        />

                        <Text style={styles.label}>Round</Text>
                        <TextInput 
                          style={styles.input} 
                          value={round} 
                          onChangeText={setRound} 
                          placeholder="e.g. Semi-Final" 
                        />
                    </>
                )}

                {/* --- POST-MATCH SECTION (Typically Player) --- */}
                {editingMatch && (
                    <>
                        <View style={[styles.sectionBadge, {backgroundColor: '#F1F5F9', marginTop: 24}]}>
                            <Text style={[styles.sectionBadgeText, {color: '#475569'}]}>POST-MATCH REFLECTION</Text>
                        </View>
                        
                        <Text style={styles.label}>Final Score</Text>
                        <TextInput style={styles.input} value={score} onChangeText={setScore} placeholder="e.g. 6-4, 6-2"/>
                        
                        <Text style={styles.label}>Reflection</Text>
                        <TextInput 
                            style={[styles.input, styles.textArea]} 
                            value={reflection} 
                            onChangeText={setReflection} 
                            multiline 
                            placeholder="What worked? What didn't?"
                        />
                    </>
                )}

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
  backBtn: { padding: 4 },
  
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFF' },
  tab: { paddingVertical: 12, marginRight: 24, borderBottomWidth: 2, borderColor: 'transparent' },
  activeTab: { borderColor: COLORS.primary },
  tabText: { fontWeight: '600', color: '#64748B' },
  activeTabText: { color: COLORS.primary },

  list: { padding: 16 },
  card: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, ...SHADOWS.small },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  date: { fontSize: 12, color: '#94A3B8' },
  round: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  
  versusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  meText: { fontWeight: '700', color: '#0F172A' },
  vsText: { color: '#94A3B8', fontSize: 12 },
  oppText: { fontWeight: '700', color: '#EF4444' },
  eventName: { fontSize: 13, color: '#64748B', marginBottom: 12 },

  tacticsPreview: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#F1F5F9', padding: 8, borderRadius: 6 },
  tacticsText: { fontSize: 12, color: '#475569', fontStyle: 'italic' },
  
  resultBadge: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#10B981', padding: 8, borderRadius: 6, alignSelf: 'flex-start' },
  resultText: { color: '#FFF', fontWeight: '700', fontSize: 12 },

  fab: { position: 'absolute', bottom: 32, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', ...SHADOWS.medium },

  modalContent: { flex: 1, backgroundColor: '#FFF', paddingTop: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 10 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  label: { fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 20 },
  sectionHeader: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  sectionBadge: { alignSelf:'flex-start', backgroundColor: '#E0F2FE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginBottom: 4 },
  sectionBadgeText: { fontSize: 10, fontWeight: '800', color: '#0284C7' },
  saveBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 32 },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 40 }
});