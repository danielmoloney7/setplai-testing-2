import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar, Users, Clock, CheckCircle, ChevronLeft, XCircle, AlertCircle, Check } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { fetchSessionLogs, updateProgramStatus } from '../services/api';

export default function ProgramDetailScreen({ navigation, route }) {
  const { program } = route.params || {};
  const [role, setRole] = useState('PLAYER');
  const [completedDays, setCompletedDays] = useState([]);
  const [currentStatus, setCurrentStatus] = useState(program?.status);

  useFocusEffect(
    useCallback(() => {
        const init = async () => {
            const storedRole = await AsyncStorage.getItem('user_role');
            setRole(storedRole ? storedRole.toUpperCase() : 'PLAYER');
            
            // Sync status if passed in params was stale
            if (program?.status) setCurrentStatus(program.status);

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

  // Handle Accept/Decline Logic
  const handleStatusChange = async (newStatus) => {
    try {
        await updateProgramStatus(program.id, newStatus);
        setCurrentStatus(newStatus);
        Alert.alert("Success", newStatus === 'ACTIVE' ? "Program Accepted!" : "Program Declined.");
        
        // Go back if declined, otherwise stay
        if (newStatus === 'DECLINED') navigation.goBack();
    } catch (e) {
        Alert.alert("Error", "Could not update status.");
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
        
        {/* Header Info */}
        <View style={styles.headerCard}>
            <Text style={styles.title}>{program.title}</Text>
            <Text style={styles.desc}>{program.description}</Text>
            <View style={styles.metaRow}>
                <View style={styles.metaItem}><Calendar size={16} color="#64748B" /><Text style={styles.metaText}>{sessionList.length} Sessions</Text></View>
                <View style={styles.metaItem}><Users size={16} color="#64748B" /><Text style={styles.metaText}>{program.assigned_to ? `${program.assigned_to.length} Assigned` : 'Unassigned'}</Text></View>
            </View>
        </View>

        {/* ✅ PENDING ALERT */}
        {role === 'PLAYER' && currentStatus === 'PENDING' && (
            <View style={styles.pendingBanner}>
                <AlertCircle size={20} color="#C2410C" />
                <Text style={styles.pendingBannerText}>This program is waiting for your acceptance.</Text>
            </View>
        )}

        <Text style={styles.sectionTitle}>Session Schedule</Text>
        
        {sessionList.map((session, index) => {
            const isCompleted = completedDays.includes(session.day_order);

            return (
                <TouchableOpacity 
                    key={index} 
                    style={[styles.sessionCard, isCompleted && styles.completedCard]}
                    disabled={role === 'PLAYER' && currentStatus === 'PENDING'} // Disable click if pending
                    onPress={() => {
                        if (isCompleted) {
                            navigation.navigate('SessionSummary', { session: session, programId: program.id });
                        } else {
                            navigation.navigate('Session', { session: session, programId: program.id });
                        }
                    }}
                >
                    <View style={styles.sessionHeader}>
                        <View style={[styles.dayBadge, isCompleted && styles.completedBadge]}>
                            {isCompleted ? <CheckCircle size={14} color="#16A34A" /> : <Text style={styles.dayText}>Day {session.day_order}</Text>}
                        </View>
                        <View>
                            <Text style={styles.sessionName}>{session.title}</Text>
                            <Text style={styles.drillCount}>{session.items.length} Drills</Text>
                        </View>
                    </View>
                    {isCompleted ? (
                        <View style={styles.doneTag}><Text style={styles.doneTagText}>Done</Text></View>
                    ) : (
                        <View style={styles.drillTag}><Clock size={12} color={COLORS.primary} /><Text style={styles.drillTagText}>{session.totalMinutes} min</Text></View>
                    )}
                </TouchableOpacity>
            );
        })}
      </ScrollView>

      {/* ✅ NEW FOOTER LOGIC */}
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

  pendingBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFF7ED', padding: 16, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#FED7AA' },
  pendingBannerText: { fontSize: 13, fontWeight: '700', color: '#C2410C', flex: 1 },

  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 12 },
  
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

  // ✅ New Footer Action Styles
  pendingActions: { flexDirection: 'row', gap: 16 },
  acceptBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#DCFCE7', padding: 16, borderRadius: 12 },
  acceptText: { color: '#16A34A', fontWeight: '800', fontSize: 16 },
  declineBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FEE2E2', padding: 16, borderRadius: 12 },
  declineText: { color: '#DC2626', fontWeight: '800', fontSize: 16 },
});