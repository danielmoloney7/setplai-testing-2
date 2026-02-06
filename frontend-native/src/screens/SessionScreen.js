import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, Animated, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Clock, Dumbbell, Play, Pause, CheckCircle, ThumbsUp, ThumbsDown, Zap, Lightbulb } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import api from '../services/api';

// --- HELPER: Format Time ---
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// --- HELPER: Difficulty Colors ---
const getDifficultyColor = (level) => {
  switch (level?.toLowerCase()) {
    case 'advanced': return { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA' }; 
    case 'intermediate': return { bg: '#FEF9C3', text: '#CA8A04', border: '#FEF08A' }; 
    case 'beginner': return { bg: '#DCFCE7', text: '#16A34A', border: '#BBF7D0' }; 
    default: return { bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB' }; 
  }
};

export default function SessionScreen({ route, navigation }) {
  const { session, programId } = route.params || {};
  
  // States: 'OVERVIEW' -> 'PREP' -> 'COUNTDOWN' -> 'ACTIVE' -> 'SUMMARY'
  const [viewState, setViewState] = useState('OVERVIEW');
  const [currentDrillIndex, setCurrentDrillIndex] = useState(0);
  
  // Timer & Countdown
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [countDownValue, setCountDownValue] = useState(3);
  const timerRef = useRef(null);

  // Data
  const [drillLogs, setDrillLogs] = useState([]);
  const [rpe, setRpe] = useState(5);
  const [notes, setNotes] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState(null);

  const currentItem = session?.items ? session.items[currentDrillIndex] : null;
  // Robustly handle duration from different sources (DB vs Mock)
  const currentDuration = currentItem ? (currentItem.duration_minutes || currentItem.targetDurationMin || 10) : 0;

  // --- TIMER LOGIC ---
  useEffect(() => {
    if (isTimerRunning && timeLeft > 0 && viewState === 'ACTIVE') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsTimerRunning(false);
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerRunning, timeLeft, viewState]);

  // Countdown Logic
  useEffect(() => {
    if (viewState === 'COUNTDOWN') {
      if (countDownValue > 0) {
        const timer = setTimeout(() => setCountDownValue(p => p - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        // Countdown finished, start actual drill
        setViewState('ACTIVE');
        setTimeLeft(currentDuration * 60);
        setIsTimerRunning(true);
      }
    }
  }, [viewState, countDownValue, currentDuration]);

  // --- ACTIONS ---

  const handleBeginSession = () => {
    setSessionStartTime(new Date());
    setViewState('PREP');
  };

  const handleStartDrill = () => {
    setCountDownValue(3);
    setViewState('COUNTDOWN');
  };

  const completeDrill = (outcome) => {
    if (!currentItem) return;

    // ✅ FIX: Robustly find the drill ID.
    // Backend sends 'drill_id'. Mock data might use 'drillId' or 'id'.
    // We default to "unknown_drill" to prevent 422 crashes, but logged errors help debug.
    const safeDrillId = currentItem.drill_id || currentItem.drillId || currentItem.id || "unknown_drill";
    
    if (safeDrillId === "unknown_drill") {
        console.warn("⚠️ Warning: Drill ID missing for item:", currentItem);
    }

    const newLog = {
      drill_id: safeDrillId,
      outcome: outcome,
      achieved_value: 0
    };
    
    // Add to local logs
    setDrillLogs(prev => [...prev, newLog]);

    if (currentDrillIndex < session.items.length - 1) {
      setCurrentDrillIndex(prev => prev + 1);
      setViewState('PREP'); // Go to Prep for next drill
    } else {
      setViewState('SUMMARY');
    }
  };

  const saveSession = async () => {
    try {
      const endTime = new Date();
      const startTime = sessionStartTime || endTime;
      const duration = Math.round((endTime - startTime) / 60000) || 1;

      const safeLogs = drillLogs.map(log => ({
          ...log,
          drill_id: log.drill_id || "unknown_drill" 
      }));

      const payload = {
        program_id: programId,
        session_id: session.day_order || 1, // ✅ CHANGED: Key is now session_id
        duration_minutes: duration,
        rpe: rpe,
        notes: notes,
        drill_performances: safeLogs
      };

      console.log("Saving Session...");
      await api.post('/sessions', payload);
      
      // ✅ FIX: Navigate IMMEDIATELY (Don't wait for Alert)
      navigation.navigate('Main', { screen: 'Progress' });

      // Show success after navigation starts
      setTimeout(() => {
        Alert.alert("Great Job!", "Session saved! XP Earned.");
      }, 500);

    } catch (error) {
      console.error("Save Error:", error);
      Alert.alert("Error", "Could not save session. Please try again.");
    }
  };

  if (!session) return <View style={styles.center}><Text>No Session Data</Text></View>;

  // ==================== 1. OVERVIEW VIEW ====================
  if (viewState === 'OVERVIEW') {
    const totalMins = session.items.reduce((acc, i) => acc + (i.duration_minutes || i.targetDurationMin || 0), 0);

    return (
      <View style={styles.container}>
        <SafeAreaView style={{flex: 1}}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <ChevronLeft color="#334155" size={24} />
              <Text style={styles.backText}>Session Overview</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.mainTitle}>{session.title}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Clock size={16} color="#64748B" />
                <Text style={styles.metaText}>{totalMins} min</Text>
              </View>
              <View style={styles.metaItem}>
                <Dumbbell size={16} color="#64748B" />
                <Text style={styles.metaText}>{session.items.length} Drills</Text>
              </View>
            </View>

            <View style={styles.listContainer}>
              {session.items.map((item, idx) => {
                const difficulties = ['Beginner', 'Intermediate', 'Advanced'];
                const diff = difficulties[idx % 3]; 
                const diffColors = getDifficultyColor(diff);
                const duration = item.duration_minutes || item.targetDurationMin || 0;

                return (
                  <View key={idx} style={styles.drillCard}>
                    <View style={styles.drillLeft}>
                      <Text style={styles.drillIndex}>DRILL {idx + 1}</Text>
                      <Text style={styles.drillName}>{item.drill_name || item.name || 'Drill'}</Text>
                    </View>
                    <View style={styles.drillRight}>
                      <Text style={styles.drillDuration}>{duration}m</Text>
                      <View style={[styles.pill, { backgroundColor: diffColors.bg, borderColor: diffColors.border }]}>
                        <Text style={[styles.pillText, { color: diffColors.text }]}>{diff}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.exitBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.exitBtnText}>Exit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.startBtn} onPress={handleBeginSession}>
              <Text style={styles.startBtnText}>Begin Session</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ==================== 2. PREP VIEW (Drill Details) ====================
  if (viewState === 'PREP') {
    return (
      <View style={styles.container}>
        <SafeAreaView style={{flex: 1}}>
          <ScrollView contentContainerStyle={{padding: 24, paddingBottom: 100}}>
            
            {/* Header Row */}
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16}}>
                <Text style={{fontSize: 14, color: '#64748B', fontWeight: '600'}}>Drill {currentDrillIndex + 1} of {session.items.length}</Text>
                <View style={{backgroundColor: '#F1F5F9', px: 2, py: 1, borderRadius: 4}}>
                    <Text style={{fontSize: 12, fontWeight: '800', color: '#475569'}}>PREP</Text>
                </View>
            </View>

            {/* Media Placeholder (Video) */}
            <View style={styles.mediaPlaceholder}>
                <View style={{alignItems: 'center'}}>
                    <Play size={48} color="#FFF" fill="rgba(255,255,255,0.2)" />
                    <Text style={{color: '#FFF', marginTop: 12, fontWeight: '600', opacity: 0.8}}>Video Preview</Text>
                </View>
            </View>

            {/* Title & Tags */}
            <Text style={styles.prepTitle}>{currentItem.drill_name || "Drill Name"}</Text>
            <View style={{flexDirection: 'row', gap: 8, marginBottom: 24}}>
                <View style={[styles.tagPill, {backgroundColor: '#DCFCE7'}]}>
                    <Clock size={14} color="#15803D" />
                    <Text style={{color: '#15803D', fontWeight: 'bold', fontSize: 12, marginLeft: 4}}>{currentDuration} min</Text>
                </View>
                <View style={[styles.tagPill, {backgroundColor: '#F1F5F9'}]}>
                    <Dumbbell size={14} color="#64748B" />
                    <Text style={{color: '#64748B', fontWeight: 'bold', fontSize: 12, marginLeft: 4}}>1 Set</Text>
                </View>
            </View>

            {/* Instructions */}
            <View style={styles.instructionBlock}>
                <Text style={styles.instructionLabel}>INSTRUCTIONS</Text>
                <Text style={styles.instructionText}>
                    {currentItem.description || "Focus on consistency and technique. Maintain a steady rhythm throughout the drill."}
                </Text>
            </View>

            {/* Coach Note */}
            <View style={styles.coachNoteBlock}>
                <Lightbulb size={20} color="#CA8A04" style={{marginTop: 2}} />
                <Text style={styles.coachNoteText}>
                    <Text style={{fontWeight: 'bold'}}>Coach Note: </Text>
                    {currentItem.notes || "Keep your eye on the ball and follow through."}
                </Text>
            </View>

          </ScrollView>

          {/* Fixed Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={[styles.startBtn, {width: '100%'}]} onPress={handleStartDrill}>
              <Text style={styles.startBtnText}>Start Drill</Text>
              <Play size={18} color="#FFF" fill="currentColor" style={{marginLeft: 8}} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ==================== 3. COUNTDOWN VIEW ====================
  if (viewState === 'COUNTDOWN') {
    return (
      <View style={styles.countdownContainer}>
        <Text style={styles.countdownText}>{countDownValue}</Text>
        <Text style={styles.getReadyText}>GET READY</Text>
      </View>
    );
  }

  // ==================== 4. ACTIVE DRILL VIEW ====================
  if (viewState === 'ACTIVE') {
    return (
      <View style={[styles.container, { backgroundColor: '#0F172A' }]}>
        <SafeAreaView style={styles.activeContent}>
          <Text style={{ color: '#94A3B8', fontWeight: '600' }}>Drill {currentDrillIndex + 1} of {session.items.length}</Text>
          <Text style={[styles.prepTitle, { color: '#FFF', textAlign: 'center', marginTop: 10, fontSize: 28 }]}>{currentItem.drill_name}</Text>
          
          {/* Circular Timer */}
          <View style={styles.timerCircle}>
            <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
            <TouchableOpacity onPress={() => setIsTimerRunning(!isTimerRunning)} style={styles.playPauseBtn}>
              {isTimerRunning ? <Pause color="#FFF" size={24} /> : <Play color="#FFF" size={24} style={{marginLeft: 4}} />}
            </TouchableOpacity>
          </View>

          {/* Floating Instructions */}
          <View style={styles.activeInstructionBox}>
            <Text style={{color: '#E2E8F0', fontSize: 16, textAlign: 'center'}}>
                {currentItem.notes || "Focus on form"}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#EF4444'}]} onPress={() => completeDrill('fail')}>
              <ThumbsDown color="#FFF" />
              <Text style={styles.actionBtnText}>Struggled</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#22C55E'}]} onPress={() => completeDrill('success')}>
              <ThumbsUp color="#FFF" />
              <Text style={styles.actionBtnText}>Nailed It</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ==================== 5. SUMMARY VIEW ====================
  return (
    <View style={styles.container}>
      <SafeAreaView style={{flex: 1}}>
        <ScrollView contentContainerStyle={{padding: 24, alignItems: 'center'}}>
          <CheckCircle color={COLORS.primary} size={64} style={{marginBottom: 20}} />
          <Text style={[styles.mainTitle, {textAlign: 'center'}]}>Session Complete!</Text>
          
          <View style={{width: '100%', marginTop: 32}}>
            <Text style={styles.label}>Rate Intensity (1-10)</Text>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24}}>
              {[1,3,5,7,9].map(num => (
                <TouchableOpacity key={num} onPress={() => setRpe(num)} style={[styles.rpeBtn, rpe === num && styles.rpeBtnActive]}>
                  <Text style={[styles.rpeText, rpe === num && {color: '#FFF'}]}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Notes</Text>
            <TextInput 
              style={styles.input} 
              placeholder="How did it feel?" 
              multiline 
              numberOfLines={4} 
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          <TouchableOpacity style={[styles.startBtn, {width: '100%', marginTop: 24}]} onPress={saveSession} >
            <Text style={styles.startBtnText}>Save & Finish</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  
  // Header
  header: { paddingHorizontal: 24, paddingVertical: 16 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backText: { fontSize: 16, fontWeight: '600', color: '#334155' },

  // Content
  scrollContent: { paddingHorizontal: 24, paddingBottom: 100 },
  mainTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  
  metaRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 14, color: '#64748B', fontWeight: '500' },

  // Drill List
  listContainer: { gap: 12 },
  drillCard: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.small
  },
  drillLeft: { flex: 1, marginRight: 12 },
  drillIndex: { fontSize: 11, fontWeight: '800', color: COLORS.primary, marginBottom: 4, letterSpacing: 0.5 },
  drillName: { fontSize: 16, fontWeight: '700', color: '#1E293B', lineHeight: 22 },
  drillRight: { alignItems: 'flex-end', gap: 6 },
  drillDuration: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100, borderWidth: 1 },
  pillText: { fontSize: 10, fontWeight: '700' },

  // PREP VIEW STYLES
  mediaPlaceholder: {
    width: '100%', aspectRatio: 16/9, backgroundColor: '#1E293B', borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24
  },
  prepTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  tagPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  instructionBlock: { backgroundColor: '#94A3B8', padding: 16, borderRadius: 12, marginBottom: 16 }, // Matches gray in image
  instructionLabel: { fontSize: 12, fontWeight: '800', color: '#1E293B', marginBottom: 8, letterSpacing: 0.5 },
  instructionText: { fontSize: 14, color: '#1E293B', lineHeight: 20 },
  coachNoteBlock: { backgroundColor: '#E0F2FE', padding: 16, borderRadius: 12, flexDirection: 'row', gap: 12, borderLeftWidth: 4, borderLeftColor: '#0284C7' },
  coachNoteText: { flex: 1, fontSize: 14, color: '#0369A1', lineHeight: 20 },

  // COUNTDOWN VIEW
  countdownContainer: { flex: 1, backgroundColor: '#15803D', alignItems: 'center', justifyContent: 'center' },
  countdownText: { fontSize: 120, fontWeight: '900', color: '#FFF' },
  getReadyText: { fontSize: 24, fontWeight: '800', color: 'rgba(255,255,255,0.8)', letterSpacing: 2, marginTop: 20 },

  // ACTIVE VIEW STYLES
  activeContent: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'space-between' },
  timerCircle: { 
    width: 280, height: 280, borderRadius: 140, 
    borderWidth: 8, borderColor: '#15803D', // Green Border
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#020617' 
  },
  timerText: { fontSize: 72, fontWeight: '800', color: '#FFF', fontVariant: ['tabular-nums'] },
  playPauseBtn: { marginTop: 16, backgroundColor: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 50 },
  activeInstructionBox: { backgroundColor: '#1E293B', padding: 16, borderRadius: 12, width: '100%', alignItems: 'center' },
  actionRow: { flexDirection: 'row', gap: 16, width: '100%' },
  actionBtn: { flex: 1, padding: 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { color: '#FFF', fontWeight: '800', marginTop: 8, fontSize: 16 },

  // Footer & Common
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E2E8F0',
    padding: 16, flexDirection: 'row', gap: 12, paddingBottom: 32,
    ...SHADOWS.medium
  },
  exitBtn: { flex: 1, backgroundColor: '#334155', padding: 16, borderRadius: 12, alignItems: 'center' },
  exitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  startBtn: { flex: 2, backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  startBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  
  // Summary Form
  label: { fontSize: 14, fontWeight: '700', marginBottom: 12, color: '#334155' },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 16, height: 120, textAlignVertical: 'top', fontSize: 16 },
  rpeBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  rpeBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  rpeText: { fontWeight: '700', fontSize: 16, color: '#64748B' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});