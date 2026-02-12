import React, { useState } from 'react';
import { 
  View, Text, TextInput, StyleSheet, Alert, SafeAreaView, 
  KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { registerUser } from '../services/api';
import { COLORS, SHADOWS } from '../constants/theme';
import { Check, ChevronLeft } from 'lucide-react-native'; // ✅ Added ChevronLeft

const LEVELS = ["Beginner", "Intermediate", "Advanced"];

export default function RegisterScreen({ navigation }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'PLAYER',
    age: '',
    yearsExperience: '',
    level: 'Beginner',
    goals: ''
  });
  
  const [loading, setLoading] = useState(false);

  const updateField = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  const handleRegisterAndLogin = async () => {
    if (!formData.email || !formData.password) {
      return Alert.alert("Required", "Email and Password are required.");
    }

    setLoading(true);
    try {
      // 1. Register
      await registerUser(formData);

      // 2. Auto-Login
      const loginFormData = new URLSearchParams();
      loginFormData.append('username', formData.email.toLowerCase()); 
      loginFormData.append('password', formData.password);

      const loginRes = await api.post('/auth/token', loginFormData.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const { access_token, role, name } = loginRes.data;
      
      // 3. Save Session
      const normalizedRole = role || (formData.role === 'COACH' ? 'COACH' : 'PLAYER');
      await AsyncStorage.setItem('access_token', access_token);
      await AsyncStorage.setItem('user_role', normalizedRole.toUpperCase()); 
      await AsyncStorage.setItem('user_name', name || formData.email.split('@')[0]);

      // 4. Navigate
      navigation.replace('Main');

    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.detail || "Registration failed.";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
        
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={28} color={COLORS.primary} />
          </TouchableOpacity>
          <View style={{alignItems: 'center'}}>
            <Text style={styles.logoText}>setplai</Text>
            <Text style={styles.subtitle}>Create your account</Text>
          </View>
          <View style={{width: 28}} /> 
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Role Selector */}
          <View style={styles.roleContainer}>
            {['PLAYER', 'COACH'].map((r) => (
              <TouchableOpacity 
                key={r} 
                style={[styles.roleBtn, formData.role === r && styles.roleBtnActive]} 
                onPress={() => updateField('role', r)}
              >
                <Text style={[styles.roleText, formData.role === r && styles.roleTextActive]}>{r}</Text>
                {formData.role === r && <Check size={16} color="#FFF" />}
              </TouchableOpacity>
            ))}
          </View>

          {/* Credentials */}
          <Text style={styles.label}>Credentials</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Email" 
            placeholderTextColor="#94A3B8"
            value={formData.email} 
            onChangeText={t => updateField('email', t)} 
            autoCapitalize="none" 
            keyboardType="email-address"
          />
          <TextInput 
            style={styles.input} 
            placeholder="Password" 
            placeholderTextColor="#94A3B8"
            value={formData.password} 
            onChangeText={t => updateField('password', t)} 
            secureTextEntry 
          />

          {/* Profile Details (Only for Players mostly, but useful for coaches too) */}
          <Text style={styles.label}>Profile</Text>
          <View style={styles.row}>
              <TextInput 
                style={[styles.input, { flex: 1 }]} 
                placeholder="Age" 
                placeholderTextColor="#94A3B8"
                value={formData.age} 
                onChangeText={t => updateField('age', t)} 
                keyboardType="numeric"
              />
              <TextInput 
                style={[styles.input, { flex: 1 }]} 
                placeholder="Yrs Exp." 
                placeholderTextColor="#94A3B8"
                value={formData.yearsExperience} 
                onChangeText={t => updateField('yearsExperience', t)} 
                keyboardType="numeric"
              />
          </View>

          {/* Level Selector */}
          <View style={styles.levelRow}>
              {LEVELS.map(l => (
                  <TouchableOpacity 
                    key={l} 
                    style={[styles.levelChip, formData.level === l && styles.levelChipActive]}
                    onPress={() => updateField('level', l)}
                  >
                      <Text style={[styles.levelText, formData.level === l && styles.levelTextActive]}>{l}</Text>
                  </TouchableOpacity>
              ))}
          </View>

          {/* Goals Input */}
          <Text style={styles.label}>Goals</Text>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            placeholder="What is your main goal? (e.g. Better Serve)" 
            placeholderTextColor="#94A3B8"
            value={formData.goals} 
            onChangeText={t => updateField('goals', t)} 
            multiline
          />

          <TouchableOpacity 
            style={[styles.mainBtn, loading && { opacity: 0.7 }]} 
            onPress={handleRegisterAndLogin}
            disabled={loading}
          >
              <Text style={styles.mainBtnText}>{loading ? "Creating..." : "Create Account"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
             <Text style={styles.loginText}>
               Already have an account? <Text style={{color: COLORS.primary, fontWeight: '700'}}>Log In</Text>
             </Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginTop: 10, marginBottom: 20 },
  backBtn: { padding: 8, marginLeft: -8 },
  logoText: { fontSize: 24, fontWeight: '800', color: COLORS.primary, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#64748B' },
  
  scrollContent: { padding: 24, paddingTop: 0 },
  
  label: { fontSize: 12, fontWeight: '700', color: '#94A3B8', marginBottom: 8, marginTop: 16, textTransform: 'uppercase' },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, fontSize: 16, color: '#0F172A', marginBottom: 12 },
  textArea: { height: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },

  roleContainer: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  roleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFF' },
  roleBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  roleText: { fontWeight: '700', color: '#64748B' },
  roleTextActive: { color: '#FFF' },

  levelRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  levelChip: { flex: 1, alignItems: 'center', padding: 10, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#F1F5F9' },
  levelChipActive: { backgroundColor: '#F0FDF4', borderColor: COLORS.primary },
  levelText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  levelTextActive: { color: COLORS.primary },

  mainBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24, ...SHADOWS.medium },
  mainBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  loginLink: { alignItems: 'center', marginTop: 24, marginBottom: 40 },
  loginText: { color: '#64748B', fontSize: 14 }
});