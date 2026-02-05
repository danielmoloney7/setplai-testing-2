import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Check, Minus, Plus, Target } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { ASSESSMENT_DRILLS } from '../constants/data';

export default function AssessmentScreen({ navigation }) {
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState({});

  const currentDrill = ASSESSMENT_DRILLS[step];
  const totalSteps = ASSESSMENT_DRILLS.length;
  const currentScore = scores[currentDrill.id] || 0;

  const handleScoreChange = (delta) => {
    const newScore = Math.max(0, Math.min(currentScore + delta, currentDrill.target));
    setScores(prev => ({ ...prev, [currentDrill.id]: newScore }));
  };

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(prev => prev + 1);
    } else {
      finishAssessment();
    }
  };

  // ✅ FIXED: Navigate IMMEDIATELY, don't wait for Alert
  const finishAssessment = () => {
    let weakestCategory = '';
    let minPercent = 101;

    ASSESSMENT_DRILLS.forEach(d => {
        const score = scores[d.id] || 0;
        const percent = (score / d.target) * 100;
        if (percent < minPercent) {
            minPercent = percent;
            weakestCategory = d.category;
        }
    });

    const level = minPercent > 70 ? 'Advanced' : minPercent > 40 ? 'Intermediate' : 'Beginner';
    
    // 1. Redirect First
    navigation.navigate('ProgramBuilder', { 
        squadMode: false,
        // Pass these params to pre-fill the builder
        initialPrompt: `Create a 4-week program to improve my ${weakestCategory}. My calculated skill level is ${level}. Focus on consistency.`,
        autoStart: true // Flag to skip the "Choose Method" screen
    });

    // 2. Show Info AFTER redirect logic starts
    setTimeout(() => {
        Alert.alert("Assessment Analyzed", `Level: ${level}\nFocus Area: ${weakestCategory}`);
    }, 500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={24} color="#334155" />
        </TouchableOpacity>
        <Text style={styles.stepText}>Step {step + 1} of {totalSteps}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
            <Target size={40} color={COLORS.primary} />
        </View>
        
        <Text style={styles.title}>{currentDrill.name}</Text>
        <Text style={styles.desc}>{currentDrill.description}</Text>

        <View style={styles.card}>
            <Text style={styles.prompt}>{currentDrill.prompt}</Text>
            
            <View style={styles.counterRow}>
                <TouchableOpacity onPress={() => handleScoreChange(-1)} style={styles.counterBtn}>
                    <Minus size={24} color="#64748B" />
                </TouchableOpacity>
                
                <View style={styles.scoreDisplay}>
                    <Text style={styles.scoreText}>{currentScore}</Text>
                    <Text style={styles.targetText}>/ {currentDrill.target}</Text>
                </View>

                <TouchableOpacity onPress={() => handleScoreChange(1)} style={styles.counterBtn}>
                    <Plus size={24} color="#64748B" />
                </TouchableOpacity>
            </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextBtnText}>{step === totalSteps - 1 ? 'Finish Assessment' : 'Next Drill'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24 },
  stepText: { fontWeight: '700', color: '#94A3B8' },
  content: { padding: 24, alignItems: 'center' },
  iconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 8, textAlign: 'center' },
  desc: { fontSize: 16, color: '#64748B', textAlign: 'center', marginBottom: 32, lineHeight: 24 },
  card: { width: '100%', backgroundColor: '#FFF', padding: 24, borderRadius: 20, ...SHADOWS.medium },
  prompt: { fontSize: 14, fontWeight: '600', color: '#334155', textAlign: 'center', marginBottom: 24 },
  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  counterBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  scoreDisplay: { alignItems: 'center' },
  scoreText: { fontSize: 48, fontWeight: '800', color: COLORS.primary },
  targetText: { fontSize: 16, color: '#94A3B8', fontWeight: '600' },
  footer: { padding: 24 },
  nextBtn: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 16, alignItems: 'center', ...SHADOWS.small },
  nextBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 }
});