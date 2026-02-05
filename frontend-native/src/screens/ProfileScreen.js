import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  Image, Switch, Alert, ActivityIndicator 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, Edit2, Link as LinkIcon, Check, Zap, Target } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { updateProfile } from '../services/api';

const COMMON_GOALS = ['Improve Serve', 'Consistency', 'Strategy', 'Fitness', 'Mental Game', 'Power', 'Footwork'];
const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState({ name: 'Loading...', role: 'PLAYER', level: 'Intermediate', goals: [], connectedDevices: [] });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const name = await AsyncStorage.getItem('user_name');
    const role = await AsyncStorage.getItem('user_role');
    // Default data for visual testing if API fails
    setUser({ 
      name: name || 'Rafael N.', 
      role: (role || 'PLAYER').toUpperCase(), 
      level: 'Advanced',
      goals: ['Power', 'Serve'],
      connectedDevices: []
    });
  };

  const handleUpdate = (updates) => {
    setUser(prev => ({ ...prev, ...updates }));
    // In a real app, you would debounce this call to the API
    if (updates.goals) updateProfile(updates.goals).catch(err => console.log(err));
  };

  const toggleGoal = (goal) => {
    const currentGoals = user.goals || [];
    if (currentGoals.includes(goal)) {
      handleUpdate({ goals: currentGoals.filter(g => g !== goal) });
    } else {
      handleUpdate({ goals: [...currentGoals, goal] });
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    navigation.replace('Login');
  };

  // --- 1. Header Section ---
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.avatarContainer}>
        {/* Placeholder Avatar - Replace with user.avatar if available */}
        <Text style={styles.avatarText}>{user.name[0]}</Text>
      </View>
      <Text style={styles.name}>{user.name}</Text>
      <View style={styles.roleBadge}>
        <Text style={styles.roleText}>{user.role}</Text>
      </View>
    </View>
  );

  // --- 2. Player Settings (The "Cards") ---
  const renderPlayerSettings = () => (
    <View style={{ gap: 16 }}>
      
      {/* Skill Level Card */}
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

      {/* Goals Card */}
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
            // Only show selected goals unless editing
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
             <Text style={styles.emptyText}>No goals set. Tap Edit to add some.</Text>
          )}
        </View>
      </View>

      {/* Connected Devices Card */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <LinkIcon size={20} color={COLORS.primary} />
          <Text style={styles.cardTitle}>Connected Devices</Text>
        </View>
        {user.connectedDevices?.length > 0 ? (
           <View style={styles.connectedRow}>
              <View>
                  <Text style={styles.deviceText}>Smartwatch Connected</Text>
                  <Text style={styles.deviceSub}>Syncing heart rate & calories</Text>
              </View>
              <TouchableOpacity onPress={() => handleUpdate({ connectedDevices: [] })} style={styles.disconnectBtn}>
                  <Text style={styles.disconnectText}>Disconnect</Text>
              </TouchableOpacity>
           </View>
        ) : (
            <TouchableOpacity 
                style={styles.connectBtn}
                onPress={() => handleUpdate({ connectedDevices: ['Smartwatch'] })}
            >
                <Text style={styles.connectBtnText}>Connect Smartwatch</Text>
            </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {renderHeader()}

        {user.role === 'PLAYER' && renderPlayerSettings()}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 24, paddingBottom: 100 },

  // --- Header ---
  header: { alignItems: 'center', marginBottom: 32 },
  avatarContainer: { 
    width: 100, height: 100, borderRadius: 50, 
    backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, borderWidth: 4, borderColor: '#FFF', ...SHADOWS.medium
  },
  avatarText: { fontSize: 40, fontWeight: '800', color: '#64748B' },
  name: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  roleBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  roleText: { fontSize: 12, fontWeight: '700', color: '#64748B', letterSpacing: 1 },

  // --- Cards ---
  card: { 
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, 
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.small 
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },

  // --- Skill Level ---
  levelRow: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 4 },
  levelBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  levelBtnActive: { backgroundColor: '#FFFFFF', ...SHADOWS.small },
  levelText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  levelTextActive: { color: COLORS.primary, fontWeight: '700' },

  // --- Goals ---
  goalsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  goalPill: { 
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, 
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' 
  },
  goalPillActive: { backgroundColor: '#DCFCE7', borderColor: COLORS.primary },
  goalText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  goalTextActive: { color: '#166534' },
  emptyText: { fontStyle: 'italic', color: '#94A3B8' },

  // --- Devices ---
  connectBtn: { 
    padding: 16, borderRadius: 12, borderStyle: 'dashed', borderWidth: 2, 
    borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' 
  },
  connectBtnText: { color: COLORS.primary, fontWeight: '700' },
  connectedRow: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    backgroundColor: '#F0FDF4', padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: '#DCFCE7'
  },
  deviceText: { fontWeight: '700', color: '#166534' },
  deviceSub: { fontSize: 11, color: '#15803D' },
  disconnectBtn: { backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  disconnectText: { fontSize: 11, fontWeight: '700', color: '#DC2626' },

  // --- Logout ---
  logoutBtn: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, 
    marginTop: 32, padding: 16, backgroundColor: '#FEF2F2', borderRadius: 16 
  },
  logoutText: { color: '#EF4444', fontWeight: '700', fontSize: 16 }
});