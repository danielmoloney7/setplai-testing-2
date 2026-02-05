import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, ScrollView, 
  TouchableOpacity, Alert, ActivityIndicator, Platform, KeyboardAvoidingView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native'; // ✅ IMPORT THIS
import { 
  ChevronLeft, Check, Users, User, ChevronRight, 
  Wand2, Layers, Edit2, PlayCircle
} from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';

// Import API services
import { fetchMyTeam, fetchDrills, createProgram } from '../services/api'; 
import { generateAIProgram } from '../services/geminiService';

const PREMADE_PROGRAMS = [
  { id: 'p1', title: 'Beginner Foundation', desc: '4 weeks • Fundamentals' },
  { id: 'p2', title: 'Serve Power Up', desc: '2 weeks • Technique focus' },
  { id: 'p3', title: 'Cardio Tennis', desc: 'Ongoing • High Intensity' },
];

export default function ProgramBuilderScreen({ navigation, route }) {
  const { squadMode } = route.params || {}; 

  const [step, setStep] = useState(squadMode ? 1 : 0); 
  const [creationMethod, setCreationMethod] = useState(null); 
  
  // User Context
  const [userRole, setUserRole] = useState('PLAYER'); 
  const [userId, setUserId] = useState(null);
  
  // Data
  const [loading, setLoading] = useState(false);
  const [athletes, setAthletes] = useState([]);
  const [availableDrills, setAvailableDrills] = useState([]);
  const [squads, setSquads] = useState([
    { id: 'sq1', name: 'Elite Juniors', memberCount: 4 },
    { id: 'sq2', name: 'Morning Cardio', memberCount: 8 }
  ]);

  // Form State
  const [prompt, setPrompt] = useState('');
  const [durationWeeks, setDurationWeeks] = useState('4');
  const [draftProgram, setDraftProgram] = useState({ title: '', description: '', sessions: [] });
  const [selectedTargets, setSelectedTargets] = useState([]);

  useEffect(() => {
    const init = async () => {
        const role = await AsyncStorage.getItem('user_role');
        const id = await AsyncStorage.getItem('user_id'); 
        if (role) setUserRole(role.toUpperCase());
        if (id) setUserId(id);

        try {
            // Load data silently
            const [teamData, drillsData] = await Promise.all([fetchMyTeam(), fetchDrills()]);
            setAthletes(teamData || []);
            setAvailableDrills(drillsData || []);
        } catch (e) { console.log("Data load error", e); }
    };
    init();
  }, []);

  // --- LOGIC: GENERATION ---
  const handleGenerate = async () => {
    if (!prompt.trim()) return Alert.alert("Required", "Please describe your goal.");

    setLoading(true);
    try {
        const aiResult = await generateAIProgram(
            `${prompt} (Duration: ${durationWeeks} weeks)`, 
            availableDrills, 
            { id: userId, role: userRole }
        );

        if (aiResult) {
            setDraftProgram({ 
                title: aiResult.title, 
                description: aiResult.description, 
                sessions: aiResult.sessions || [] 
            });
            setStep(2); // Proceed to Review
        } else {
            Alert.alert("Error", "AI generation failed. Please try again.");
        }
    } catch (e) { 
        console.error(e);
        Alert.alert("Error", "Connection failed."); 
    } finally { 
        setLoading(false); 
    }
  };

  // --- LOGIC: SAVE & REDIRECT (ROBUST) ---
  const handleFinalize = async (targets) => {
    console.log("Finalizing program for targets:", targets);
    setLoading(true);

    try {
        // 1. Prepare Payload
        const payload = {
            title: draftProgram.title,
            description: draftProgram.description || "",
            status: userRole === 'PLAYER' ? 'ACTIVE' : 'PENDING', 
            assigned_to: userRole === 'PLAYER' ? ['SELF'] : targets,
            sessions: draftProgram.sessions.map((s, i) => ({
                day: i + 1,
                drills: (s.items || []).map(item => {
                    // ✅ LOOKUP REAL DRILL NAME (Fixes "d9" display issue)
                    const realDrill = availableDrills.find(d => d.id === (item.drillId || item.id));
                    const prettyName = realDrill ? realDrill.name : (item.drill_name || item.name || "Drill");

                    return {
                        drill_id: item.drillId || item.id, 
                        drill_name: prettyName, 
                        duration: parseInt(item.duration || item.targetDurationMin || 15),
                        notes: item.notes || ""
                    };
                })
            }))
        };

        console.log("Sending Payload...", JSON.stringify(payload, null, 2));

        // 2. Call API
        await createProgram(payload);
        console.log("SUCCESS: Program Saved");

        // 3. ROBUST NAVIGATION RESET (Fixes the button issue)
        setLoading(false);
        
        // Define where we want to land
        const targetTab = userRole === 'PLAYER' ? 'Plans' : 'Programs';
        
        // Use reset to force a clean slate transition
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [
                    {
                        name: 'Main',
                        state: {
                            routes: [{ name: targetTab }],
                        },
                    },
                ],
            })
        );
        
        // Optional: Show Success Message (Small delay to allow nav to start)
        setTimeout(() => {
            Alert.alert("Success", userRole === 'PLAYER' ? "Plan started!" : "Program assigned!");
        }, 500);

    } catch (e) {
        console.error("Save Error:", e);
        setLoading(false);
        Alert.alert("Error", "Could not save program. Please check your connection.");
    }
  };

  const toggleTarget = (id) => {
    if (selectedTargets.includes(id)) {
      setSelectedTargets(prev => prev.filter(t => t !== id));
    } else {
      setSelectedTargets(prev => [...prev, id]);
    }
  };

  // --- RENDERERS ---

  const renderStep0 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.headerTitleLarge}>Create New Plan</Text>
      <Text style={styles.subText}>Choose how you want to build this program.</Text>
      
      <TouchableOpacity style={styles.methodCard} onPress={() => { setCreationMethod('AI'); setStep(1); }}>
        <View style={[styles.iconBox, { backgroundColor: '#F3E8FF' }]}>
          <Wand2 size={28} color="#9333EA" />
        </View>
        <View style={{flex: 1}}>
          <Text style={styles.cardTitle}>AI Generator</Text>
          <Text style={styles.cardDesc}>Describe your goals and let Setplai build a custom plan.</Text>
        </View>
        <ChevronRight size={20} color="#CBD5E1" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.methodCard} onPress={() => { setCreationMethod('LIBRARY'); setStep(1); }}>
        <View style={[styles.iconBox, { backgroundColor: '#DBEAFE' }]}>
          <Layers size={28} color="#2563EB" />
        </View>
        <View style={{flex: 1}}>
          <Text style={styles.cardTitle}>From Library</Text>
          <Text style={styles.cardDesc}>Choose from pre-made programs designed by experts.</Text>
        </View>
        <ChevronRight size={20} color="#CBD5E1" />
      </TouchableOpacity>
    </View>
  );

  const renderStep1 = () => (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.stepContainer}>
        {creationMethod === 'LIBRARY' ? (
            <ScrollView contentContainerStyle={{gap: 12}}>
               <Text style={styles.headerTitleLarge}>Select Template</Text>
               {PREMADE_PROGRAMS.map(p => (
                   <TouchableOpacity key={p.id} style={styles.libCard} onPress={() => {
                       setDraftProgram({ title: p.title, description: p.desc, sessions: [] });
                       setStep(2);
                   }}>
                       <View>
                           <Text style={styles.libTitle}>{p.title}</Text>
                           <Text style={styles.libDesc}>{p.desc}</Text>
                       </View>
                       <ChevronRight size={20} color="#CBD5E1"/>
                   </TouchableOpacity>
               ))}
            </ScrollView>
        ) : (
            <ScrollView>
                <Text style={styles.headerTitleLarge}>AI Program Generator</Text>
                <Text style={styles.subText}>What would you like to work on?</Text>

                <Text style={styles.label}>Prompt</Text>
                <TextInput 
                    style={[styles.input, styles.textArea]} 
                    placeholder="e.g. Improve forehand consistency and footwork..." 
                    placeholderTextColor="#94A3B8"
                    multiline textAlignVertical="top"
                    value={prompt} onChangeText={setPrompt}
                />

                <Text style={styles.label}>Duration (weeks)</Text>
                <TextInput 
                    style={styles.input} 
                    value={durationWeeks} 
                    onChangeText={setDurationWeeks} 
                    keyboardType="numeric"
                />
            </ScrollView>
        )}

        {creationMethod === 'AI' && (
            <TouchableOpacity 
                style={[styles.primaryBtn, (!prompt || loading) && styles.disabledBtn]} 
                onPress={handleGenerate} 
                disabled={loading}
            >
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Generate Plan</Text>}
            </TouchableOpacity>
        )}
    </KeyboardAvoidingView>
  );

  const renderStep2_Review = () => (
    <View style={styles.stepContainer}>
      <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 16}}>
         <Text style={styles.headerTitleLarge}>Review Program</Text>
         {userRole !== 'PLAYER' && <TouchableOpacity><Edit2 size={20} color={COLORS.primary}/></TouchableOpacity>}
      </View>

      <ScrollView contentContainerStyle={{paddingBottom: 100}} showsVerticalScrollIndicator={false}>
         <View style={styles.reviewCard}>
            <TextInput 
                style={styles.reviewTitle} 
                value={draftProgram.title} 
                editable={userRole !== 'PLAYER'} 
                onChangeText={t => setDraftProgram({...draftProgram, title: t})}
            />
            <TextInput 
                style={styles.reviewDesc} 
                value={draftProgram.description} 
                multiline 
                editable={userRole !== 'PLAYER'} 
                onChangeText={t => setDraftProgram({...draftProgram, description: t})}
            />
         </View>

         <Text style={styles.sectionLabel}>SESSIONS ({draftProgram.sessions.length})</Text>
         {draftProgram.sessions.map((s, i) => (
             <View key={i} style={styles.sessionItem}>
                 <View style={styles.sessionIndex}><Text style={styles.sessionIndexText}>{i+1}</Text></View>
                 <View style={{flex: 1}}>
                     <Text style={styles.sessionTitle}>{s.title || `Session ${i+1}`}</Text>
                     <Text style={styles.sessionSub}>{s.items?.length || 0} Drills</Text>
                 </View>
             </View>
         ))}
      </ScrollView>

      <View style={styles.footerBtnContainer}>
        <TouchableOpacity 
            style={[styles.primaryBtn, { backgroundColor: userRole==='PLAYER' ? '#16A34A' : COLORS.primary }]}
            disabled={loading}
            onPress={() => {
                if (userRole === 'PLAYER') {
                    // ✅ DIRECTLY Call handleFinalize for Players
                    handleFinalize(['SELF']); 
                } else {
                    // Coach goes to assignment step
                    setStep(3); 
                }
            }}
        >
            {loading ? <ActivityIndicator color="#FFF" /> : (
                <>
                    {userRole === 'PLAYER' && <PlayCircle size={20} color="#FFF" />}
                    <Text style={styles.primaryBtnText}>
                        {userRole === 'PLAYER' ? 'Start Plan Now' : 'Next: Assign Targets'}
                    </Text>
                    {userRole !== 'PLAYER' && <ChevronRight size={20} color="#FFF" />}
                </>
            )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3_Assign = () => (
    <View style={styles.stepContainer}>
       <Text style={styles.headerTitleLarge}>Assign To...</Text>
       <ScrollView contentContainerStyle={{paddingBottom: 100}}>
           
           <Text style={styles.sectionLabel}>SQUADS</Text>
           {squads.map(sq => {
               const isSelected = selectedTargets.includes(sq.id);
               return (
                   <TouchableOpacity key={sq.id} style={[styles.targetRow, isSelected && styles.targetSelected]} onPress={() => toggleTarget(sq.id)}>
                       <Users size={20} color="#4F46E5"/>
                       <View style={{flex:1, marginLeft: 12}}>
                           <Text style={styles.targetName}>{sq.name}</Text>
                           <Text style={styles.targetSub}>{sq.memberCount} Athletes</Text>
                       </View>
                       {isSelected && <Check size={20} color={COLORS.primary}/>}
                   </TouchableOpacity>
               );
           })}

           {!squadMode && (
               <>
                   <Text style={[styles.sectionLabel, {marginTop: 24}]}>INDIVIDUAL ATHLETES</Text>
                   {athletes.map(ath => {
                       const isSelected = selectedTargets.includes(ath.id);
                       return (
                           <TouchableOpacity key={ath.id} style={[styles.targetRow, isSelected && styles.targetSelected]} onPress={() => toggleTarget(ath.id)}>
                               <User size={20} color="#64748B"/>
                               <View style={{flex:1, marginLeft: 12}}>
                                   <Text style={styles.targetName}>{ath.name}</Text>
                                   <Text style={styles.targetSub}>{ath.email}</Text>
                               </View>
                               {isSelected && <Check size={20} color={COLORS.primary}/>}
                           </TouchableOpacity>
                       );
                   })}
               </>
           )}
       </ScrollView>

       <View style={styles.footerBtnContainer}>
           <TouchableOpacity 
                style={[styles.primaryBtn, selectedTargets.length === 0 && styles.disabledBtn]}
                disabled={selectedTargets.length === 0 || loading}
                onPress={() => handleFinalize(selectedTargets)}
           >
               {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Save & Assign</Text>}
           </TouchableOpacity>
       </View>
    </View>
  );

  // --- NAVIGATION ---
  const handleBack = () => {
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
    else if (step === 1 && !squadMode) setStep(0);
    else navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <ChevronLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Builder</Text>
        <View style={{width: 24}} /> 
      </View>
      <View style={styles.content}>
        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2_Review()}
        {step === 3 && renderStep3_Assign()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  backBtn: { padding: 4 },
  content: { flex: 1, padding: 24 },
  stepContainer: { flex: 1 },

  headerTitleLarge: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  subText: { fontSize: 14, color: '#64748B', marginBottom: 24 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: '#94A3B8', marginTop: 16, marginBottom: 8, letterSpacing: 0.5 },
  label: { fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 8, marginTop: 16 },

  methodCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.small },
  iconBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#64748B', lineHeight: 18 },

  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 16, fontSize: 16, color: '#0F172A' },
  textArea: { height: 120 },

  reviewCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  reviewTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  reviewDesc: { fontSize: 14, color: '#64748B', lineHeight: 20 },
  
  sessionItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  sessionIndex: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  sessionIndexText: { fontWeight: '700', color: '#0284C7' },
  sessionTitle: { fontSize: 14, fontWeight: '700', color: '#334155' },
  sessionSub: { fontSize: 12, color: '#64748B' },

  libCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  libTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  libDesc: { fontSize: 13, color: '#64748B', marginTop: 2 },
  
  targetRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  targetSelected: { borderColor: COLORS.primary, backgroundColor: '#F0FDF4' },
  targetName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  targetSub: { fontSize: 12, color: '#64748B' },

  footerBtnContainer: { marginTop: 'auto', paddingTop: 16 },
  primaryBtn: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, ...SHADOWS.medium },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  disabledBtn: { backgroundColor: '#94A3B8', opacity: 0.7 }
});