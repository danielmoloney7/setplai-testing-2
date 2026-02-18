import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  RefreshControl, Alert, Modal, TextInput, ActivityIndicator, Platform 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, Check, Zap, Target, Trophy, User as UserIcon, X, BarChart, UserPlus, Copy, Clock, Trash2 } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { updateProfile, fetchUserProfile, requestCoach, fetchCoachRequests, respondToCoachRequest, disconnectCoach } from '../services/api';

const COMMON_GOALS = ['Improve Serve', 'Consistency', 'Strategy', 'Fitness', 'Mental Game', 'Power', 'Footwork'];
const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState({ 
    name: 'Loading...', 
    role: 'PLAYER', 
    level: 'Intermediate', 
    goals: [], 
    xp: 0,
    coach_code: null,
    coach_link_status: 'NONE'
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Coach Linking State
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [coachCodeInput, setCoachCodeInput] = useState('');
  const [linking, setLinking] = useState(false);
  
  // Coach Side: Requests
  const [requests, setRequests] = useState([]);

  // Load User Data
  const loadUser = async () => {
    setLoading(true);
    try {
        const data = await fetchUserProfile();
        if (data) {
            const normalizedUser = {
                ...data,
                role: (data.role || 'PLAYER').toUpperCase(),
                goals: Array.isArray(data.goals) ? data.goals : (data.goals ? data.goals.split(',') : [])
            };
            setUser(normalizedUser);

            // If Coach, fetch pending requests
            if (normalizedUser.role === 'COACH') {
                try {
                    const reqs = await fetchCoachRequests();
                    setRequests(reqs || []);
                } catch (e) {
                    console.log("Error fetching requests", e);
                }
            }
        }
    } catch (e) {
        console.log("Profile Load Error:", e);
    } finally {
        setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadUser(); }, []));

  // Handle Updates
  const handleUpdate = async (updates) => {
    setUser(prev => ({ ...prev, ...updates }));
    const payload = {
        goals: updates.goals || user.goals,
        level: updates.level || user.level
    };
    try {
        await updateProfile(payload);
    } catch(e) {
        Alert.alert("Error", "Could not save profile changes.");
        loadUser();
    }
  };

  const toggleGoal = (goal) => {
    const currentGoals = user.goals || [];
    if (currentGoals.includes(goal)) {
      handleUpdate({ goals: currentGoals.filter(g => g !== goal) });
    } else {
      handleUpdate({ goals: [...currentGoals, goal] });
    }
  };

  // ✅ Player: Request Coach
  const handleRequestCoach = async () => {
      if(!coachCodeInput.trim() || coachCodeInput.length !== 6) {
          Alert.alert("Invalid Code", "Please enter a 6-digit code.");
          return;
      }
      setLinking(true);
      try {
          await requestCoach(coachCodeInput);
          Alert.alert("Success", "Request sent! Waiting for coach approval.");
          setShowLinkModal(false);
          loadUser(); 
      } catch (e) {
          Alert.alert("Error", "Coach not found or invalid code.");
      } finally {
          setLinking(false);
      }
  };

  // --- ⚠️ UPDATED DISCONNECT LOGIC FOR WEB & MOBILE ---
  
  // 1. The actual action
  const executeDisconnect = async () => {
      setLoading(true);
      try {
          await disconnectCoach();
          if (Platform.OS === 'web') {
              window.alert("Disconnected: You have left the team.");
          } else {
              Alert.alert("Disconnected", "You have left the team.");
          }
          loadUser(); // Refresh UI
      } catch (e) {
          console.error(e);
          const msg = "Failed to disconnect.";
          Platform.OS === 'web' ? window.alert(msg) : Alert.alert("Error", msg);
      } finally {
          setLoading(false);
      }
  };

  // 2. The Trigger (Handles Platform Differences)
  const handleDisconnect = () => {
      const title = "Disconnect Coach?";
      const msg = "You will be removed from the team roster. Your coach will be notified.";

      if (Platform.OS === 'web') {
          // ✅ Web Support
          if (window.confirm(`${title}\n\n${msg}`)) {
              executeDisconnect();
          }
      } else {
          // ✅ Mobile Support
          Alert.alert(title, msg, [
              { text: "Cancel", style: "cancel" },
              { text: "Disconnect", style: "destructive", onPress: executeDisconnect }
          ]);
      }
  };

  // ✅ Coach: Respond to Request
  const handleRespond = async (playerId, action) => {
      try {
          await respondToCoachRequest(playerId, action);
          setRequests(prev => prev.filter(r => r.id !== playerId));
          Alert.alert("Success", `Player ${action === 'ACCEPT' ? 'added' : 'rejected'}.`);
      } catch (e) {
          Alert.alert("Error", "Could not update request.");
      }
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  // --- RENDERERS ---

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
        <X size={24} color="#64748B" />
      </TouchableOpacity>

      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>{user.name ? user.name[0].toUpperCase() : 'U'}</Text>
      </View>
      <Text style={styles.name}>{user.name}</Text>
      
      <View style={{flexDirection: 'row', gap: 8, marginTop: 8}}>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user.role}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: '#E0F2FE' }]}>
            <BarChart size={12} color="#0284C7" style={{marginRight:4}}/>
            <Text style={[styles.roleText, { color: '#0284C7' }]}>{user.level || 'Intermediate'}</Text>
          </View>
          {user.role === 'PLAYER' && (
            <View style={[styles.roleBadge, { backgroundColor: '#FEF9C3' }]}>
                <Trophy size={12} color="#CA8A04" style={{marginRight:4}}/>
                <Text style={[styles.roleText, { color: '#CA8A04' }]}>{user.xp || 0} XP</Text>
            </View>
          )}
      </View>
    </View>
  );

  const renderCoachDashboard = () => (
      <View style={{gap: 16}}>
          {/* Code Card */}
          <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                  <UserPlus size={20} color={COLORS.primary} />
                  <Text style={styles.cardTitle}>My Coach Code</Text>
              </View>
              <Text style={styles.infoText}>Share this 6-digit code with athletes to add them to your roster.</Text>
              <TouchableOpacity style={styles.codeBox} onPress={() => Alert.alert("Copied", "Code copied.")}>
                  <Text style={styles.codeText}>{user.coach_code || "Generating..."}</Text>
                  <Copy size={16} color="#64748B" />
              </TouchableOpacity>
          </View>

          {/* Pending Requests */}
          {requests.length > 0 && (
              <View style={styles.card}>
                  <View style={styles.cardTitleRow}>
                      <Clock size={20} color="#D97706" />
                      <Text style={styles.cardTitle}>Pending Requests</Text>
                  </View>
                  {requests.map(req => (
                      <View key={req.id} style={styles.requestRow}>
                          <Text style={styles.reqName}>{req.name}</Text>
                          <View style={{flexDirection:'row', gap: 8}}>
                              <TouchableOpacity onPress={() => handleRespond(req.id, 'REJECT')} style={styles.rejectBtn}>
                                  <X size={16} color="#EF4444" />
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => handleRespond(req.id, 'ACCEPT')} style={styles.acceptBtn}>
                                  <Check size={16} color="#FFF" />
                              </TouchableOpacity>
                          </View>
                      </View>
                  ))}
              </View>
          )}
      </View>
  );

  const renderPlayerSettings = () => (
    <View style={{ gap: 16 }}>
      
      {/* Coach Connection Status */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <UserIcon size={20} color={COLORS.primary} />
          <Text style={styles.cardTitle}>My Coach</Text>
        </View>
        
        {user.coach_link_status === 'ACTIVE' ? (
            <View style={styles.connectedRow}>
                <View style={{flexDirection:'row', alignItems:'center', gap: 8}}>
                    <Check size={20} color="#16A34A" />
                    <Text style={styles.connectedText}>Connected</Text>
                </View>
                <TouchableOpacity onPress={handleDisconnect} style={styles.disconnectBtn}>
                    <Trash2 size={18} color="#EF4444" />
                </TouchableOpacity>
            </View>
        ) : user.coach_link_status === 'PENDING' ? (
            <View style={[styles.connectedRow, { backgroundColor: '#FFF7ED' }]}>
                <View style={{flexDirection:'row', alignItems:'center', gap: 8}}>
                    <Clock size={20} color="#D97706" />
                    <Text style={[styles.connectedText, { color: '#9A3412' }]}>Pending...</Text>
                </View>
                <TouchableOpacity onPress={handleDisconnect} style={styles.disconnectBtn}>
                    <X size={18} color="#9A3412" />
                </TouchableOpacity>
            </View>
        ) : (
            <TouchableOpacity style={styles.connectBtn} onPress={() => setShowLinkModal(true)}>
                <UserPlus size={18} color={COLORS.primary} style={{marginRight: 8}}/>
                <Text style={styles.connectBtnText}>Enter Coach Code</Text>
            </TouchableOpacity>
        )}
      </View>

      {/* Skill Level */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Target size={20} color={COLORS.primary} />
          <Text style={styles.cardTitle}>Skill Level</Text>
        </View>
        <View style={styles.levelRow}>
          {SKILL_LEVELS.map((lvl) => {
            const isActive = user.level === lvl;
            return (
              <TouchableOpacity
                key={lvl}
                style={[styles.levelBtn, isActive && styles.levelBtnActive]}
                onPress={() => handleUpdate({ level: lvl })}
              >
                <Text style={[styles.levelText, isActive && styles.levelTextActive]}>{lvl}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Goals */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Zap size={20} color={COLORS.primary} />
          <Text style={styles.cardTitle}>My Goals</Text>
          <TouchableOpacity onPress={() => setIsEditing(!isEditing)} style={{marginLeft: 'auto'}}>
            <Text style={{color: COLORS.primary, fontWeight: '600'}}>{isEditing ? 'Done' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.goalsContainer}>
          {COMMON_GOALS.map(goal => {
            const isSelected = user.goals?.includes(goal);
            if (!isEditing && !isSelected) return null; 
            return (
              <TouchableOpacity 
                key={goal} 
                style={[styles.goalPill, isSelected && styles.goalPillActive]}
                onPress={() => isEditing && toggleGoal(goal)}
                disabled={!isEditing}
              >
                {isSelected && <Check size={12} color="#166534" style={{marginRight: 4}} />}
                <Text style={[styles.goalText, isSelected && styles.goalTextActive]}>{goal}</Text>
              </TouchableOpacity>
            );
          })}
          {!isEditing && (!user.goals || user.goals.length === 0) && (
             <Text style={styles.emptyText}>No goals set.</Text>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadUser} />}>
        {renderHeader()}
        {user.role === 'PLAYER' ? renderPlayerSettings() : renderCoachDashboard()}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* LINK COACH MODAL */}
      <Modal visible={showLinkModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Join a Team</Text>
                  <Text style={styles.modalSub}>Ask your coach for their 6-digit code.</Text>
                  <TextInput 
                      style={styles.input}
                      placeholder="123456"
                      keyboardType="number-pad"
                      maxLength={6}
                      value={coachCodeInput}
                      onChangeText={setCoachCodeInput}
                  />
                  <View style={{flexDirection: 'row', gap: 12, marginTop: 16}}>
                      <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowLinkModal(false)}>
                          <Text style={styles.cancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.saveBtn} onPress={handleRequestCoach} disabled={linking}>
                          {linking ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Request to Join</Text>}
                      </TouchableOpacity>
                  </View>
              </View>
          </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 24, paddingBottom: 100 },
  header: { alignItems: 'center', marginBottom: 32 },
  avatarContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 4, borderColor: '#FFF', ...SHADOWS.medium },
  avatarText: { fontSize: 40, fontWeight: '800', color: '#64748B' },
  name: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  roleBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  roleText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.small, marginBottom: 16 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  levelRow: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 4 },
  levelBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  levelBtnActive: { backgroundColor: '#FFFFFF', ...SHADOWS.small },
  levelText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  levelTextActive: { color: COLORS.primary, fontWeight: '700' },
  goalsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  goalPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  goalPillActive: { backgroundColor: '#DCFCE7', borderColor: COLORS.primary },
  goalText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  goalTextActive: { color: '#166534' },
  connectBtn: { padding: 16, borderRadius: 12, borderStyle: 'dashed', borderWidth: 2, borderColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: '#F0FDF4' },
  connectBtnText: { color: COLORS.primary, fontWeight: '700' },
  connectedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#DCFCE7', borderRadius: 12 },
  connectedText: { color: '#16A34A', fontWeight: '700' },
  disconnectBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 8 },
  infoText: { color: '#64748B', marginBottom: 12 },
  codeBox: { backgroundColor: '#F1F5F9', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  codeText: { fontSize: 24, fontWeight: '800', color: '#0F172A', letterSpacing: 2 },
  requestRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  reqName: { fontSize: 14, fontWeight: '700', color: '#334155' },
  acceptBtn: { backgroundColor: '#16A34A', padding: 8, borderRadius: 8 },
  rejectBtn: { backgroundColor: '#FEE2E2', padding: 8, borderRadius: 8 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 32, padding: 16, backgroundColor: '#FEF2F2', borderRadius: 16 },
  logoutText: { color: '#EF4444', fontWeight: '700', fontSize: 16 },
  closeBtn: { position: 'absolute', top: 0, right: 24, padding: 8, borderRadius: 20, backgroundColor: '#F1F5F9', zIndex: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  modalSub: { fontSize: 14, color: '#64748B', marginBottom: 16 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 16, fontSize: 24, color: '#0F172A', textAlign: 'center', fontWeight: '800', letterSpacing: 4 },
  cancelBtn: { flex: 1, padding: 14, alignItems: 'center' },
  cancelText: { color: '#64748B', fontWeight: '700' },
  saveBtn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  saveText: { color: '#FFF', fontWeight: '700' },
  emptyText: { fontStyle: 'italic', color: '#94A3B8' },
});