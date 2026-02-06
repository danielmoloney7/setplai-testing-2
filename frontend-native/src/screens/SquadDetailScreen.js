import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, UserMinus, UserPlus } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { fetchSquadMembers, removeMemberFromSquad } from '../services/api';

export default function SquadDetailScreen({ navigation, route }) {
  const { squad } = route.params;
  const [members, setMembers] = useState([]);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    const data = await fetchSquadMembers(squad.id);
    setMembers(data);
  };

  const handleRemove = async (playerId) => {
    await removeMemberFromSquad(squad.id, playerId);
    loadMembers();
  };

  const renderMember = ({ item }) => (
    <View style={styles.card}>
        <View style={styles.info}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.email}>{item.email}</Text>
        </View>
        <TouchableOpacity onPress={() => handleRemove(item.id)} style={styles.removeBtn}>
            <UserMinus size={20} color="#EF4444" />
        </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><ChevronLeft size={24} color="#0F172A" /></TouchableOpacity>
        <Text style={styles.title}>{squad.name}</Text>
        <View style={{width:24}} />
      </View>
      <FlatList 
        data={members}
        renderItem={renderMember}
        keyExtractor={item => item.id}
        contentContainerStyle={{padding: 24}}
        ListHeaderComponent={<Text style={styles.sectionTitle}>Members ({members.length})</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24 },
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#64748B', marginBottom: 12 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, ...SHADOWS.small },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  email: { fontSize: 12, color: '#64748B' },
  removeBtn: { padding: 8, backgroundColor: '#FEF2F2', borderRadius: 8 }
});