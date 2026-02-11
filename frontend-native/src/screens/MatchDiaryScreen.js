import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform 
} from 'react-native';
// ✅ 1. Import Hook instead of Component
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronLeft, History, MessageSquare, Users, User, Calendar, CheckCircle } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { createMatchLog, fetchMatches, submitCoachFeedback, updateMatchDetails } from '../services/api';

const SURFACES = ["Hard", "Clay", "Grass", "Carpet"];
const ENVIRONMENTS = ["Outdoor", "Indoor"];
const FORMATS = ["Singles", "Doubles"];

export default function MatchDiaryScreen({ navigation, route }) {
  // ✅ 2. Get Insets
  const insets = useSafeAreaInsets();
  
  const { matchData } = route.params || {};
  const [userRole, setUserRole] = useState('PLAYER');
  const [loading, setLoading] = useState(false);
  
  // --- STATE ---
  const isEditing = !!matchData;
  const isCompleted = matchData?.result && matchData.result !== 'Scheduled';

  const [matchFormat, setMatchFormat] = useState(matchData?.match_format || 'Singles');
  const [partner, setPartner] = useState(matchData?.partner_name || '');
  const [opponent, setOpponent] = useState(matchData?.opponent_name || '');
  const [event, setEvent] = useState(matchData?.event_name || '');
  const [surface, setSurface] = useState(matchData?.surface || 'Hard');
  const [environment, setEnvironment] = useState(matchData?.environment || 'Outdoor');
  const [tactics, setTactics] = useState(matchData?.tactics || '');
  const [score, setScore] = useState(matchData?.score || '');
  const [reflection, setReflection] = useState(matchData?.reflection || '');
  const [coachFeedback, setCoachFeedback] = useState(matchData?.coach_feedback || '');
  const [historyStats, setHistoryStats] = useState(null);

  useEffect(() => { loadRole(); }, []);
  const loadRole = async () => {
      const role = await AsyncStorage.getItem('user_role');
      setUserRole(role || 'PLAYER');
  };

  const canEditDetails = userRole === 'PLAYER' && (!isEditing || !isCompleted);
  const canEditTactics = userRole === 'COACH' || (userRole === 'PLAYER' && !isCompleted);
  const showPostMatch = isEditing; 

  const checkHistory = async (name) => {
      if (name.length < 3) return;
      try {
        const history = await fetchMatches(); 
        const previous = history.filter(m => m.opponent_name && m.opponent_name.toLowerCase().includes(name.toLowerCase()) && m.id !== matchData?.id);
        if (previous.length > 0) {
            const wins = previous.filter(m => m.result === 'Win').length;
            setHistoryStats({ count: previous.length, wins, losses: previous.length - wins });
        } else { setHistoryStats(null); }
      } catch (e) { console.log("History check failed", e); }
  };

  const handleSave = async () => {
    if (!opponent || !event) { Alert.alert("Missing Info", "Please enter an Opponent and Event."); return; }
    setLoading(true);
    try {
        let resultStatus = matchData?.result || 'Scheduled';
        if (score.trim().length > 0) {
            const isWin = (score.includes('6') && !score.includes('0-6') && !score.includes('1-6'));
            resultStatus = isWin ? 'Win' : 'Loss'; 
        }
        if (isEditing) {
            const promises = [];
            if (userRole === 'COACH' && coachFeedback !== matchData.coach_feedback) {
                promises.push(submitCoachFeedback(matchData.id, coachFeedback));
            }
            promises.push(updateMatchDetails(matchData.id, {
                tactics, surface, environment, score, reflection,
                event_name: event, opponent_name: opponent,
                match_format: matchFormat, partner_name: partner,
                result: resultStatus 
            }));
            await Promise.all(promises);
            Alert.alert("Success", score ? "Match completed & saved!" : "Match details updated.");
            navigation.goBack();
        } else {
            await createMatchLog({
                event_name: event, opponent_name: opponent, match_format: matchFormat, partner_name: partner,
                round: "Round 1", surface, environment, tactics, score: null, result: 'Scheduled', reflection: null
            });
            Alert.alert("Scheduled", "Match added to your diary.");
            navigation.goBack();
        }
    } catch (e) { Alert.alert("Error", "Could not save entry."); console.error(e); } 
    finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      {/* ✅ 3. Custom Header with Explicit Padding & Z-Index */}
      <View style={[styles.customHeader, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.headerRow}>
            
            {/* BACK BUTTON */}
            <TouchableOpacity 
                onPress={() => navigation.goBack()} 
                style={styles.backBtn}
                activeOpacity={0.7}
            >
                <ChevronLeft size={28} color="#0F172A" />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
                <Text style={styles.headerTitle}>{isEditing ? "Match Details" : "Plan Match"}</Text>
                <Text style={styles.headerSub}>
                    {isCompleted ? "Completed" : (isEditing ? "Scheduled" : "New Entry")}
                </Text>
            </View>

            <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.saveBtn}>
                <Text style={styles.saveText}>
                    {loading ? "..." : (isEditing ? (score ? "Done" : "Save") : "Add")}
                </Text>
            </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex:1}}>
      <ScrollView contentContainerStyle={styles.form}>
          
          <View style={[styles.statusBanner, isCompleted ? styles.statusComplete : styles.statusUpcoming]}>
              {isCompleted ? <CheckCircle size={16} color="#166534" /> : <Calendar size={16} color="#854D0E" />}
              <Text style={[styles.statusText, isCompleted ? styles.textComplete : styles.textUpcoming]}>
                  {isCompleted ? "MATCH COMPLETED" : "PRE-MATCH PLANNING"}
              </Text>
          </View>

          {/* 1. MATCH SETUP */}
          <View style={styles.section}>
            <View style={styles.formatContainer}>
                {FORMATS.map(f => (
                    <TouchableOpacity 
                        key={f} 
                        style={[styles.formatBtn, matchFormat === f && styles.formatBtnActive]}
                        onPress={() => canEditDetails && setMatchFormat(f)}
                        disabled={!canEditDetails}
                    >
                        {f === 'Singles' ? <User size={16} color={matchFormat === f ? "#FFF" : "#64748B"} /> : <Users size={16} color={matchFormat === f ? "#FFF" : "#64748B"} />}
                        <Text style={[styles.formatText, matchFormat === f && styles.formatTextActive]}>{f}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {matchFormat === 'Doubles' && (
                <TextInput 
                    style={[styles.input, { marginBottom: 12, borderColor: '#3B82F6' }]} 
                    placeholder="Partner Name" 
                    value={partner}
                    onChangeText={setPartner}
                    editable={canEditDetails}
                />
            )}

            <TextInput 
                style={styles.input} 
                placeholder={matchFormat === 'Doubles' ? "Opponents (e.g. Smith / Jones)" : "Opponent Name"} 
                value={opponent}
                onChangeText={(t) => { setOpponent(t); checkHistory(t); }}
                editable={canEditDetails} 
            />
            {historyStats && (
                <View style={styles.historyAlert}>
                    <History size={16} color="#B45309" />
                    <Text style={styles.historyText}>H2H: {historyStats.wins}W - {historyStats.losses}L</Text>
                </View>
            )}
            <TextInput 
                style={[styles.input, {marginTop: 12}]} 
                placeholder="Tournament / Event" 
                value={event}
                onChangeText={setEvent}
                editable={canEditDetails}
            />
          </View>

          {/* 2. CONDITIONS */}
          <Text style={styles.label}>Conditions</Text>
          <View style={styles.row}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {SURFACES.map(s => (
                      <TouchableOpacity 
                        key={s} 
                        style={[styles.chip, surface === s && styles.chipActive]}
                        onPress={() => canEditDetails && setSurface(s)}
                        disabled={!canEditDetails}
                      >
                          <Text style={[styles.chipText, surface === s && styles.chipTextActive]}>{s}</Text>
                      </TouchableOpacity>
                  ))}
              </ScrollView>
          </View>
          <View style={[styles.row, { marginTop: 8 }]}>
              {ENVIRONMENTS.map(e => (
                  <TouchableOpacity 
                    key={e} 
                    style={[styles.chip, environment === e && styles.chipActive]}
                    onPress={() => canEditDetails && setEnvironment(e)}
                    disabled={!canEditDetails}
                  >
                      <Text style={[styles.chipText, environment === e && styles.chipTextActive]}>{e}</Text>
                  </TouchableOpacity>
              ))}
          </View>

          {/* 3. TACTICS */}
          <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop: 24, marginBottom: 8}}>
            <Text style={[styles.label, {marginTop:0}]}>Game Plan</Text>
            {userRole === 'COACH' && <Text style={{fontSize: 10, color: COLORS.primary, fontWeight:'700'}}>COACH EDITABLE</Text>}
          </View>
          <TextInput 
              style={[styles.input, styles.textArea, canEditTactics && { borderColor: COLORS.primary }]} 
              placeholder="Tactical Goals: Attack backhand? Serve & Volley?" 
              value={tactics}
              onChangeText={setTactics}
              multiline
              editable={canEditTactics} 
          />

          {/* 4. POST-MATCH */}
          {showPostMatch ? (
             <>
                <View style={styles.divider} />
                <Text style={styles.sectionHeader}>POST-MATCH</Text>
                <Text style={styles.label}>Score & Result</Text>
                <TextInput 
                    style={[styles.input, !score && { backgroundColor: '#F0FDF4' }]} 
                    placeholder="Enter Score (e.g. 6-4, 6-4)" 
                    value={score}
                    onChangeText={setScore}
                    editable={userRole === 'PLAYER' || userRole === 'COACH'}
                />
                <Text style={styles.label}>Player Reflection</Text>
                <TextInput 
                    style={[styles.input, styles.textArea]} 
                    placeholder="What went well? What needs work?" 
                    value={reflection}
                    onChangeText={setReflection}
                    multiline
                    editable={userRole === 'PLAYER'}
                />
                <View style={styles.coachSection}>
                    <View style={{flexDirection:'row', alignItems:'center', gap: 8, marginBottom: 8}}>
                        <MessageSquare size={20} color={COLORS.primary} />
                        <Text style={styles.coachLabel}>Coach's Corner</Text>
                    </View>
                    {userRole === 'COACH' ? (
                        <TextInput 
                            style={[styles.input, styles.textArea, {borderColor: COLORS.primary, backgroundColor: '#FFF'}]} 
                            placeholder="Add feedback for your player..." 
                            value={coachFeedback}
                            onChangeText={setCoachFeedback}
                            multiline
                        />
                    ) : (
                        <View style={styles.readOnlyBox}>
                            <Text style={[styles.readOnlyText, !coachFeedback && {color: '#94A3B8'}]}>
                                {coachFeedback || "No feedback from coach yet."}
                            </Text>
                        </View>
                    )}
                </View>
             </>
          ) : (
              <View style={styles.infoBox}>
                  <Text style={styles.infoText}>Save this schedule to unlock the Score & Reflection sections.</Text>
              </View>
          )}

      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  
  // ✅ 4. Robust Header Styles
  customHeader: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    zIndex: 100, // Ensure it's on top
    ...SHADOWS.small
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    height: 60, // Explicit height
  },
  backBtn: {
    width: 44, // Generous Touch Target
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9', // ✅ Visible Background for Debugging/UX
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  headerSub: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  
  saveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
  },
  saveText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },

  // Form Styles (Unchanged)
  form: { padding: 24, paddingBottom: 100 },
  section: { marginBottom: 12 },
  statusBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 8, borderRadius: 8, marginBottom: 20 },
  statusUpcoming: { backgroundColor: '#FEF9C3' },
  statusComplete: { backgroundColor: '#DCFCE7' },
  statusText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  textUpcoming: { color: '#854D0E' },
  textComplete: { color: '#166534' },
  label: { fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 8, marginTop: 12 },
  sectionHeader: { fontSize: 12, fontWeight: '800', color: '#94A3B8', marginTop: 24, marginBottom: 8, letterSpacing: 1 },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginTop: 24 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 14, fontSize: 16, color: '#0F172A' },
  textArea: { height: 100, textAlignVertical: 'top' },
  formatContainer: { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 12, padding: 4, marginBottom: 12 },
  formatBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 10 },
  formatBtnActive: { backgroundColor: COLORS.primary },
  formatText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  formatTextActive: { color: '#FFF' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0', marginRight: 8 },
  chipActive: { backgroundColor: '#E0F2FE', borderColor: '#0284C7' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  chipTextActive: { color: '#0284C7' },
  historyAlert: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF7ED', padding: 12, borderRadius: 8, marginTop: 8, borderWidth: 1, borderColor: '#FED7AA' },
  historyText: { color: '#9A3412', fontSize: 13, fontWeight: '600' },
  coachSection: { marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  coachLabel: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  readOnlyBox: { backgroundColor: '#F0FDF4', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#DCFCE7' },
  readOnlyText: { color: '#166534', fontSize: 15, fontStyle: 'italic' },
  infoBox: { marginTop: 32, padding: 16, backgroundColor: '#F1F5F9', borderRadius: 12, alignItems: 'center' },
  infoText: { color: '#64748B', fontSize: 13, textAlign: 'center' }
});