import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Share, TextInput, Modal, ScrollView } from 'react-native';
import { Share2, Plus, Users, Check, ChevronRight } from 'lucide-react-native'; 
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native'; 
import { COLORS, SHADOWS } from '../constants/theme';
import { fetchMyTeam, fetchSquads, createSquad, fetchUserProfile } from '../services/api'; 

export default function TeamScreen({ navigation, route }) { 
  const [viewMode, setViewMode] = useState('ATHLETES');
  const [team, setTeam] = useState([]);
  const [squads, setSquads] = useState([]);
  const [userProfile, setUserProfile] = useState(null); // Track profile for coach code
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [newSquadName, setNewSquadName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async (isPullToRefresh = false) => {
    // Only show the physical pull-to-refresh spinner if the user pulled it
    if (isPullToRefresh) setIsRefreshing(true);
    else if (team.length === 0) setLoading(true);
    
    try {
        const [teamData, squadData, profileData] = await Promise.all([
            fetchMyTeam(),
            fetchSquads(),
            fetchUserProfile()
        ]);
        setTeam(teamData || []);
        setSquads(squadData || []);
        setUserProfile(profileData);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
        setIsRefreshing(false); // Turn off the spinner
    }
  };

  // ✅ AUTO-OPEN MODAL LOGIC
  // This catches the instruction from CoachActionScreen
  useFocusEffect(
    useCallback(() => {
      loadData(false); // Load data on focus

      if (route.params?.openModal) {
        setViewMode('SQUADS'); // Switch to squad view automatically
        setModalVisible(true);
        
        // Clear the param immediately so it doesn't reopen every switch
        navigation.setParams({ openModal: undefined });
      }
    }, [route.params?.openModal])
  );

  const toggleMemberSelection = (id) => {
    if (selectedMembers.includes(id)) {
      setSelectedMembers(prev => prev.filter(m => m !== id));
    } else {
      setSelectedMembers(prev => [...prev, id]);
    }
  };

  const handleCreateSquad = async () => {
    console.log("Creating Squad:", newSquadName, selectedMembers);
    try {
        await createSquad(newSquadName, "General", selectedMembers);
        setModalVisible(false);
        setNewSquadName('');
        setSelectedMembers([]);
        loadData();
    } catch (e) {
        console.error("Create Squad Failed:", e);
    }
  };

  // ✅ NEW: Magic Share Invite Flow
  const handleShareInvite = async () => {
      try {
          const coachCode = userProfile?.coach_code || 'YOUR_CODE';
          const message = `Join my training squad on Setplai! 🎾\n\n1. Download the app: https://setplai.com/download\n2. Sign up and enter my Coach Code: ${coachCode}\n\nLet's get to work!`;
          
          await Share.share({
              message: message,
              title: "Join my Setplai Squad"
          });
      } catch (error) {
          Alert.alert("Error", "Could not share invite link.");
      }
  };

  const renderAthleteItem = ({ item }) => (
    <TouchableOpacity 
        style={styles.card} 
        onPress={() => navigation.navigate('AthleteDetail', { athlete: item })}
    >
        <View style={styles.avatar}><Text style={styles.avatarText}>{item.name[0]}</Text></View>
        <View style={{flex: 1}}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.subText}>{item.role}</Text>
        </View>
        <ChevronRight size={20} color="#CBD5E1" />
    </TouchableOpacity>
  );

  const renderSquadItem = ({ item }) => (
    <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('SquadDetail', { squad: item })}
    >
        <View style={[styles.avatar, { backgroundColor: '#E0F2FE' }]}>
            <Users size={20} color="#0284C7" />
        </View>
        <View style={{flex: 1}}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.subText}>{item.member_count} Members</Text>
        </View>
        <ChevronRight size={20} color="#CBD5E1" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Team</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Plus color="#FFF" size={24} />
        </TouchableOpacity>
      </View>

      {/* ✅ NEW INVITE BLOCK */}
      <View style={styles.inviteContainer}>
          <View style={{flex: 1}}>
            <Text style={styles.codeLabel}>YOUR COACH CODE</Text>
            <Text style={styles.codeValue}>{userProfile?.coach_code || '----'}</Text>
          </View>
          <TouchableOpacity style={styles.shareCodeBtn} onPress={handleShareInvite}>
              <Share2 size={18} color="#FFF" />
              <Text style={styles.shareCodeText}>Invite Players</Text>
          </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity onPress={() => setViewMode('ATHLETES')} style={[styles.tab, viewMode === 'ATHLETES' && styles.activeTab]}>
            <Text style={[styles.tabText, viewMode === 'ATHLETES' && styles.activeTabText]}>Athletes</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setViewMode('SQUADS')} style={[styles.tab, viewMode === 'SQUADS' && styles.activeTab]}>
            <Text style={[styles.tabText, viewMode === 'SQUADS' && styles.activeTabText]}>Squads</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 40}} />
      ) : (
          <FlatList
            data={viewMode === 'ATHLETES' ? team : squads}
            keyExtractor={item => item.id}
            renderItem={viewMode === 'ATHLETES' ? renderAthleteItem : renderSquadItem}
            contentContainerStyle={styles.list}
            refreshing={isRefreshing} 
            onRefresh={() => loadData(true)}
            ListEmptyComponent={
                <Text style={styles.emptyText}>
                    {viewMode === 'ATHLETES' ? 'No athletes yet. Invite them using your code above!' : 'No squads created yet.'}
                </Text>
            }
          />
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>New Squad</Text>
                
                <TextInput 
                    style={styles.input} 
                    placeholder="Squad Name" 
                    value={newSquadName}
                    onChangeText={setNewSquadName}
                />

                <Text style={styles.label}>Select Athletes:</Text>
                <View style={styles.memberList}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {team.map(player => {
                            const isSelected = selectedMembers.includes(player.id);
                            return (
                                <TouchableOpacity 
                                    key={player.id} 
                                    style={[styles.memberRow, isSelected && styles.memberSelected]}
                                    onPress={() => toggleMemberSelection(player.id)}
                                >
                                    <Text style={[styles.memberName, isSelected && {color: COLORS.primary, fontWeight: '700'}]}>{player.name}</Text>
                                    {isSelected && <Check size={16} color={COLORS.primary} />}
                                </TouchableOpacity>
                            )
                        })}
                        {team.length === 0 && (
                            <Text style={[styles.emptyText, {padding: 16}]}>You need athletes on your team before creating a squad.</Text>
                        )}
                    </ScrollView>
                </View>

                <View style={styles.modalActions}>
                    <TouchableOpacity onPress={() => {
                        setModalVisible(false);
                        setNewSquadName('');
                        setSelectedMembers([]);
                    }} style={styles.cancelBtn}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleCreateSquad} style={styles.createBtn}>
                        <Text style={styles.createText}>Create ({selectedMembers.length})</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 },
  title: { fontSize: 32, fontWeight: '800', color: '#0F172A' },
  addBtn: { backgroundColor: COLORS.primary, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', ...SHADOWS.small },
  
  // Invite Block Styles
  inviteContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', marginHorizontal: 24, marginBottom: 20, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.small },
  codeLabel: { fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5, marginBottom: 2 },
  codeValue: { fontSize: 24, fontWeight: '900', color: '#0F172A', letterSpacing: 2 },
  shareCodeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  shareCodeText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  tabs: { flexDirection: 'row', paddingHorizontal: 24, marginBottom: 16, gap: 12 },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#F1F5F9' },
  activeTab: { backgroundColor: '#1E293B' },
  tabText: { fontWeight: '600', color: '#64748B' },
  activeTabText: { color: '#FFF' },
  
  list: { paddingHorizontal: 24, paddingBottom: 100 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9', ...SHADOWS.small },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#475569' },
  name: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  subText: { fontSize: 13, color: '#64748B' },
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 40, fontStyle: 'italic' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 16 },
  input: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '700', color: '#64748B', marginBottom: 8 },
  memberList: { maxHeight: 200, marginBottom: 24, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12 },
  memberRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  memberSelected: { backgroundColor: '#F0FDF4' },
  memberName: { fontSize: 14, color: '#334155' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelBtn: { padding: 12 },
  cancelText: { fontWeight: '700', color: '#64748B' },
  createBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  createText: { fontWeight: '700', color: '#FFF' }
});