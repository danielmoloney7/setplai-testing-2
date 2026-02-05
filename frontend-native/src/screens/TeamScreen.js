import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Image, RefreshControl, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, UserPlus, ChevronRight, Users } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { fetchMyTeam } from '../services/api'; // <--- Ensure this is imported

export default function TeamScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [athletes, setAthletes] = useState([]);
  
  // Hardcoded squads for now (since we haven't built squad fetching yet)
  const [squads, setSquads] = useState([
    { id: 'sq1', name: 'Elite Juniors', count: 2, level: 'Advanced' }
  ]);

  const loadTeam = async () => {
    setLoading(true);
    try {
      const data = await fetchMyTeam();
      setAthletes(data);
    } catch (error) {
      console.log("Failed to load team");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeam();
  }, []);

  const renderHeader = () => (
    <View style={styles.header}>
      <View>
        <Text style={styles.title}>My Team</Text>
        <Text style={styles.subtitle}>{athletes.length} Athletes • {squads.length} Squads</Text>
      </View>
      <View style={{flexDirection: 'row', gap: 8}}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => alert("Invite Logic")}>
          <UserPlus color={COLORS.primary} size={20} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSquadItem = ({ item }) => (
    <TouchableOpacity style={styles.squadCard} onPress={() => alert(`Open Squad: ${item.name}`)}>
      <View style={styles.squadIcon}>
        <Text style={styles.squadInitial}>{item.name[0]}</Text>
      </View>
      <View style={{flex: 1}}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardSub}>{item.level} • {item.count} Members</Text>
      </View>
      <ChevronRight size={20} color="#94A3B8" />
    </TouchableOpacity>
  );

  const renderAthleteItem = ({ item }) => (
    <TouchableOpacity style={styles.athleteCard} onPress={() => alert(`Open Player: ${item.name}`)}>
      <Image 
        source={{ uri: item.avatar || 'https://via.placeholder.com/50' }} 
        style={styles.avatar} 
      />
      <View style={{flex: 1}}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardSub}>{item.email}</Text>
      </View>
      <View>
        <Text style={styles.xpText}>{item.role}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}

      <View style={styles.content}>
        {/* Squads Section */}
        <View style={styles.sectionHeader}>
          <Users size={16} color="#64748B" />
          <Text style={styles.sectionTitle}>SQUADS</Text>
        </View>
        
        <FlatList
          data={squads}
          keyExtractor={item => item.id}
          renderItem={renderSquadItem}
          scrollEnabled={false}
          style={{marginBottom: 24}}
        />

        {/* Athletes Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ALL ATHLETES</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} />
        ) : (
          <FlatList
            data={athletes}
            keyExtractor={item => item.id}
            renderItem={renderAthleteItem}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadTeam} />}
            ListEmptyComponent={
              <Text style={{textAlign: 'center', color: '#94A3B8', marginTop: 20}}>No athletes found.</Text>
            }
            contentContainerStyle={{paddingBottom: 100}}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    paddingHorizontal: 24, paddingVertical: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0'
  },
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B', fontWeight: '500', marginTop: 2 },
  iconBtn: { padding: 10, backgroundColor: '#F1F5F9', borderRadius: 12 },
  
  content: { flex: 1, padding: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#64748B', letterSpacing: 1 },

  // Cards
  squadCard: {
    backgroundColor: '#FFF', padding: 16, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.small, marginBottom: 12
  },
  squadIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center'
  },
  squadInitial: { fontSize: 16, fontWeight: '700', color: '#64748B' },

  athleteCard: {
    backgroundColor: '#FFF', padding: 12, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9', marginBottom: 4
  },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E2E8F0' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  cardSub: { fontSize: 13, color: '#64748B' },
  xpText: { fontSize: 12, fontWeight: '700', color: COLORS.primary, backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
});