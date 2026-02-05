import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar, Users, Clock, CheckCircle, ChevronLeft } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';

export default function ProgramDetailScreen({ navigation, route }) {
  const { program } = route.params || {};
  const [role, setRole] = useState('PLAYER');

  // 1. Determine Role for Smart Routing
  useFocusEffect(
    useCallback(() => {
        const getRole = async () => {
            const storedRole = await AsyncStorage.getItem('user_role');
            setRole(storedRole ? storedRole.toUpperCase() : 'PLAYER');
        };
        getRole();
    }, [])
  );

  if (!program) return null;

  // 2. Group Flat Schedule into Sessions (Multi-Drill Support)
  const groupedSessions = program.schedule?.reduce((acc, item) => {
      const day = item.day_order;
      if (!acc[day]) {
          acc[day] = { 
              day_order: day, 
              title: `Session ${day}`, 
              items: [], 
              totalMinutes: 0 
          };
      }
      acc[day].items.push(item);
      acc[day].totalMinutes += (item.duration_minutes || 0);
      return acc;
  }, {});

  const sessionList = Object.values(groupedSessions || {});

  // 3. Smart Navigation Handler
  const handleReturn = () => {
      const targetTab = role === 'COACH' ? 'Programs' : 'Plans';
      navigation.navigate('Main', { screen: targetTab });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleReturn} style={styles.backBtn}>
              <ChevronLeft size={24} color="#334155" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Program Details</Text>
          <View style={{width: 24}} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
            <Text style={styles.title}>{program.title}</Text>
            <Text style={styles.desc}>{program.description}</Text>
            
            <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                    <Calendar size={16} color="#64748B" />
                    <Text style={styles.metaText}>{sessionList.length} Sessions</Text>
                </View>
                <View style={styles.metaItem}>
                    <Users size={16} color="#64748B" />
                    <Text style={styles.metaText}>
                        {program.assigned_to ? `${program.assigned_to.length} Assigned` : 'Unassigned'}
                    </Text>
                </View>
            </View>
        </View>

        <Text style={styles.sectionTitle}>Session Schedule</Text>
        
        {sessionList.map((session, index) => (
            <TouchableOpacity 
                key={index} 
                style={styles.sessionCard}
                onPress={() => navigation.navigate('Session', { 
                    session: session, 
                    programId: program.id 
                })}
            >
                <View style={styles.sessionHeader}>
                    <View style={styles.dayBadge}>
                        <Text style={styles.dayText}>Day {session.day_order}</Text>
                    </View>
                    <View>
                        <Text style={styles.sessionName}>{session.title}</Text>
                        <Text style={styles.drillCount}>{session.items.length} Drills</Text>
                    </View>
                </View>
                
                <View style={styles.drillTag}>
                    <Clock size={12} color={COLORS.primary} />
                    <Text style={styles.drillTagText}>{session.totalMinutes} min</Text>
                </View>
            </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Footer Action */}
      <View style={styles.footer}>
        <TouchableOpacity 
            style={styles.doneBtn} 
            onPress={handleReturn} // ✅ Uses smart routing
        >
            <CheckCircle size={20} color="#FFF" />
            <Text style={styles.doneBtnText}>
                {role === 'COACH' ? 'Return to Team Programs' : 'Return to My Plans'}
            </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  backBtn: { padding: 4 },
  content: { padding: 24 },
  
  headerCard: { backgroundColor: '#FFF', padding: 24, borderRadius: 16, marginBottom: 24, ...SHADOWS.medium },
  title: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  desc: { fontSize: 14, color: '#64748B', lineHeight: 22, marginBottom: 16 },
  metaRow: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: '#64748B', fontWeight: '600' },

  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 16 },
  
  sessionCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dayBadge: { backgroundColor: '#E0F2FE', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  dayText: { fontSize: 12, fontWeight: '700', color: '#0284C7' },
  sessionName: { fontSize: 16, fontWeight: '700', color: '#334155' },
  drillCount: { fontSize: 12, color: '#64748B' },
  drillTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  drillTagText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },

  footer: { padding: 24, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  doneBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  doneBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 }
});