import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, TextInput, Alert, ScrollView 
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, ChevronRight, User, Users, ClipboardList, TrendingUp, CheckCircle, Circle } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { fetchSquads, fetchAthletes, fetchUnreadCounts, createSquad } from '../services/api'; 

export default function TeamScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('Athletes'); 
  const [athletes, setAthletes] = useState([]);
  const [squads, setSquads] = useState([]);
  const [badges, setBadges] = useState({}); 
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalVisible, setModalVisible] = useState(false);
  const [newSquadName, setNewSquadName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]); // ✅ Track selections

  const loadData = async () => {
    setLoading(true);
    try {
        const [athleteData, squadData, badgeData] = await Promise.all([
            fetchAthletes().catch(() => []), 
            fetchSquads().catch(() => []),
            fetchUnreadCounts().catch(() => ({ players: {} }))
        ]);
        
        setAthletes(athleteData || []);
        setSquads(squadData || []);
        setBadges(badgeData.players || {});
    } catch (e) {
        console.error("Team Load Error:", e);
    } finally {
        setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const toggleMemberSelection = (id) => {
      if (selectedMembers.includes(id)) {
          setSelectedMembers(prev => prev.filter(m => m !== id));
      } else {
          setSelectedMembers(prev => [...prev, id]);
      }
  };

  const handleCreateSquad = async () => {
      if (!newSquadName.trim()) {
          Alert.alert("Required", "Please enter a squad name.");
          return;
      }
      try {
          // ✅ Pass selectedMembers to API (Ensure api.js maps this to 'initial_members')
          await createSquad(newSquadName, "Intermediate", selectedMembers);
          
          setModalVisible(false);
          setNewSquadName("");
          setSelectedMembers([]); // Reset
          loadData(); 
          Alert.alert("Success", "Squad created with selected members!");
      } catch (e) {
          Alert.alert("Error", "Could not create squad.");
      }
  };

  // --- RENDERERS ---

  const renderAthlete = ({ item }) => {
      const unreadCount = badges[item.id] || 0;
      const hasProgram = item.xp > 0; 
      
      return (
        <TouchableOpacity 
            style={styles.card}
            onPress={() => navigation.navigate('AthleteDetail', { athlete: item })}
        >
            <View style={styles.cardHeader}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{item.name ? item.name[0].toUpperCase() : '?'}</Text>
                    </View>
                    <View>
                        <Text style={styles.name}>{item.name || "Unknown"}</Text>
                        <Text style={styles.subText}>{hasProgram ? "Training Active" : "No Active Plan"}</Text>
                    </View>
                </View>
                
                {unreadCount > 0 ? (
                    <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>
                ) : (
                    <ChevronRight size={20} color="#CBD5E1" />
                )}
            </View>

            <View style={styles.divider} />

            <View style={styles.cardActions}>
                 <TouchableOpacity 
                    style={styles.actionBtn}
                    onPress={() => navigation.navigate('ProgramBuilder', { squadMode: false, preSelectedAthlete: item })}
                 >
                    <ClipboardList size={16} color={COLORS.primary} />
                    <Text style={styles.actionText}>Assign Program</Text>
                 </TouchableOpacity>

                 <TouchableOpacity 
                    style={styles.actionBtn}
                    onPress={() => navigation.navigate('MatchDiary', { athleteId: item.id, athleteName: item.name })}
                 >
                    <TrendingUp size={16} color={COLORS.primary} />
                    <Text style={styles.actionText}>Match Diary</Text>
                 </TouchableOpacity>
            </View>
        </TouchableOpacity>
      );
  };

  const renderSquad = ({ item }) => (
    <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('SquadDetail', { squad: item })}
    >
        <View style={styles.cardHeader}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                <View style={[styles.avatar, { backgroundColor: '#E0E7FF' }]}>
                    <Users size={20} color="#4F46E5" />
                </View>
                <View>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.subText}>{item.member_count || 0} Athletes</Text>
                </View>
            </View>
            <ChevronRight size={20} color="#CBD5E1" />
        </View>

        <View style={styles.divider} />

        <View style={styles.cardActions}>
             <TouchableOpacity 
                style={styles.actionBtn}
                onPress={() => navigation.navigate('ProgramBuilder', { squadMode: true, preSelectedSquad: item })}
             >
                <ClipboardList size={16} color={COLORS.primary} />
                <Text style={styles.actionText}>Assign Squad Plan</Text>
             </TouchableOpacity>
        </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>My Team</Text>
        {activeTab === 'Squads' ? (
            <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
                <Plus size={24} color="#FFF" />
            </TouchableOpacity>
        ) : (
            <View style={{width: 40}} /> 
        )}
      </View>

      {/* TABS */}
      <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'Athletes' && styles.activeTab]}
            onPress={() => setActiveTab('Athletes')}
          >
              <Text style={[styles.tabText, activeTab === 'Athletes' && styles.activeTabText]}>Athletes</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'Squads' && styles.activeTab]}
            onPress={() => setActiveTab('Squads')}
          >
              <Text style={[styles.tabText, activeTab === 'Squads' && styles.activeTabText]}>Squads</Text>
          </TouchableOpacity>
      </View>

      {/* LIST CONTENT */}
      <FlatList
        data={activeTab === 'Athletes' ? athletes : squads}
        renderItem={activeTab === 'Athletes' ? renderAthlete : renderSquad}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
            !loading && (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No {activeTab.toLowerCase()} found.</Text>
                </View>
            )
        }
      />

      {/* ✅ CREATE SQUAD MODAL */}
      <Modal transparent visible={isModalVisible} animationType="fade">
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>New Squad</Text>
                  
                  <Text style={styles.inputLabel}>Squad Name</Text>
                  <TextInput 
                      style={styles.input} 
                      placeholder="e.g. Elite Juniors" 
                      value={newSquadName}
                      onChangeText={setNewSquadName}
                  />

                  <Text style={styles.inputLabel}>Add Members</Text>
                  <View style={styles.memberListContainer}>
                    <ScrollView style={{maxHeight: 200}}>
                        {athletes.length > 0 ? (
                            athletes.map(athlete => {
                                const isSelected = selectedMembers.includes(athlete.id);
                                return (
                                    <TouchableOpacity 
                                        key={athlete.id} 
                                        style={[styles.memberRow, isSelected && styles.memberRowSelected]}
                                        onPress={() => toggleMemberSelection(athlete.id)}
                                    >
                                        <View style={{flexDirection:'row', alignItems:'center', gap: 10}}>
                                            <View style={styles.miniAvatar}>
                                                <Text style={styles.miniAvatarText}>{athlete.name ? athlete.name[0] : '?'}</Text>
                                            </View>
                                            <Text style={[styles.memberName, isSelected && {color: COLORS.primary, fontWeight:'700'}]}>
                                                {athlete.name}
                                            </Text>
                                        </View>
                                        {isSelected ? (
                                            <CheckCircle size={20} color={COLORS.primary} />
                                        ) : (
                                            <Circle size={20} color="#CBD5E1" />
                                        )}
                                    </TouchableOpacity>
                                );
                            })
                        ) : (
                            <Text style={{color: '#94A3B8', fontStyle: 'italic', padding: 10}}>No athletes available to add.</Text>
                        )}
                    </ScrollView>
                  </View>

                  <View style={styles.modalActions}>
                      <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                          <Text style={styles.cancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleCreateSquad} style={styles.createBtn}>
                          <Text style={styles.createText}>Create Squad</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#FFF' },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', ...SHADOWS.medium },
  
  tabContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16 },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginRight: 8, backgroundColor: '#F1F5F9' },
  activeTab: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  activeTabText: { color: '#FFF' },

  list: { paddingHorizontal: 20, paddingBottom: 100 },
  
  card: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 12, ...SHADOWS.small, borderWidth: 1, borderColor: '#E2E8F0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#64748B' },
  name: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  subText: { fontSize: 13, color: '#64748B' },
  divider: { height: 1, backgroundColor: '#F1F5F9' },
  cardActions: { flexDirection: 'row', padding: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 6 },
  actionText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  badge: { backgroundColor: '#EF4444', minWidth: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#94A3B8', fontSize: 14, fontStyle: 'italic' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxHeight: '80%', backgroundColor: '#FFF', borderRadius: 16, padding: 24, ...SHADOWS.medium },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 16, color: '#0F172A' },
  inputLabel: { fontSize: 14, fontWeight: '700', color: '#64748B', marginBottom: 8, marginTop: 4 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 16 },
  
  memberListContainer: { borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 12, marginBottom: 20 },
  memberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  memberRowSelected: { backgroundColor: '#F0FDF4' },
  miniAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  miniAvatarText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  memberName: { fontSize: 14, color: '#334155' },

  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  cancelBtn: { padding: 12 },
  cancelText: { color: '#64748B', fontWeight: '600' },
  createBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  createText: { color: '#FFF', fontWeight: '700' }
});