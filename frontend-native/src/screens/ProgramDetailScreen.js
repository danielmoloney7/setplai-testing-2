import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar, Users, Clock, CheckCircle, ChevronLeft, XCircle, AlertCircle, Check, Trash2, User, Edit2, RotateCcw, Lock } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { fetchSessionLogs, updateProgramStatus, deleteProgram, updateProgramAssignees, createProgram, fetchMyAthletes, fetchSquads } from '../services/api';

export default function ProgramDetailScreen({ navigation, route }) {
  const { program } = route.params || {};
  const [role, setRole] = useState('PLAYER');
  const [completedDays, setCompletedDays] = useState([]);
  const [currentStatus, setCurrentStatus] = useState(program?.status);
  const [loading, setLoading] = useState(false);

  // ✅ New Assignee Modal States
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [myAthletes, setMyAthletes] = useState([]);
  const [mySquads, setMySquads] = useState([]);
  const [selectedTargets, setSelectedTargets] = useState([]);
  const [isReassigning, setIsReassigning] = useState(false);
  const [savingAssignees, setSavingAssignees] = useState(false);

  // Check if program is fully done or archived
  const isCompletedOrArchived = currentStatus === 'COMPLETED' || currentStatus === 'ARCHIVED' || program?.displayStatus === 'COMPLETED' || program?.displayStatus === 'ARCHIVED';

  // ✅ PACING LOGIC SETUP
  const pacing = program?.sessions_per_week || 0;
  const programStartDate = new Date(program?.created_at || Date.now());
  const now = new Date();
  // Calculate how many weeks have passed since creation
  const daysElapsed = Math.floor((now - programStartDate) / (1000 * 60 * 60 * 24));
  const currentWeek = Math.floor(daysElapsed / 7) + 1; 

  useFocusEffect(
    useCallback(() => {
        const init = async () => {
            const storedRole = await AsyncStorage.getItem('user_role');
            const userRole = storedRole ? storedRole.toUpperCase() : 'PLAYER';
            setRole(userRole);
            
            if (program?.status) setCurrentStatus(program.status);

            if (userRole === 'COACH') {
                const [athletes, squads] = await Promise.all([fetchMyAthletes(), fetchSquads()]);
                setMyAthletes(athletes || []);
                setMySquads(squads || []);
            }

            if (program?.id) {
                try {
                    const logs = await fetchSessionLogs();
                    const done = logs
                        .filter(l => l.program_id === program.id)
                        .map(l => l.session_id);
                    setCompletedDays(done);
                } catch (e) {
                    console.log("Error fetching program logs", e);
                }
            }
        };
        init();
    }, [program])
  );

  if (!program) return null;

  const openManageAthletes = () => {
      setIsReassigning(false);
      setSelectedTargets(program.assigned_to?.map(a => a.id) || []);
      setShowAssignModal(true);
  };

  const openRedoReassign = () => {
      setIsReassigning(true);
      setSelectedTargets(program.assigned_to?.map(a => a.id) || []); 
      setShowAssignModal(true);
  };

  const toggleTarget = (id) => {
      if (selectedTargets.includes(id)) {
          setSelectedTargets(selectedTargets.filter(t => t !== id));
      } else {
          setSelectedTargets([...selectedTargets, id]);
      }
  };

  const handleSaveAssignees = async () => {
      setSavingAssignees(true);
      try {
          if (isReassigning) {
              const grouped = {};
              (program.schedule || []).forEach(s => {
                  if (!grouped[s.day_order]) grouped[s.day_order] = [];
                  grouped[s.day_order].push({
                      drill_id: s.drill_id,
                      drill_name: s.drill_name,
                      duration: s.duration_minutes,
                      notes: s.notes,
                      target_value: s.target_value,
                      target_prompt: s.target_prompt
                  });
              });
              const sessionsPayload = Object.keys(grouped).map(day => ({
                  day: parseInt(day),
                  drills: grouped[day]
              }));

              const programData = {
                  title: program.title, 
                  description: program.description,
                  status: "ACTIVE",
                  assigned_to: selectedTargets,
                  program_type: program.program_type || "PLAYER_PLAN",
                  squad_id: program.squad_id,
                  sessions_per_week: program.sessions_per_week, // Preserve pacing
                  sessions: sessionsPayload
              };

              await createProgram(programData);
              Alert.alert("Success", "Program duplicated and reassigned to Active successfully!");
              setShowAssignModal(false);
              navigation.navigate('Main', { screen: 'Programs' }); 
          } else {
              await updateProgramAssignees(program.id, selectedTargets);
              Alert.alert("Success", "Assignees updated successfully!");
              setShowAssignModal(false);
              navigation.goBack(); 
          }
      } catch (e) {
          console.error("Save assignees error", e);
          Alert.alert("Error", "Could not save assignees. Please try again.");
      } finally {
          setSavingAssignees(false);
      }
  };

  const handleStatusChange = async (newStatus) => {
    try {
        await updateProgramStatus(program.id, newStatus);
        setCurrentStatus(newStatus);
        const msg = newStatus === 'ACTIVE' ? "Program Accepted!" : "Program Declined.";
        Platform.OS === 'web' ? alert(msg) : Alert.alert("Success", msg);
        if (newStatus === 'DECLINED') navigation.goBack();
    } catch (e) {
        Alert.alert("Error", "Could not update status.");
    }
  };

  const handleReturn = () => {
      if (navigation.canGoBack()) {
          navigation.goBack();
      } else {
          navigation.navigate('Main', { screen: role === 'COACH' ? 'Programs' : 'Plans' });
      }
  };

  const performDelete = async () => {
      setLoading(true);
      try {
          await deleteProgram(program.id);
          navigation.navigate('Main', { screen: role === 'COACH' ? 'Programs' : 'Plans' });
      } catch (e) {
          console.error(e);
          setLoading(false);
          const msg = "Error: Could not delete program.";
          Platform.OS === 'web' ? alert(msg) : Alert.alert("Error", msg);
      }
  };

  const handleDelete = () => {
    const message = role === 'COACH' 
        ? "Warning: Deleting this program will remove it from ALL players assigned to it. Are you sure?" 
        : "Are you sure you want to remove this program from your plans?";
    
    if (Platform.OS === 'web') {
        if (window.confirm(message)) performDelete();
    } else {
        Alert.alert(role === 'COACH' ? "Delete Program" : "Remove Program", message, [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: performDelete }
        ]);
    }
  };

  const groupedSessions = program.schedule?.reduce((acc, item) => {
      const day = item.day_order;
      if (!acc[day]) acc[day] = { day_order: day, title: `Session ${day}`, items: [], totalMinutes: 0 };
      acc[day].items.push(item);
      acc[day].totalMinutes += (parseInt(item.duration_minutes || item.targetDurationMin || item.duration) || 0);
      return acc;
  }, {});
  const sessionList = Object.values(groupedSessions || {});

  const Container = Platform.OS === 'web' ? View : SafeAreaView;
  const containerProps = Platform.OS === 'web' ? { style: styles.container } : { style: styles.container, edges: ['top', 'bottom'] };

  return (
    <Container {...containerProps}>
      <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleReturn} style={styles.backBtn}>
              <ChevronLeft size={24} color="#334155" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Program Details</Text>
          <TouchableOpacity onPress={handleDelete} style={styles.backBtn} disabled={loading}>
              {loading ? <ActivityIndicator size="small" color="#EF4444" /> : <Trash2 size={24} color="#EF4444" />}
          </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Info Card */}
        <View style={styles.headerCard}>
            <Text style={styles.title}>{program.title}</Text>
            <Text style={styles.desc}>{program.description}</Text>
            <View style={styles.metaRow}>
                <View style={styles.metaItem}><Calendar size={16} color="#64748B" /><Text style={styles.metaText}>{sessionList.length} Sessions</Text></View>
                <View style={styles.metaItem}><Users size={16} color="#64748B" /><Text style={styles.metaText}>{program.assigned_to ? `${program.assigned_to.length} Assigned` : 'Unassigned'}</Text></View>
            </View>
        </View>

        {/* COACH ONLY: Assignment Details with Smart Buttons */}
        {role === 'COACH' && (
            <View style={styles.assignmentCard}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
                    <Text style={styles.sectionTitle}>Assignments</Text>
                    {isCompletedOrArchived ? (
                        <TouchableOpacity style={styles.manageBtn} onPress={openRedoReassign}>
                            <RotateCcw size={14} color={COLORS.primary} />
                            <Text style={styles.manageBtnText}>Redo & Reassign</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.manageBtn} onPress={openManageAthletes}>
                            <Edit2 size={14} color={COLORS.primary} />
                            <Text style={styles.manageBtnText}>Manage</Text>
                        </TouchableOpacity>
                    )}
                </View>
                
                {program.squad_id ? (
                    <View style={[styles.typeBadge, { backgroundColor: '#E0E7FF', borderColor: '#C7D2FE' }]}>
                        <Users size={16} color="#4F46E5" />
                        <Text style={[styles.typeText, { color: '#4338CA' }]}>Assigned to Squad</Text>
                    </View>
                ) : (
                    <View style={[styles.typeBadge, { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' }]}>
                        <User size={16} color="#15803D" />
                        <Text style={[styles.typeText, { color: '#166534' }]}>Individual Assignment</Text>
                    </View>
                )}

                <View style={styles.athleteList}>
                    {program.assigned_to && program.assigned_to.length > 0 ? (
                        program.assigned_to.map((player, index) => (
                            <View key={index} style={styles.athleteRow}>
                                <Text style={styles.athleteName}>{player.name}</Text>
                                <View style={[styles.statusTag, player.status === 'ACTIVE' ? styles.statusActive : styles.statusPending]}>
                                    <Text style={[styles.statusText, player.status === 'ACTIVE' ? styles.textActive : styles.textPending]}>{player.status}</Text>
                                </View>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.noAssignText}>No athletes assigned yet.</Text>
                    )}
                </View>
            </View>
        )}

        {role === 'PLAYER' && currentStatus === 'PENDING' && (
            <View style={styles.pendingBanner}>
                <AlertCircle size={20} color="#C2410C" />
                <Text style={styles.pendingBannerText}>This program is waiting for your acceptance.</Text>
            </View>
        )}

        {/* PACING WARNING */}
        {role === 'PLAYER' && pacing > 0 && (
            <Text style={{fontSize: 13, color: '#64748B', marginBottom: 12, fontStyle: 'italic', paddingHorizontal: 4}}>
                Coach has restricted you to {pacing} session{pacing > 1 ? 's' : ''} per week. You are currently in Week {currentWeek}.
            </Text>
        )}
        <Text style={[styles.sectionTitle, {marginBottom: 12}]}>Session Schedule</Text>
        
        {sessionList.map((session, index) => {
            const isCompleted = completedDays.includes(session.day_order);
            
            // ✅ THE LOGIC: Does this day require a future week?
            const requiredWeek = pacing > 0 ? Math.ceil(session.day_order / pacing) : 1;
            const isTimeLocked = pacing > 0 && currentWeek < requiredWeek && !isCompleted;

            return (
                <TouchableOpacity 
                    key={index} 
                    style={[
                        styles.sessionCard, 
                        isCompleted && styles.completedCard,
                        isTimeLocked && { opacity: 0.5, backgroundColor: '#F8FAFC' } // Grey out locked sessions
                    ]}
                    // Disabled if pending, OR if locked by pacing
                    disabled={(role === 'PLAYER' && currentStatus === 'PENDING') || isTimeLocked}
                    onPress={() => {
                        const targetScreen = isCompleted ? 'SessionSummary' : 'Session';
                        navigation.navigate(targetScreen, { session: session, programId: program.id });
                    }}
                >
                    <View style={styles.sessionHeader}>
                        <View style={[styles.dayBadge, isCompleted && styles.completedBadge, isTimeLocked && {backgroundColor: '#E2E8F0'}]}>
                            {isCompleted ? <CheckCircle size={14} color="#16A34A" /> : <Text style={[styles.dayText, isTimeLocked && {color: '#64748B'}]}>Day {session.day_order}</Text>}
                        </View>
                        <View>
                            <Text style={styles.sessionName}>{session.title}</Text>
                            <Text style={styles.drillCount}>{session.items.length} Drills</Text>
                        </View>
                    </View>
                    
                    {/* ✅ DYNAMIC RIGHT TAG */}
                    {isCompleted ? (
                        <View style={styles.doneTag}><Text style={styles.doneTagText}>Done</Text></View>
                    ) : isTimeLocked ? (
                        <View style={{flexDirection:'row', alignItems:'center', gap: 4}}>
                            <Lock size={12} color="#94A3B8" />
                            <Text style={{color: '#94A3B8', fontSize: 11, fontWeight: '700'}}>Week {requiredWeek}</Text>
                        </View>
                    ) : (
                        <View style={styles.drillTag}><Clock size={12} color={COLORS.primary} /><Text style={styles.drillTagText}>{session.totalMinutes} min</Text></View>
                    )}
                </TouchableOpacity>
            );
        })}
      </ScrollView>

      <View style={styles.footer}>
        {role === 'PLAYER' && currentStatus === 'PENDING' ? (
             <View style={styles.pendingActions}>
                 <TouchableOpacity style={styles.declineBtn} onPress={() => handleStatusChange('DECLINED')}>
                     <XCircle size={20} color="#DC2626" />
                     <Text style={styles.declineText}>Decline</Text>
                 </TouchableOpacity>
                 <TouchableOpacity style={styles.acceptBtn} onPress={() => handleStatusChange('ACTIVE')}>
                     <CheckCircle size={20} color="#16A34A" />
                     <Text style={styles.acceptText}>Accept Program</Text>
                 </TouchableOpacity>
             </View>
        ) : (
             <TouchableOpacity style={styles.doneBtn} onPress={handleReturn}>
                 <CheckCircle size={20} color="#FFF" />
                 <Text style={styles.doneBtnText}>
                     {role === 'COACH' ? 'Return to Team Programs' : 'Return to My Plans'}
                 </Text>
             </TouchableOpacity>
        )}
      </View>

      {/* Add/Remove/Redo Modal */}
      <Modal visible={showAssignModal} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>{isReassigning ? "Redo & Reassign Program" : "Manage Athletes"}</Text>
                  
                  <ScrollView style={{maxHeight: 350, width: '100%'}} showsVerticalScrollIndicator={false}>
                      <Text style={styles.modalSectionTitle}>Squads</Text>
                      {mySquads.map(sq => (
                          <TouchableOpacity key={sq.id} style={styles.targetRow} onPress={() => toggleTarget(sq.id)} activeOpacity={0.7}>
                              <View style={[styles.checkbox, selectedTargets.includes(sq.id) && styles.checkboxActive]}>
                                  {selectedTargets.includes(sq.id) && <Check size={14} color="#FFF"/>}
                              </View>
                              <Text style={styles.targetName}>{sq.name}</Text>
                          </TouchableOpacity>
                      ))}
                      
                      <Text style={[styles.modalSectionTitle, {marginTop: 16}]}>Athletes</Text>
                      {myAthletes.map(ath => (
                          <TouchableOpacity key={ath.id} style={styles.targetRow} onPress={() => toggleTarget(ath.id)} activeOpacity={0.7}>
                              <View style={[styles.checkbox, selectedTargets.includes(ath.id) && styles.checkboxActive]}>
                                  {selectedTargets.includes(ath.id) && <Check size={14} color="#FFF"/>}
                              </View>
                              <Text style={styles.targetName}>{ath.name}</Text>
                          </TouchableOpacity>
                      ))}
                  </ScrollView>
                  
                  <View style={styles.modalActions}>
                      <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAssignModal(false)}>
                          <Text style={styles.modalCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveAssignees} disabled={savingAssignees}>
                          {savingAssignees ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalSaveText}>{isReassigning ? "Duplicate" : "Save"}</Text>}
                      </TouchableOpacity>
                  </View>
              </View>
          </View>
      </Modal>

    </Container>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  backBtn: { padding: 8, borderRadius: 8 },
  content: { padding: 24 },
  
  headerCard: { backgroundColor: '#FFF', padding: 24, borderRadius: 16, marginBottom: 24, ...SHADOWS.medium },
  title: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  desc: { fontSize: 14, color: '#64748B', lineHeight: 22, marginBottom: 16 },
  metaRow: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: '#64748B', fontWeight: '600' },

  assignmentCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: '#E2E8F0' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  manageBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  manageBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 16 },
  typeText: { fontWeight: '700', fontSize: 14 },
  athleteList: { gap: 12 },
  athleteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  athleteName: { fontSize: 14, fontWeight: '600', color: '#334155' },
  statusTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusActive: { backgroundColor: '#DCFCE7' },
  statusPending: { backgroundColor: '#FFEDD5' },
  statusText: { fontSize: 10, fontWeight: '700' },
  textActive: { color: '#15803D' },
  textPending: { color: '#C2410C' },
  noAssignText: { color: '#94A3B8', fontStyle: 'italic', fontSize: 13 },

  pendingBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFF7ED', padding: 16, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#FED7AA' },
  pendingBannerText: { fontSize: 13, fontWeight: '700', color: '#C2410C', flex: 1 },
  
  sessionCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  completedCard: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dayBadge: { backgroundColor: '#E0F2FE', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, minWidth: 60, alignItems: 'center' },
  completedBadge: { backgroundColor: '#DCFCE7' },
  dayText: { fontSize: 12, fontWeight: '700', color: '#0284C7' },
  sessionName: { fontSize: 16, fontWeight: '700', color: '#334155' },
  drillCount: { fontSize: 12, color: '#64748B' },
  drillTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  drillTagText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  doneTag: { backgroundColor: '#16A34A', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  doneTagText: { fontSize: 11, fontWeight: '700', color: '#FFF' },

  footer: { padding: 24, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  doneBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  doneBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },

  pendingActions: { flexDirection: 'row', gap: 16 },
  acceptBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#DCFCE7', padding: 16, borderRadius: 12 },
  acceptText: { color: '#16A34A', fontWeight: '800', fontSize: 16 },
  declineBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FEE2E2', padding: 16, borderRadius: 12 },
  declineText: { color: '#DC2626', fontWeight: '800', fontSize: 16 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 8, textAlign: 'center' },
  modalSectionTitle: { fontSize: 13, fontWeight: '800', color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase' },
  targetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#CBD5E1', marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  targetName: { fontSize: 15, fontWeight: '600', color: '#334155' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  modalCancelBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center' },
  modalCancelText: { fontSize: 15, fontWeight: '700', color: '#64748B' },
  modalSaveBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' },
  modalSaveText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});