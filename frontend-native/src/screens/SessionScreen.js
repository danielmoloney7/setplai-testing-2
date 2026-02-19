import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, Image, Pressable, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Clock, Dumbbell, Play, Pause, CheckCircle, ThumbsUp, ThumbsDown, Lightbulb, Check, Wand2, AlertCircle } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import api from '../services/api';
import { ASSESSMENT_DRILLS } from '../constants/data';
import EditSessionModal from '../components/EditSessionModal';

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

// --- COMPONENT: Hold to End Button ---
const HoldToEndButton = ({ onComplete }) => {
  const fillAnimation = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.timing(fillAnimation, {
      toValue: 1,
      duration: 1000, // 1 second hold
      useNativeDriver: false,
    }).start();
  };

  const handlePressOut = () => {
    fillAnimation.stopAnimation();
    fillAnimation.setValue(0);
  };

  const widthInterpolation = fillAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  });

  return (
    <Pressable 
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={() => {
        handlePressOut(); // Reset animation instantly
        onComplete();
      }}
      delayLongPress={1000} 
      style={styles.holdBtnContainer}
    >
      <Animated.View style={[styles.holdBtnFill, { width: widthInterpolation }]} />
      <View style={styles.holdBtnContent}>
        <AlertCircle size={18} color="#EF4444" style={{ marginRight: 8 }} />
        <Text style={styles.holdBtnText}>Hold to End Session</Text>
      </View>
    </Pressable>
  );
};

export default function SessionScreen({ route, navigation }) {
  const { session: initialSession, programId } = route.params || {};
  
  const [currentSession, setCurrentSession] = useState(initialSession);
  const [showAdaptModal, setShowAdaptModal] = useState(false);

  // States: 'OVERVIEW' -> 'PREP' -> 'COUNTDOWN' -> 'ACTIVE' -> 'FEEDBACK' -> 'SUMMARY'
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
  const [achievedValue, setAchievedValue] = useState('');

  // 1. Identify current item
  const currentItem = currentSession?.items ? currentSession.items[currentDrillIndex] : null;

  // 2. Look up global definition
  const drill = currentItem 
    ? ASSESSMENT_DRILLS.find(d => d.id === (currentItem.drill_id || currentItem.drillId)) || null
    : null;

  // 3. Define Scoring
  const drillScoring = (currentItem?.target_value || currentItem?.target_prompt)
    ? { prompt: currentItem.target_prompt || "Target", target: currentItem.target_value }
    : drill?.scoring;

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

  const handleFinishDrill = () => {
    setIsTimerRunning(false);
    setViewState('FEEDBACK'); 
  };

  const completeDrill = (outcome) => {
    if (!currentItem) return;

    const safeDrillId = currentItem.drill_id || currentItem.drillId || currentItem.id || "unknown_drill";
    
    const newLog = {
      drill_id: safeDrillId,
      outcome: outcome,
      achieved_value: achievedValue !== '' ? parseInt(achievedValue, 10) : 0 
    };
    
    setDrillLogs(prev => [...prev, newLog]);

    if (currentDrillIndex < currentSession.items.length - 1) {
      setCurrentDrillIndex(prev => prev + 1);
      setAchievedValue(''); 
      setViewState('PREP');
    } else {
      setViewState('SUMMARY');
    }
  };

  const handleEndEarly = () => {
    setIsTimerRunning(false);
    clearInterval(timerRef.current);
    
    if (currentSession && currentSession.items) {
      const skippedLogs = [];
      for (let i = currentDrillIndex; i < currentSession.items.length; i++) {
        const item = currentSession.items[i];
        skippedLogs.push({
          drill_id: item.drill_id || item.drillId || item.id || "unknown_drill",
          outcome: 'skipped',
          achieved_value: 0
        });
      }
      setDrillLogs(prev => [...prev, ...skippedLogs]);
    }

    setNotes(prev => (prev ? "[Ended Prematurely]\n" + prev : "[Ended Prematurely]"));
    setViewState('SUMMARY');
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
        session_id: currentSession.day_order || 1,
        duration_minutes: duration,
        rpe: rpe,
        notes: notes,
        drill_performances: safeLogs
      };

      await api.post('/sessions', payload);
      
      navigation.replace('SessionSummary', { 
          session: currentSession, 
          programId: programId 
      });

    } catch (error) {
      console.error("Save Error:", error);
      Alert.alert("Error", "Could not save session.");
    }
  };

  if (!currentSession) return <View style={styles.center}><Text>No Session Data</Text></View>;

  // ==================== 1. OVERVIEW VIEW ====================
  if (viewState === 'OVERVIEW') {
    const totalMins = currentSession.items.reduce((acc, i) => acc + (i.duration_minutes || i.targetDurationMin || 0), 0);

    return (
      <View style={styles.container}>
        <SafeAreaView style={{flex: 1}}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <ChevronLeft color="#334155" size={24} />
              <Text style={styles.backText}>Overview</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => setShowAdaptModal(true)} style={styles.iconBtn}>
               <Wand2 size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.mainTitle}>{currentSession.title}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}><Clock size={16} color="#64748B" /><Text style={styles.metaText}>{totalMins} min</Text></View>
              <View style={styles.metaItem}><Dumbbell size={16} color="#64748B" /><Text style={styles.metaText}>{currentSession.items.length} Drills</Text></View>
            </View>

            <View style={styles.listContainer}>
              {currentSession.items.map((item, idx) => {
                const diffColors = getDifficultyColor('Intermediate');
                return (
                  <View key={idx} style={styles.drillCard}>
                    <View style={styles.drillLeft}>
                      <Text style={styles.drillIndex}>DRILL {idx + 1}</Text>
                      <Text style={styles.drillName}>{item.drill_name || item.name}</Text>
                    </View>
                    <View style={styles.drillRight}>
                      <Text style={styles.drillDuration}>{item.duration_minutes || item.targetDurationMin || 0}m</Text>
                      <View style={[styles.pill, { backgroundColor: diffColors.bg, borderColor: diffColors.border }]}>
                        <Text style={[styles.pillText, { color: diffColors.text }]}>Drill</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.exitBtn} onPress={() => navigation.goBack()}><Text style={styles.exitBtnText}>Exit</Text></TouchableOpacity>
            <TouchableOpacity style={styles.startBtn} onPress={handleBeginSession}><Text style={styles.startBtnText}>Begin Session</Text></TouchableOpacity>
          </View>

          <EditSessionModal 
            visible={showAdaptModal}
            onClose={() => setShowAdaptModal(false)}
            session={currentSession}
            onSave={(updatedSession) => {
                setCurrentSession(updatedSession);
                setShowAdaptModal(false);
            }}
          />
        </SafeAreaView>
      </View>
    );
  }

  // ==================== 2. PREP VIEW ====================
  if (viewState === 'PREP') {
    // ✅ Logic to determine what media to show
    const getFullUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        const baseUrl = api.defaults.baseURL.replace('/api/v1', '');
        return `${baseUrl}${path}`;
    };

    const mediaUrl = currentItem.media_url || drill?.video_url;
    const isImage = mediaUrl && (mediaUrl.endsWith('.png') || mediaUrl.endsWith('.jpg') || mediaUrl.includes('/images/'));
    const finalMediaUrl = getFullUrl(mediaUrl);

    return (
      <View style={styles.container}>
        <SafeAreaView style={{flex: 1}}>
          <ScrollView contentContainerStyle={{padding: 24, paddingBottom: 100}}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16}}>
                <Text style={{fontSize: 14, color: '#64748B', fontWeight: '600'}}>Drill {currentDrillIndex + 1} of {currentSession.items.length}</Text>
                <View style={{backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4}}>
                    <Text style={{fontSize: 12, fontWeight: '800', color: '#475569'}}>PREP</Text>
                </View>
            </View>

            {/* ✅ UPDATED MEDIA BLOCK */}
            <View style={styles.mediaPlaceholder}>
                {finalMediaUrl ? (
                    isImage ? (
                        <Image 
                           source={{ uri: finalMediaUrl }} 
                           style={{width: '100%', height: '100%', borderRadius: 16}} 
                           resizeMode="contain"
                        />
                    ) : (
                        <View style={{alignItems: 'center'}}>
                            <Play size={48} color="#FFF" fill="rgba(255,255,255,0.2)" />
                            <Text style={{color: '#FFF', marginTop: 12, fontWeight: '600', opacity: 0.8}}>Video Preview</Text>
                        </View>
                    )
                ) : (
                    <View style={{alignItems: 'center'}}>
                        <Dumbbell size={48} color="#FFF" opacity={0.5} />
                        <Text style={{color: '#FFF', marginTop: 12, fontWeight: '600', opacity: 0.8}}>No Image Provided</Text>
                    </View>
                )}
            </View>

            <Text style={styles.prepTitle}>{currentItem.drill_name}</Text>
            <View style={{flexDirection: 'row', gap: 8, marginBottom: 24}}>
                <View style={[styles.tagPill, {backgroundColor: '#DCFCE7'}]}>
                    <Clock size={14} color="#15803D" />
                    <Text style={{color: '#15803D', fontWeight: 'bold', fontSize: 12, marginLeft: 4}}>{currentDuration} min</Text>
                </View>
            </View>

            <View style={styles.instructionBlock}>
                <Text style={styles.instructionLabel}>INSTRUCTIONS</Text>
                <Text style={styles.instructionText}>{currentItem.description || drill?.description || "Focus on form."}</Text>
            </View>

            {currentItem.notes && (
                <View style={styles.coachNoteBlock}>
                    <Lightbulb size={20} color="#CA8A04" style={{marginTop: 2}} />
                    <Text style={styles.coachNoteText}><Text style={{fontWeight: 'bold'}}>Coach Note: </Text>{currentItem.notes}</Text>
                </View>
            )}
          </ScrollView>

          <View style={styles.verticalFooter}>
            <TouchableOpacity style={[styles.startBtn, {width: '100%'}]} onPress={handleStartDrill}>
              <Text style={styles.startBtnText}>Start Drill</Text>
              <Play size={18} color="#FFF" fill="currentColor" style={{marginLeft: 8}} />
            </TouchableOpacity>
            <HoldToEndButton onComplete={handleEndEarly} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ==================== 3. COUNTDOWN ====================
  if (viewState === 'COUNTDOWN') {
    return (
      <View style={styles.countdownContainer}>
        <Text style={styles.countdownText}>{countDownValue}</Text>
        <Text style={styles.getReadyText}>GET READY</Text>
      </View>
    );
  }

  // ==================== 4. ACTIVE DRILL ====================
  if (viewState === 'ACTIVE') {
    return (
      <View style={[styles.container, { backgroundColor: '#0F172A' }]}>
        <SafeAreaView style={styles.activeContent}>
          <View style={{alignItems: 'center'}}>
            <Text style={{ color: '#94A3B8', fontWeight: '600', marginBottom: 8 }}>
                Drill {currentDrillIndex + 1} of {currentSession.items.length}
            </Text>
            <Text style={[styles.prepTitle, { color: '#FFF', textAlign: 'center', fontSize: 24 }]}>
                {currentItem.drill_name}
            </Text>
          </View>
          
          <View style={styles.timerCircle}>
            <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
            <TouchableOpacity onPress={() => setIsTimerRunning(!isTimerRunning)} style={styles.playPauseBtn}>
              {isTimerRunning ? <Pause color="#FFF" size={32} /> : <Play color="#FFF" size={32} style={{marginLeft: 4}} />}
            </TouchableOpacity>
          </View>

          <View style={{width: '100%', paddingHorizontal: 24, gap: 12}}>
              <TouchableOpacity style={styles.finishDrillBtn} onPress={handleFinishDrill}>
                <Check color="#FFF" size={24} />
                <Text style={styles.finishDrillText}>Complete Drill</Text>
              </TouchableOpacity>
              <HoldToEndButton onComplete={handleEndEarly} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ==================== 5. FEEDBACK VIEW ====================
  if (viewState === 'FEEDBACK') {
    return (
      <View style={[styles.container, { backgroundColor: '#F1F5F9' }]}>
        <SafeAreaView style={{flex: 1}}>
          <ScrollView contentContainerStyle={{flexGrow: 1, justifyContent: 'center', padding: 24}}>
              <View style={styles.feedbackCard}>
                  <Text style={styles.feedbackHeader}>Drill Complete!</Text>
                  <Text style={styles.feedbackSub}>{currentItem.drill_name}</Text>

                  <View style={styles.divider} />

                  {drillScoring ? (
                      <View style={{width: '100%', marginBottom: 24}}>
                          <Text style={styles.numericPrompt}>{drillScoring.prompt}</Text>
                          {drillScoring.target && (
                              <Text style={styles.targetLabel}>Target: {drillScoring.target}</Text>
                          )}
                          <TextInput
                              style={styles.numericInput}
                              keyboardType="numeric"
                              value={achievedValue}
                              onChangeText={setAchievedValue}
                              placeholder="0"
                              placeholderTextColor="#94A3B8"
                              autoFocus={true}
                          />
                      </View>
                  ) : (
                      <Text style={[styles.numericPrompt, {marginBottom: 24}]}>How did you perform?</Text>
                  )}

                  <View style={styles.feedbackGrid}>
                      <TouchableOpacity style={[styles.feedbackBtn, {backgroundColor: '#FEE2E2', borderColor: '#FECACA'}]} onPress={() => completeDrill('fail')}>
                          <ThumbsDown color="#DC2626" size={28} />
                          <Text style={[styles.feedbackBtnText, {color: '#DC2626'}]}>Struggled</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={[styles.feedbackBtn, {backgroundColor: '#DCFCE7', borderColor: '#BBF7D0'}]} onPress={() => completeDrill('success')}>
                          <ThumbsUp color="#16A34A" size={28} />
                          <Text style={[styles.feedbackBtnText, {color: '#16A34A'}]}>Nailed It</Text>
                      </TouchableOpacity>
                  </View>
              </View>
          </ScrollView>

          <View style={{paddingHorizontal: 24, paddingBottom: 16}}>
             <HoldToEndButton onComplete={handleEndEarly} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ==================== 6. SUMMARY VIEW ====================
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
              style={styles.input} placeholder="How did it feel?" 
              multiline numberOfLines={4} value={notes} onChangeText={setNotes}
            />
          </View>

          <TouchableOpacity style={[styles.startBtn, {width: '100%', marginTop: 24}]} onPress={saveSession}>
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
  header: { paddingHorizontal: 24, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backText: { fontSize: 16, fontWeight: '600', color: '#334155' },
  iconBtn: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 8 },

  // Content
  scrollContent: { paddingHorizontal: 24, paddingBottom: 100 },
  mainTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  
  metaRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 14, color: '#64748B', fontWeight: '500' },

  // Drill List
  listContainer: { gap: 12 },
  drillCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.small },
  drillLeft: { flex: 1, marginRight: 12 },
  drillIndex: { fontSize: 11, fontWeight: '800', color: COLORS.primary, marginBottom: 4, letterSpacing: 0.5 },
  drillName: { fontSize: 16, fontWeight: '700', color: '#1E293B', lineHeight: 22 },
  drillRight: { alignItems: 'flex-end', gap: 6 },
  drillDuration: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100, borderWidth: 1 },
  pillText: { fontSize: 10, fontWeight: '700' },

  // PREP VIEW
  mediaPlaceholder: { width: '100%', aspectRatio: 16/9, backgroundColor: '#1E293B', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 24, overflow: 'hidden' },
  prepTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  tagPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  instructionBlock: { backgroundColor: '#94A3B8', padding: 16, borderRadius: 12, marginBottom: 16 },
  instructionLabel: { fontSize: 12, fontWeight: '800', color: '#1E293B', marginBottom: 8, letterSpacing: 0.5 },
  instructionText: { fontSize: 14, color: '#1E293B', lineHeight: 20 },
  coachNoteBlock: { backgroundColor: '#E0F2FE', padding: 16, borderRadius: 12, flexDirection: 'row', gap: 12, borderLeftWidth: 4, borderLeftColor: '#0284C7' },
  coachNoteText: { flex: 1, fontSize: 14, color: '#0369A1', lineHeight: 20 },

  // COUNTDOWN
  countdownContainer: { flex: 1, backgroundColor: '#15803D', alignItems: 'center', justifyContent: 'center' },
  countdownText: { fontSize: 120, fontWeight: '900', color: '#FFF' },
  getReadyText: { fontSize: 24, fontWeight: '800', color: 'rgba(255,255,255,0.8)', letterSpacing: 2, marginTop: 20 },

  // ACTIVE VIEW
  activeContent: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'space-between', paddingBottom: 24 },
  timerCircle: { width: 300, height: 300, borderRadius: 150, borderWidth: 8, borderColor: '#15803D', alignItems: 'center', justifyContent: 'center', backgroundColor: '#020617' },
  timerText: { fontSize: 80, fontWeight: '800', color: '#FFF', fontVariant: ['tabular-nums'] },
  playPauseBtn: { marginTop: 20, backgroundColor: 'rgba(255,255,255,0.1)', padding: 16, borderRadius: 60 },
  finishDrillBtn: { backgroundColor: '#16A34A', padding: 20, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, width: '100%', ...SHADOWS.medium },
  finishDrillText: { color: '#FFF', fontSize: 18, fontWeight: '800' },

  // FEEDBACK VIEW
  feedbackCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 32, alignItems: 'center', ...SHADOWS.medium },
  feedbackHeader: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  feedbackSub: { fontSize: 16, color: '#64748B', textAlign: 'center', marginBottom: 24 },
  divider: { height: 1, width: '100%', backgroundColor: '#E2E8F0', marginBottom: 24 },
  
  numericPrompt: { fontSize: 16, fontWeight: '700', color: '#334155', marginBottom: 12, textAlign: 'center' },
  targetLabel: { fontSize: 12, fontWeight: '700', color: COLORS.primary, marginBottom: 8, textTransform: 'uppercase', textAlign: 'center' },
  numericInput: { backgroundColor: '#F8FAFC', width: '100%', height: 64, borderRadius: 16, fontSize: 32, fontWeight: '800', textAlign: 'center', color: '#0F172A', borderWidth: 1, borderColor: '#E2E8F0' },
  
  feedbackGrid: { flexDirection: 'row', gap: 16, width: '100%' },
  feedbackBtn: { flex: 1, padding: 24, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  feedbackBtnText: { fontWeight: '800', marginTop: 8, fontSize: 14 },

  // Footer & Common
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', padding: 16, flexDirection: 'row', gap: 12, paddingBottom: 32, ...SHADOWS.medium },
  verticalFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', padding: 16, gap: 12, paddingBottom: 32, ...SHADOWS.medium },
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Hold to End Button
  holdBtnContainer: {
    height: 56,
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
    width: '100%',
  },
  holdBtnFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#FECACA',
  },
  holdBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  holdBtnText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 16,
  }
});