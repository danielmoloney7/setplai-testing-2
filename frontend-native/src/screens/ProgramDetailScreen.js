import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Users, Clock, ChevronLeft, CheckCircle } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';

export default function ProgramDetailScreen({ navigation, route }) {
  const { program } = route.params || {};

  if (!program) return null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Header Section */}
        <View style={styles.headerCard}>
            <Text style={styles.title}>{program.title}</Text>
            <Text style={styles.desc}>{program.description}</Text>
            
            <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                    <Calendar size={16} color="#64748B" />
                    <Text style={styles.metaText}>{program.schedule?.length || 4} Sessions</Text>
                </View>
                <View style={styles.metaItem}>
                    <Users size={16} color="#64748B" />
                    <Text style={styles.metaText}>
                        {program.assignedTo ? `${program.assignedTo.length} Assigned` : 'Unassigned'}
                    </Text>
                </View>
            </View>
        </View>

        {/* Sessions List */}
        <Text style={styles.sectionTitle}>Session Schedule</Text>
        {program.schedule?.map((session, index) => (
            <View key={index} style={styles.sessionCard}>
                <View style={styles.sessionHeader}>
                    <View style={styles.dayBadge}>
                        <Text style={styles.dayText}>Day {session.day_order || index + 1}</Text>
                    </View>
                    <Text style={styles.sessionName}>{session.drill_name || `Session ${index + 1}`}</Text>
                </View>
                {session.notes && <Text style={styles.notes}>Note: {session.notes}</Text>}
                <View style={styles.drillTag}>
                    <Clock size={12} color={COLORS.primary} />
                    <Text style={styles.drillTagText}>{session.duration_minutes || 60} min</Text>
                </View>
            </View>
        ))}

      </ScrollView>

      {/* Footer Action */}
      <View style={styles.footer}>
        <TouchableOpacity 
            style={styles.doneBtn} 
            onPress={() => navigation.navigate('Main', { screen: 'Programs' })}
        >
            <CheckCircle size={20} color="#FFF" />
            <Text style={styles.doneBtnText}>Return to Programs</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 24 },
  
  headerCard: { backgroundColor: '#FFF', padding: 24, borderRadius: 16, marginBottom: 24, ...SHADOWS.medium },
  title: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  desc: { fontSize: 14, color: '#64748B', lineHeight: 22, marginBottom: 16 },
  metaRow: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: '#64748B', fontWeight: '600' },

  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 16 },
  
  sessionCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  dayBadge: { backgroundColor: '#E0F2FE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  dayText: { fontSize: 11, fontWeight: '700', color: '#0284C7' },
  sessionName: { fontSize: 16, fontWeight: '700', color: '#334155' },
  notes: { fontSize: 13, color: '#64748B', fontStyle: 'italic', marginBottom: 8 },
  drillTag: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  drillTagText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },

  footer: { padding: 24, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  doneBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  doneBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 }
});