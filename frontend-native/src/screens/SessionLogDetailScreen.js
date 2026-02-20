import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, Keyboard, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronLeft, Clock, Activity, Calendar, CheckCircle, XCircle, FileText, User, Heart, MessageSquare, Save, Edit2 } from 'lucide-react-native'; 
import { COLORS, SHADOWS } from '../constants/theme';
import api, { submitSessionFeedback } from '../services/api';

export default function SessionLogDetailScreen({ route, navigation }) {
  const { sessionLog } = route.params;
  const [role, setRole] = useState('PLAYER');
  
  // Feedback State
  const [feedback, setFeedback] = useState(sessionLog.coach_feedback || '');
  const [liked, setLiked] = useState(sessionLog.coach_liked || false);
  const [saving, setSaving] = useState(false);
  
  // Control Edit Mode
  // If feedback exists, start closed (false). If empty, start open (true).
  const [isEditing, setIsEditing] = useState(!sessionLog.coach_feedback);

  const getFullImageUrl = (path) => {
      if (!path) return null;
      if (path.startsWith('http')) return path;
      const baseUrl = api.defaults.baseURL.replace('/api/v1', '');
      return `${baseUrl}${path}`;
  };

  useEffect(() => {
      AsyncStorage.getItem('user_role').then(r => {
          if (r) setRole(r.toUpperCase());
      });
  }, []);

  const handleSaveFeedback = async () => {
      setSaving(true);
      Keyboard.dismiss(); // Close keyboard
      try {
          await submitSessionFeedback(sessionLog.id, feedback, liked);
          Alert.alert("Success", "Feedback saved!");
          setIsEditing(false); // Close the card (switch to view mode)
      } catch (e) {
          console.error(e);
          Alert.alert("Error", "Could not save feedback.");
      } finally {
          setSaving(false);
      }
  };

  const toggleLike = () => {
      if (role === 'COACH') {
          setLiked(!liked);
      }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown Date';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const getRpeColor = (rpe) => {
    if (rpe >= 8) return '#EF4444';
    if (rpe >= 5) return '#F59E0B';
    return '#22C55E';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{flex:1}}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session Report</Text>
        <TouchableOpacity onPress={toggleLike} style={styles.likeBtn}>
            <Heart size={24} color={liked ? '#EF4444' : '#94A3B8'} fill={liked ? '#EF4444' : 'transparent'} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {sessionLog.photo_url && (
            <Image source={{ uri: getFullImageUrl(sessionLog.photo_url) }} style={styles.heroImage} />
        )}

        {/* Overview Card */}
        <View style={styles.overviewCard}>
          <View style={styles.programBadge}>
             <Text style={styles.programText}>{sessionLog.program?.title || "Training Session"}</Text>
          </View>
          <Text style={styles.sessionTitle}>{sessionLog.title || `Session ${sessionLog.session_id}`}</Text>
          <View style={styles.metaRow}>
             <View style={styles.metaItem}>
                <User size={14} color="#64748B"/>
                <Text style={styles.metaText}>{sessionLog.player_name || "Athlete"}</Text>
             </View>
             <View style={styles.metaItem}>
                <Calendar size={14} color="#64748B"/>
                <Text style={styles.metaText}>{formatDate(sessionLog.date_completed)}</Text>
             </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
               <Clock size={20} color={COLORS.primary} style={{marginBottom: 4}}/>
               <Text style={styles.statValue}>{sessionLog.duration_minutes}m</Text>
               <Text style={styles.statLabel}>Duration</Text>
            </View>
            <View style={styles.statBox}>
               <Activity size={20} color={getRpeColor(sessionLog.rpe)} style={{marginBottom: 4}}/>
               <Text style={[styles.statValue, {color: getRpeColor(sessionLog.rpe)}]}>{sessionLog.rpe}/10</Text>
               <Text style={styles.statLabel}>Intensity</Text>
            </View>
          </View>
        </View>

        {/* COACH FEEDBACK SECTION */}
        <View style={styles.section}>
            <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 12}}>
                <Text style={styles.sectionTitle}>Coach Feedback</Text>
                {/* Show Edit button if in Read Mode and User is Coach */}
                {role === 'COACH' && !isEditing && (
                    <TouchableOpacity onPress={() => setIsEditing(true)}>
                        <Text style={{color: COLORS.primary, fontWeight: '700', fontSize: 12}}>Edit</Text>
                    </TouchableOpacity>
                )}
            </View>

            {role === 'COACH' && isEditing ? (
                <View style={styles.feedbackInputBox}>
                    <TextInput 
                        style={styles.feedbackInput}
                        placeholder="Leave a comment for your athlete..."
                        placeholderTextColor="#94A3B8"
                        multiline
                        textAlignVertical="top"
                        value={feedback}
                        onChangeText={setFeedback}
                    />
                    <View style={{flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12}}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditing(false)}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveFeedback} disabled={saving}>
                            <Save size={16} color="#FFF" />
                            <Text style={styles.saveText}>{saving ? "Saving..." : "Save"}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <View style={styles.feedbackReadBox}>
                    <MessageSquare size={16} color={COLORS.primary} style={{marginRight: 8, marginTop: 2}}/>
                    <Text style={styles.feedbackText}>
                        {feedback || "No feedback yet."}
                    </Text>
                    {liked && (
                        <View style={styles.likedTag}>
                            <Heart size={10} color="#FFF" fill="#FFF" />
                            <Text style={styles.likedText}>Coach Liked This</Text>
                        </View>
                    )}
                </View>
            )}
        </View>

        {/* Player Notes */}
        {sessionLog.notes && (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Athlete Notes</Text>
                <View style={styles.noteCard}>
                    <FileText size={16} color="#64748B" style={{marginRight: 8, marginTop: 2}}/>
                    <Text style={styles.noteText}>{sessionLog.notes}</Text>
                </View>
            </View>
        )}

        {/* Drill Breakdown */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Drill Performance</Text>
            {sessionLog.drill_performances && sessionLog.drill_performances.length > 0 ? (
                sessionLog.drill_performances.map((perf, index) => (
                    // ✅ Apply opacity if the drill was skipped
                    <View key={index} style={[styles.drillRow, perf.outcome === 'skipped' && { opacity: 0.6 }]}>
                        <View style={styles.drillInfo}>
                            <Text style={styles.drillName}>{perf.drill_name || "Drill " + (index + 1)}</Text>
                            {perf.achieved_value > 0 && (
                                <Text style={styles.drillResult}>
                                    Result: <Text style={{fontWeight: '700', color: '#0F172A'}}>{perf.achieved_value}</Text> reps
                                </Text>
                            )}
                        </View>
                        <View style={styles.drillStatus}>
                            {/* ✅ Updated to handle success, skipped, and default failure */}
                            {perf.outcome === 'success' ? (
                                <View style={[styles.statusBadge, {backgroundColor: '#DCFCE7'}]}>
                                    <CheckCircle size={14} color="#16A34A"/>
                                    <Text style={[styles.statusText, {color: '#16A34A'}]}>PASSED</Text>
                                </View>
                            ) : perf.outcome === 'skipped' ? (
                                <View style={[styles.statusBadge, {backgroundColor: '#F1F5F9'}]}>
                                    <XCircle size={14} color="#64748B"/>
                                    <Text style={[styles.statusText, {color: '#64748B'}]}>SKIPPED</Text>
                                </View>
                            ) : (
                                <View style={[styles.statusBadge, {backgroundColor: '#FEE2E2'}]}>
                                    <XCircle size={14} color="#DC2626"/>
                                    <Text style={[styles.statusText, {color: '#DC2626'}]}>MISSED</Text>
                                </View>
                            )}
                        </View>
                    </View>
                ))
            ) : (
                <Text style={{color: '#94A3B8', fontStyle: 'italic'}}>No drill data recorded.</Text>
            )}
        </View>

      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  backBtn: { padding: 4 },
  likeBtn: { padding: 4 },
  content: { padding: 24, paddingBottom: 60 },

  heroImage: { width: '100%', height: 250, borderRadius: 16, marginBottom: 20, backgroundColor: '#E2E8F0', resizeMode: 'cover' },

  overviewCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.medium },
  programBadge: { alignSelf: 'flex-start', backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 8 },
  programText: { color: '#2563EB', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  sessionTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  metaRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: '#64748B' },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 16 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  statLabel: { fontSize: 12, color: '#64748B', fontWeight: '600', marginTop: 4 },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' }, 
  
  // Feedback Styles
  feedbackInputBox: { backgroundColor: '#FFF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  feedbackInput: { minHeight: 80, textAlignVertical: 'top', fontSize: 14, color: '#334155' },
  
  // Updated Buttons
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  saveText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  cancelText: { color: '#64748B', fontWeight: '600', fontSize: 12 },

  feedbackReadBox: { backgroundColor: '#F0F9FF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#BAE6FD', flexDirection: 'row' },
  feedbackText: { flex: 1, fontSize: 14, color: '#0F172A', lineHeight: 20 },
  likedTag: { flexDirection: 'row', alignItems: 'center', gap: 4, position: 'absolute', top: -10, right: 12, backgroundColor: '#EF4444', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  likedText: { color: '#FFF', fontSize: 10, fontWeight: '700' },

  noteCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row' },
  noteText: { flex: 1, fontSize: 14, color: '#334155', lineHeight: 20 },

  drillRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  drillName: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  drillResult: { fontSize: 13, color: '#64748B' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 },
  statusText: { fontSize: 11, fontWeight: '800' }
});