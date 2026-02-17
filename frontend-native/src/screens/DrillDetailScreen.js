import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Clock, Target, Dumbbell, PlayCircle, Trophy, Users, Edit2 } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';

export default function DrillDetailScreen({ navigation, route }) {
  const { drill } = route.params;

  // Determine colors based on mode
  const isCompetitive = drill.drill_mode === 'Competitive';
  const modeColor = isCompetitive ? '#F97316' : '#10B981';
  const modeBg = isCompetitive ? '#FFEDD5' : '#D1FAE5';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Drill Details</Text>
        <TouchableOpacity style={styles.editBtn} onPress={() => alert('Edit feature coming soon!')}>
            <Edit2 size={20} color="#64748B" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Title Section */}
        <View style={styles.titleSection}>
            <Text style={styles.title}>{drill.name}</Text>
            <View style={styles.badges}>
                <View style={[styles.badge, { backgroundColor: '#F1F5F9' }]}>
                    <Text style={styles.badgeText}>{drill.category}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: '#F1F5F9' }]}>
                    <Text style={styles.badgeText}>{drill.difficulty}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: modeBg }]}>
                    {isCompetitive ? <Trophy size={12} color={modeColor}/> : <Users size={12} color={modeColor}/>}
                    <Text style={[styles.badgeText, { color: modeColor, marginLeft: 4 }]}>
                        {drill.drill_mode || 'Cooperative'}
                    </Text>
                </View>
            </View>
        </View>

        {/* Video Placeholder */}
        <View style={styles.videoContainer}>
            <TouchableOpacity style={styles.videoPlaceholder} activeOpacity={0.9} onPress={() => alert('Video player would open here.')}>
                <PlayCircle size={48} color={COLORS.primary} />
                <Text style={styles.videoText}>Watch Demonstration</Text>
            </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
            <View style={styles.statCard}>
                <Clock size={20} color={COLORS.primary} />
                <Text style={styles.statValue}>{drill.default_duration_min || 10}m</Text>
                <Text style={styles.statLabel}>Duration</Text>
            </View>
            <View style={styles.statCard}>
                <Target size={20} color={COLORS.primary} />
                <Text style={styles.statValue}>
                    {drill.target_value ? `${drill.target_value}` : '-'}
                </Text>
                <Text style={styles.statLabel}>{drill.target_prompt || 'No Target'}</Text>
            </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
            <Text style={styles.sectionHeader}>Instructions</Text>
            <Text style={styles.description}>
                {drill.description || "No description provided for this drill."}
            </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24, backgroundColor: '#FFF' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  backBtn: { padding: 4 },
  editBtn: { padding: 4 },
  
  content: { paddingBottom: 40 },
  titleSection: { padding: 24, paddingTop: 0, backgroundColor: '#FFF', paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  badges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#64748B' },

  videoContainer: { padding: 24 },
  videoPlaceholder: { width: '100%', height: 200, backgroundColor: '#E2E8F0', borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 12 },
  videoText: { fontSize: 14, fontWeight: '600', color: '#64748B' },

  statsGrid: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: '#FFF', padding: 16, borderRadius: 16, alignItems: 'center', ...SHADOWS.small },
  statValue: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginTop: 8, marginBottom: 2 },
  statLabel: { fontSize: 12, color: '#64748B', textAlign: 'center' },

  section: { paddingHorizontal: 24 },
  sectionHeader: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  description: { fontSize: 16, color: '#334155', lineHeight: 24 },
});