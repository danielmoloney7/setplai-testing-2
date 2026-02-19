import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TextInput, ScrollView, 
  TouchableOpacity, Alert, ActivityIndicator, Platform, KeyboardAvoidingView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native'; 
import { 
  ChevronLeft, Check, Users, User, ChevronRight, 
  Wand2, Layers, Edit2, PlayCircle, RefreshCw, Trash2, Plus, Clock, ClipboardEdit, X 
} from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';

import { fetchMyTeam, fetchDrills, createProgram, fetchSquads, fetchSessionLogs, fetchUserProfile, fetchPrograms } from '../services/api'; 
import { generateAIProgram, generateSquadProgram } from '../services/geminiService';

import EditSessionModal from '../components/EditSessionModal';
import DrillPickerModal from '../components/DrillPickerModal'; 
import DrillConfigModal from '../components/DrillConfigModal'; 

const PREMADE_PROGRAMS = [
  { id: 'p1', title: 'Beginner Foundation', desc: '4 weeks • Fundamentals' },
  { id: 'p2', title: 'Serve Power Up', desc: '2 weeks • Technique focus' },
  { id: 'p3', title: 'Cardio Tennis', desc: 'Ongoing • High Intensity' },
];

export default function ProgramBuilderScreen({ navigation, route }) {
  const { squadMode, initialPrompt, autoStart, targetIds } = route.params || {};

  const [step, setStep] = useState(autoStart ? 1 : 0); 
  const [creationMethod, setCreationMethod] = useState(autoStart ? 'AI' : null);
  
  const [userRole, setUserRole] = useState('PLAYER'); 
  const [userId, setUserId] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [athletes, setAthletes] = useState([]);
  const [availableDrills, setAvailableDrills] = useState([]);
  const [squads, setSquads] = useState([]);

  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [durationWeeks, setDurationWeeks] = useState('4');
  const [numPlayers, setNumPlayers] = useState('4');
  const [numCourts, setNumCourts] = useState('1');

  const [draftProgram, setDraftProgram] = useState({ title: '', description: '', sessions: [] });
  const [existingPrograms, setExistingPrograms] = useState([]);
  
  const [selectedTargets, setSelectedTargets] = useState(targetIds || []);

  const [editingSessionIndex, setEditingSessionIndex] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDrillPicker, setShowDrillPicker] = useState(false);
  const [activeSessionIdx, setActiveSessionIdx] = useState(null);
  const [showDrillConfig, setShowDrillConfig] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [userProfile, setUserProfile] = useState({});

  useEffect(() => {
    const init = async () => {
        const role = await AsyncStorage.getItem('user_role');
        const id = await AsyncStorage.getItem('user_id'); 
        if (role) setUserRole(role.toUpperCase());
        if (id) setUserId(id);

        try {
            const [teamData, drillsData, squadsData, profileData, programsData] = await Promise.all([
                fetchMyTeam(), 
                fetchDrills(),
                fetchSquads(),
                fetchUserProfile(),
                fetchPrograms()
            ]);
            setAthletes(teamData || []);
            setAvailableDrills(drillsData || []);
            setSquads(squadsData || []); 
            setUserProfile(profileData || {}); 
            setExistingPrograms(programsData || []); 
        } catch (e) { console.log("Data load error", e); }
    };
    init();
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) return Alert.alert("Required", "Please describe your goal.");

    setLoading(true);
    try {
        const historyLogs = await fetchSessionLogs();
        const allDrills = await fetchDrills();
        
        let aiResult;

        if (squadMode) {
            aiResult = await generateSquadProgram(
                `${prompt} (Duration: ${durationWeeks} weeks)`,
                allDrills,
                userId, 
                { players: parseInt(numPlayers) || 4, courts: parseInt(numCourts) || 1 },
                { weeks: parseInt(durationWeeks) || 4 }
            );
        } else {
            aiResult = await generateAIProgram(
                `${prompt} (Duration: ${durationWeeks} weeks)`,
                allDrills,
                { id: userId, role: userRole, level: userProfile?.level || "Intermediate", goals: userProfile?.goals || [] },
                historyLogs,
                { weeks: parseInt(durationWeeks) || 4 }
            );
        }

        if (aiResult) {
            setDraftProgram({ 
                title: aiResult.title, 
                description: aiResult.description, 
                sessions: aiResult.sessions || [] 
            });
            setStep(2); 
        } else {
            Alert.alert("AI Error", "Could not generate program. Try again.");
        }
    } catch (e) {
        console.error(e);
        Alert.alert("Error", "Failed to generate.");
    } finally {
        setLoading(false);
    }
  };

  const handleManualStart = () => {
    setCreationMethod('MANUAL');
    setDraftProgram({
        title: squadMode ? 'New Squad Session' : 'New Program',
        description: '',
        sessions: [
            { id: `s_${Date.now()}`, title: 'Session 1', items: [], completed: false }
        ]
    });
    setStep(2);
  };

  const handleRemoveDrill = (sIdx, dIdx) => {
    const updatedSessions = [...draftProgram.sessions];
    updatedSessions[sIdx].items.splice(dIdx, 1);
    setDraftProgram(prev => ({ ...prev, sessions: updatedSessions }));
  };

  const openAddDrill = (sIdx) => {
    setActiveSessionIdx(sIdx);
    setShowDrillPicker(true);
  };

  const handleSelectDrill = (drill) => {
    if (activeSessionIdx === null) return;
    const newItem = {
        drill_id: drill.id,
        drill_name: drill.name,
        duration_minutes: drill.default_duration_min || 10,
        notes: '',
        mode: 'Cooperative'
    };
    
    const updatedSessions = [...draftProgram.sessions];
    updatedSessions[activeSessionIdx].items.push(newItem);
    setDraftProgram(prev => ({ ...prev, sessions: updatedSessions }));
    
    setShowDrillPicker(false);
    setActiveSessionIdx(null);
  };

  const openDrillConfig = (sIdx, dIdx, item) => {
    setEditingItem({ sIdx, dIdx, item });
    setShowDrillConfig(true);
  };

  const handleSaveConfig = (updatedItem) => {
    if (!editingItem) return;
    const { sIdx, dIdx } = editingItem;
    
    const updatedSessions = [...draftProgram.sessions];
    updatedSessions[sIdx].items[dIdx] = updatedItem;
    setDraftProgram(prev => ({ ...prev, sessions: updatedSessions }));
    
    setShowDrillConfig(false);
    setEditingItem(null);
  };

  const handleSessionUpdate = (updatedSession) => {
    if (editingSessionIndex === null) return;
    const updatedSessions = [...draftProgram.sessions];
    updatedSessions[editingSessionIndex] = updatedSession;
    setDraftProgram(prev => ({ ...prev, sessions: updatedSessions }));
    setShowEditModal(false);
    setEditingSessionIndex(null);
  };

  const confirmAndFinalize = async (targets) => {
    const isSquadSession = squadMode === true;
    const currentProgramType = isSquadSession ? 'SQUAD_SESSION' : 'PLAYER_PLAN';

    // Verify target array is correctly utilized
    let finalTargets = targets;
    if (targets.length === 0 && targetIds && targetIds.length > 0) {
        finalTargets = targetIds;
    }

    // Identify if any of the targets is a Squad ID
    const selectedSquadId = finalTargets.find(tId => squads.some(sq => sq.id === tId));

    if (selectedSquadId) {
        // Look through existing programs for conflicts
        const squadHasActiveProgram = existingPrograms.some(p => 
            p.squad_id === selectedSquadId && 
            p.program_type === currentProgramType && 
            (p.status === 'ACTIVE' || p.status === 'PENDING')
        );

        if (squadHasActiveProgram) {
            const typeName = currentProgramType === "SQUAD_SESSION" ? "Squad Session" : "Player Plan";
            Alert.alert(
                `Replace Active ${typeName}?`,
                `This squad currently has an active ${typeName}. Assigning this new one will automatically complete their current one. Do you want to continue?`,
                [
                    { text: "Cancel", style: "cancel" },
                    { 
                        text: "Yes, Replace It", 
                        style: "destructive", 
                        onPress: () => handleFinalize(finalTargets, selectedSquadId) 
                    }
                ]
            );
            return; 
        }
    }

    handleFinalize(finalTargets, selectedSquadId);
  };

  const handleFinalize = async (targets, selectedSquadId = null) => {
    setLoading(true);
    try {
        const isSquadSession = squadMode === true;
        
        const payload = {
            title: draftProgram.title,
            description: draftProgram.description || "",
            status: userRole === 'PLAYER' ? 'ACTIVE' : 'PENDING', 
            assigned_to: userRole === 'PLAYER' ? ['SELF'] : targets,
            program_type: isSquadSession ? 'SQUAD_SESSION' : 'PLAYER_PLAN',
            
            // ✅ Cleaned up squad mapping logic
            squad_id: selectedSquadId || null,

            sessions: draftProgram.sessions.map((s, i) => ({
                day: i + 1,
                drills: (s.items || []).map(item => {
                    // Standardize Drill extraction
                    const safeDrillId = item.drill_id || item.drillId || item.id;
                    const realDrill = availableDrills.find(d => d.id === safeDrillId);
                    const prettyName = realDrill ? realDrill.name : (item.drill_name || item.name || "Custom Drill");

                    return {
                        drill_id: safeDrillId || `custom_${Date.now()}`, 
                        drill_name: prettyName, 
                        duration: parseInt(item.duration_minutes || item.duration || item.targetDurationMin || 15, 10),
                        notes: item.notes || "",
                        target_value: item.target_value || realDrill?.target_value || null,
                        target_prompt: item.target_prompt || realDrill?.target_prompt || null
                    };
                })
            }))
        };

        console.log("Creating Program Payload:", JSON.stringify(payload, null, 2));

        await createProgram(payload);
        setLoading(false);
        
        if (isSquadSession && selectedSquadId) {
            navigation.dispatch(
                CommonActions.reset({
                    index: 1,
                    routes: [
                        { name: 'Main', state: { routes: [{ name: 'Team' }] } }, // The underlying screen
                        { name: 'SquadDetail', params: { squad: { id: selectedSquadId } } } // The active screen
                    ],
                })
            );
        } else {
            const targetTab = userRole === 'PLAYER' ? 'Plans' : 'Programs';
            navigation.dispatch(
                CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'Main', state: { routes: [{ name: targetTab }] } }],
                })
            );
        }
        
    } catch (e) {
        console.error("Save Error:", e);
        setLoading(false);
        Alert.alert("Error", "Could not save program.");
    }
  };

  const toggleTarget = (id) => {
    if (squadMode) {
        // ✅ Enforce Single Selection for Squad Mode
        setSelectedTargets([id]);
    } else {
        // Multi selection for standard mode
        if (selectedTargets.includes(id)) {
            setSelectedTargets(prev => prev.filter(t => t !== id));
        } else {
            setSelectedTargets(prev => [...prev, id]);
        }
    }
  };

  const renderStep0 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.headerTitleLarge}>
         {squadMode ? "New Squad Session" : "Create New Plan"}
      </Text>
      <Text style={styles.subText}>Choose how you want to build this.</Text>
      
      <TouchableOpacity style={styles.methodCard} onPress={() => { setCreationMethod('AI'); setStep(1); }}>
        <View style={[styles.iconBox, { backgroundColor: '#F3E8FF' }]}><Wand2 size={28} color="#9333EA" /></View>
        <View style={{flex: 1}}><Text style={styles.cardTitle}>AI Generator</Text><Text style={styles.cardDesc}>Auto-build a plan.</Text></View>
        <ChevronRight size={20} color="#CBD5E1" />
      </TouchableOpacity>
      
      {userRole !== 'PLAYER' && (
        <TouchableOpacity style={styles.methodCard} onPress={handleManualStart}>
            <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}><ClipboardEdit size={28} color="#16A34A" /></View>
            <View style={{flex: 1}}><Text style={styles.cardTitle}>Create Manually</Text><Text style={styles.cardDesc}>Build from scratch.</Text></View>
            <ChevronRight size={20} color="#CBD5E1" />
        </TouchableOpacity>
      )}  
    
      <TouchableOpacity style={styles.methodCard} onPress={() => { setCreationMethod('LIBRARY'); setStep(1); }}>
        <View style={[styles.iconBox, { backgroundColor: '#DBEAFE' }]}><Layers size={28} color="#2563EB" /></View>
        <View style={{flex: 1}}><Text style={styles.cardTitle}>Templates</Text><Text style={styles.cardDesc}>Choose pre-made plans.</Text></View>
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
                <Text style={styles.headerTitleLarge}>{squadMode ? "Squad Planner" : "AI Generator"}</Text>
                <Text style={styles.label}>Prompt</Text>
                <TextInput style={[styles.input, styles.textArea]} multiline textAlignVertical="top" value={prompt} onChangeText={setPrompt} placeholder="Describe the goal..." />
                {squadMode && (
                    <View style={{flexDirection: 'row', gap: 12}}>
                        <View style={{flex: 1}}><Text style={styles.label}>Players</Text><TextInput style={styles.input} value={numPlayers} onChangeText={setNumPlayers} keyboardType="numeric"/></View>
                        <View style={{flex: 1}}><Text style={styles.label}>Courts</Text><TextInput style={styles.input} value={numCourts} onChangeText={setNumCourts} keyboardType="numeric"/></View>
                    </View>
                )}
                <Text style={styles.label}>Duration (weeks)</Text>
                <TextInput style={styles.input} value={durationWeeks} onChangeText={setDurationWeeks} keyboardType="numeric"/>
            </ScrollView>
        )}

        {creationMethod === 'AI' && (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleGenerate} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Generate Plan</Text>}
            </TouchableOpacity>
        )}
    </KeyboardAvoidingView>
  );

  const renderStep2_Review = () => (
    <View style={styles.stepContainer}>
      <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 16}}>
         <Text style={styles.headerTitleLarge}>Review {squadMode ? "Squad Session" : "Program"}</Text>
         {userRole !== 'PLAYER' && creationMethod === 'AI' && (
            <TouchableOpacity onPress={() => setStep(1)} style={{ padding: 8 }}>
                <RefreshCw size={20} color={COLORS.primary}/>
            </TouchableOpacity>
         )}
      </View>

      <ScrollView contentContainerStyle={{paddingBottom: 100}} showsVerticalScrollIndicator={false}>
         <View style={styles.reviewCard}>
            <TextInput style={styles.reviewTitle} value={draftProgram.title} editable={userRole !== 'PLAYER'} onChangeText={t => setDraftProgram({...draftProgram, title: t})}/>
            <TextInput style={styles.reviewDesc} value={draftProgram.description} multiline editable={userRole !== 'PLAYER'} onChangeText={t => setDraftProgram({...draftProgram, description: t})}/>
         </View>

         <Text style={styles.sectionLabel}>SESSIONS ({draftProgram.sessions.length})</Text>
         {draftProgram.sessions.map((s, sIdx) => (
             <View key={sIdx} style={styles.sessionContainer}>
                 <View style={styles.sessionHeader}>
                     <View style={{flex: 1}}>
                        <Text style={styles.sessionTitle}>{s.title || `Session ${sIdx+1}`}</Text>
                        <Text style={styles.sessionSub}>{s.items?.length || 0} Drills</Text>
                     </View>
                     {userRole !== 'PLAYER' && creationMethod !== 'MANUAL' && (
                        <TouchableOpacity style={styles.iconBtn} onPress={() => { setEditingSessionIndex(sIdx); setShowEditModal(true); }}>
                            <Wand2 size={16} color={COLORS.primary} />
                        </TouchableOpacity>
                     )}
                 </View>
                 <View style={styles.drillList}>
                    {s.items?.map((item, dIdx) => {
                        // ✅ Standardized Drill Parsing
                        const safeDrillId = item.drill_id || item.drillId || item.id;
                        const drillInfo = availableDrills.find(d => d.id === safeDrillId);
                        const displayName = drillInfo ? drillInfo.name : (item.drill_name || item.name || "Custom Drill");
                        const displayDuration = item.duration_minutes || item.duration || item.targetDurationMin || 15;

                        return (
                            <View key={dIdx} style={styles.drillRow}>
                                <View style={{flex: 1}}>
                                    <Text style={styles.drillName}>{displayName}</Text>
                                    <View style={{flexDirection:'row', alignItems:'center', marginTop: 4}}>
                                        <Clock size={12} color="#64748B" />
                                        <Text style={styles.drillMeta}> {displayDuration}m</Text>
                                    </View>
                                </View>
                                {userRole !== 'PLAYER' && (
                                    <View style={{flexDirection: 'row', gap: 8}}>
                                        <TouchableOpacity style={styles.editIconBtn} onPress={() => openDrillConfig(sIdx, dIdx, { ...item, drill_name: displayName })}>
                                            <Edit2 size={16} color={COLORS.secondary} />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.deleteIconBtn} onPress={() => handleRemoveDrill(sIdx, dIdx)}>
                                            <Trash2 size={16} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        );
                    })}
                    {userRole !== 'PLAYER' && (
                        <TouchableOpacity style={styles.addDrillBtn} onPress={() => openAddDrill(sIdx)}>
                            <Plus size={16} color={COLORS.primary} />
                            <Text style={styles.addDrillText}>Add Drill</Text>
                        </TouchableOpacity>
                    )}
                 </View>
             </View>
         ))}
      </ScrollView>

      {/* MODALS */}
      {showEditModal && editingSessionIndex !== null && (
          <EditSessionModal visible={showEditModal} onClose={() => setShowEditModal(false)} session={draftProgram.sessions[editingSessionIndex]} onSave={handleSessionUpdate}/>
      )}
      <DrillPickerModal isOpen={showDrillPicker} onClose={() => setShowDrillPicker(false)} drills={availableDrills} onSelectDrill={handleSelectDrill}/>
      <DrillConfigModal isOpen={showDrillConfig} onClose={() => setShowDrillConfig(false)} item={editingItem?.item} onSave={handleSaveConfig}/>

      <View style={styles.footerBtnContainer}>
        <TouchableOpacity style={styles.primaryBtn} disabled={loading} onPress={() => { 
            // ✅ FORCES Step 3 so Coach explicitly assigns it.
            if (userRole === 'PLAYER') {
                handleFinalize(['SELF']);
            } else {
                setStep(3); 
            }
        }}>
            {loading ? (
                <ActivityIndicator color="#FFF" /> 
            ) : (
                <Text style={styles.primaryBtnText}>
                    {userRole === 'PLAYER' ? 'Accept Program': 'Next: Assign Targets'}
                </Text>
            )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3_Assign = () => (
    <View style={styles.stepContainer}>
       <Text style={styles.headerTitleLarge}>Assign To...</Text>
       <ScrollView contentContainerStyle={{paddingBottom: 100}}>
           {squads.map(sq => (
               <TouchableOpacity key={sq.id} style={[styles.targetRow, selectedTargets.includes(sq.id) && styles.targetSelected]} onPress={() => toggleTarget(sq.id)}>
                   <Users size={20} color="#4F46E5"/><Text style={styles.targetName}>{sq.name}</Text>
                   {selectedTargets.includes(sq.id) && <Check size={20} color={COLORS.primary}/>}
               </TouchableOpacity>
           ))}
           {!squadMode && athletes.map(ath => (
               <TouchableOpacity key={ath.id} style={[styles.targetRow, selectedTargets.includes(ath.id) && styles.targetSelected]} onPress={() => toggleTarget(ath.id)}>
                   <User size={20} color="#64748B"/><Text style={styles.targetName}>{ath.name}</Text>
                   {selectedTargets.includes(ath.id) && <Check size={20} color={COLORS.primary}/>}
               </TouchableOpacity>
           ))}
       </ScrollView>
       <View style={styles.footerBtnContainer}>
           <TouchableOpacity 
              style={[styles.primaryBtn, selectedTargets.length === 0 && styles.disabledBtn]} 
              disabled={selectedTargets.length === 0 || loading} 
              onPress={() => confirmAndFinalize(selectedTargets)} 
            >
               {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Save & Assign</Text>}
           </TouchableOpacity>
       </View>
    </View>
  );

  const handleBack = () => {
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
    else if (step === 1 && !squadMode && !autoStart) setStep(0);
    else navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}><ChevronLeft size={24} color="#0F172A" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Builder</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><X size={24} color="#64748B" /></TouchableOpacity> 
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
  sessionContainer: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  sessionTitle: { fontSize: 16, fontWeight: '700', color: '#334155' },
  sessionSub: { fontSize: 12, color: '#64748B' },
  iconBtn: { padding: 8, backgroundColor: '#E0F2FE', borderRadius: 8 },
  drillList: { padding: 16, gap: 12 },
  drillRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  drillName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  drillMeta: { fontSize: 12, color: '#64748B' },
  editIconBtn: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 8 },
  deleteIconBtn: { padding: 8, backgroundColor: '#FEF2F2', borderRadius: 8 },
  addDrillBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.primary, borderStyle: 'dashed' },
  addDrillText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  targetRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  targetSelected: { borderColor: COLORS.primary, backgroundColor: '#F0FDF4' },
  targetName: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginLeft: 12, flex: 1 },
  footerBtnContainer: { marginTop: 'auto', paddingTop: 16 },
  primaryBtn: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, ...SHADOWS.medium },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  disabledBtn: { backgroundColor: '#94A3B8', opacity: 0.7 },
  libCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  libTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  libDesc: { fontSize: 13, color: '#64748B', marginTop: 2 },
});