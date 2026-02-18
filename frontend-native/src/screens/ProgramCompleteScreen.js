import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trophy, Clock, Dumbbell, Zap, ArrowRight, Home } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { Confetti } from '../components/Confetti'; // Optional: If you have one, otherwise remove

const { width } = Dimensions.get('window');

export default function ProgramCompleteScreen({ navigation, route }) {
  const { program } = route.params || {};
  
  // Animation Values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Calculate Stats (Fallbacks provided)
  const totalSessions = program?.schedule?.length || program?.sessions?.length || 0;
  const totalMinutes = program?.schedule?.reduce((acc, curr) => acc + (parseInt(curr.duration_minutes || curr.duration || 0)), 0) || 0;
  const xpEarned = totalMinutes * 10; // Simple XP calc

  useEffect(() => {
    // Sequence: Pop Trophy -> Fade Text -> Slide Stats
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          useNativeDriver: true,
        })
      ])
    ]).start();
  }, []);

  const handleCreateNew = () => {
    // Navigate to Program Builder with a "Level Up" context if needed
    navigation.navigate('ProgramBuilder', { squadMode: false });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        {/* 1. Celebration Header */}
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.trophyCircle}>
            <Trophy size={64} color="#FBBF24" fill="#FBBF24" />
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
          <Text style={styles.title}>Program Complete!</Text>
          <Text style={styles.subtitle}>You crushed "{program?.title || 'Training Plan'}".</Text>
        </Animated.View>

        {/* 2. Stats Grid */}
        <Animated.View style={[styles.statsCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.statItem}>
            <Dumbbell size={24} color={COLORS.primary} />
            <Text style={styles.statValue}>{totalSessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Clock size={24} color={COLORS.primary} />
            <Text style={styles.statValue}>{Math.round(totalMinutes / 60)}h {totalMinutes % 60}m</Text>
            <Text style={styles.statLabel}>Training Time</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Zap size={24} color="#D97706" />
            <Text style={styles.statValue}>+{xpEarned}</Text>
            <Text style={styles.statLabel}>XP Gained</Text>
          </View>
        </Animated.View>

        {/* 3. Enticing Call to Action */}
        <Animated.View style={[styles.ctaContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.ctaText}>Ready for the next level?</Text>
          
          <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateNew}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
              <Zap size={20} color="#FFF" fill="#FFF"/>
              <Text style={styles.primaryBtnText}>Build Next Program</Text>
            </View>
            <ArrowRight size={20} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('Main')}>
            <Home size={18} color="#64748B" />
            <Text style={styles.secondaryBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </Animated.View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  
  // Icon
  iconContainer: { marginBottom: 24 },
  trophyCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#FFFBEB',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: '#FCD34D',
    ...SHADOWS.medium,
  },

  // Text
  title: { fontSize: 32, fontWeight: '800', color: '#0F172A', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#64748B', marginBottom: 40, textAlign: 'center', paddingHorizontal: 20 },

  // Stats Card
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOWS.medium,
    marginBottom: 48,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginTop: 8, marginBottom: 2 },
  statLabel: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  divider: { width: 1, height: 40, backgroundColor: '#E2E8F0' },

  // CTA
  ctaContainer: { width: '100%', alignItems: 'center' },
  ctaText: { fontSize: 14, fontWeight: '600', color: '#64748B', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  
  primaryBtn: {
    backgroundColor: COLORS.primary,
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    ...SHADOWS.medium,
    marginBottom: 16,
  },
  primaryBtnText: { color: '#FFF', fontSize: 18, fontWeight: '800' },

  secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  secondaryBtnText: { color: '#64748B', fontSize: 15, fontWeight: '600' },
});