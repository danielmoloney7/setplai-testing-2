import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  RefreshControl, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, Link as LinkIcon, Check, Zap, Target, Trophy, User as UserIcon, X, BarChart } from 'lucide-react-native'; // ✅ Added BarChart
import { COLORS, SHADOWS } from '../constants/theme';
import { updateProfile, fetchUserProfile } from '../services/api';

const COMMON_GOALS = ['Improve Serve', 'Consistency', 'Strategy', 'Fitness', 'Mental Game', 'Power', 'Footwork'];
const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState({ 
    name: 'Loading...', 
    role: 'PLAYER', 
    level: 'Intermediate', 
    goals: [], 
    xp: 0,
    connectedDevices: [] 
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load User Data
  const loadUser = async () => {
    setLoading(true);
    try {
        const data = await fetchUserProfile();
        if (data) {
            const normalizedUser = {
                ...data,
                role: (data.role || 'PLAYER').toUpperCase(),
                goals: typeof data.goals === 'string' ? data.goals.split(',') : (data.goals || [])
            };
            setUser(normalizedUser);
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
    // 1. Optimistic UI Update (Updates screen immediately)
    setUser(prev => ({ ...prev, ...updates }));
    const payload = {
        goals: updates.goals || user.goals,
        level: updates.level || user.level
    };
    
    // 2. API Call
    if (updates.goals || updates.level) {
        try {
            await updateProfile({
                goals: updates.goals || user.goals,
                level: updates.level || user.level 
            });
        } catch(e) {
            Alert.alert("Error", "Could not save profile changes.");
            loadUser(); // Revert on error
        }
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

  const handleLogout = async () => {
    await AsyncStorage.clear();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  // --- RENDERERS ---

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.closeBtn} 
        onPress={() => navigation.goBack()}
      >
        <X size={24} color="#64748B" />
      </TouchableOpacity>

      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>{user.name ? user.name[0].toUpperCase() : 'U'}</Text>
      </View>
      <Text style={styles.name}>{user.name}</Text>
      
      <View style={{flexDirection: 'row', gap: 8, marginTop: 8}}>
          {/* Role Badge */}
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user.role}</Text>
          </View>

          {/* ✅ Level Badge (New) */}
          <View style={[styles.roleBadge, { backgroundColor: '#E0F2FE' }]}>
            <BarChart size={12} color="#0284C7" style={{marginRight:4}}/>
            <Text style={[styles.roleText, { color: '#0284C7' }]}>{user.level || 'Intermediate'}</Text>
          </View>

          {/* XP Badge (PLAYER ONLY) */}
          {user.role === 'PLAYER' && (
            <View style={[styles.roleBadge, { backgroundColor: '#FEF9C3' }]}>
                <Trophy size={12} color="#CA8A04" style={{marginRight:4}}/>
                <Text style={[styles.roleText, { color: '#CA8A04' }]}>{user.xp || 0} XP</Text>
            </View>
          )}
      </View>
    </View>
  );

  const renderPlayerSettings = () => (
    <View style={{ gap: 16 }}>
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
             <Text style={styles.emptyText}>No goals set. Tap Edit to add some.</Text>
          )}
        </View>
      </View>

      {/* Connected Devices */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <LinkIcon size={20} color={COLORS.primary} />
          <Text style={styles.cardTitle}>Connected Devices</Text>
        </View>
        <TouchableOpacity 
            style={styles.connectBtn}
            onPress={() => Alert.alert("Demo", "Wearable connection simulated.")}
        >
            <Text style={styles.connectBtnText}>Connect Smartwatch</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadUser} />}
      >
        
        {renderHeader()}

        {user.role === 'PLAYER' && renderPlayerSettings()}

        {user.role === 'COACH' && (
            <View style={styles.emptyContainer}>
                <UserIcon size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>Coach profile active.</Text>
                <Text style={styles.emptySubText}>Manage your athletes from the Team tab.</Text>
            </View>
        )}

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

  // Header
  header: { alignItems: 'center', marginBottom: 32 },
  avatarContainer: { 
    width: 100, height: 100, borderRadius: 50, 
    backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, borderWidth: 4, borderColor: '#FFF', ...SHADOWS.medium
  },
  avatarText: { fontSize: 40, fontWeight: '800', color: '#64748B' },
  name: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  
  roleBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  roleText: { fontSize: 12, fontWeight: '700', color: '#64748B', letterSpacing: 0.5 },

  // Cards
  card: { 
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, 
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.small 
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },

  // Skill Level
  levelRow: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 4 },
  levelBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  levelBtnActive: { backgroundColor: '#FFFFFF', ...SHADOWS.small },
  levelText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  levelTextActive: { color: COLORS.primary, fontWeight: '700' },

  // Goals
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

  // Devices
  connectBtn: { 
    padding: 16, borderRadius: 12, borderStyle: 'dashed', borderWidth: 2, 
    borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' 
  },
  connectBtnText: { color: COLORS.primary, fontWeight: '700' },

  // Coach Empty
  emptyContainer: { alignItems: 'center', marginVertical: 40, gap: 10 },
  emptySubText: { color: '#94A3B8', fontSize: 14 },

  // Logout
  logoutBtn: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, 
    marginTop: 32, padding: 16, backgroundColor: '#FEF2F2', borderRadius: 16 
  },
  logoutText: { color: '#EF4444', fontWeight: '700', fontSize: 16 },

  closeBtn: {
    position: 'absolute',
    top: 0,
    right: 24,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    zIndex: 10
  },
});