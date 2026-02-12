import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Button from '../components/Button'; 
import { COLORS, SHADOWS } from '../constants/theme';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    console.log("Login Button Pressed!");
    setLoading(true);
    try {
      console.log(`Attempting login to: ${api.defaults.baseURL}`);
      
      // 1. Prepare Form Data for OAuth2
      const formData = new URLSearchParams();
      formData.append('username', email.toLowerCase()); 
      formData.append('password', password);

      // 2. Call API
      const response = await api.post('/auth/token', formData.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      // 3. Extract Data
      const { access_token, role, name } = response.data;

      // --- FIX STARTS HERE ---
      // 4. Normalize Role (Handle missing role + force Uppercase)
      // If backend sends null, check email. If backend sends "coach", make it "COACH".
      const rawRole = role || (email.toLowerCase().includes('coach') ? 'COACH' : 'PLAYER');
      const normalizedRole = rawRole.toUpperCase(); 
      // --- FIX ENDS HERE ---

      // 5. Save Data
      await AsyncStorage.setItem('access_token', access_token);
      await AsyncStorage.setItem('user_role', normalizedRole); 
      await AsyncStorage.setItem('user_name', name || email.split('@')[0]);
      
      // 6. Navigate to Dashboard
      navigation.replace('Main'); 

    } catch (error) {
      console.log("Login Error:", error);
      Alert.alert("Login Failed", "Please check your email and password.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logoText}>setplai</Text>
          <Text style={styles.subtitle}>Coach & Player Login</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput 
              style={styles.input} 
              placeholder="coach@gmail.com"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput 
              style={styles.input} 
              placeholder="••••••••"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
          
          <View style={styles.spacer} />

          <Button 
            title="Log In" 
            onPress={handleLogin} 
            isLoading={loading} 
            fullWidth 
          />
          
          <View style={styles.divider}>
             <Text style={styles.dividerText}>OR</Text>
          </View>

          <Button 
            title="Create New Account" 
            variant="outline" 
            fullWidth 
            onPress={() => navigation.navigate('Register')} 
          />
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  logoText: { fontSize: 40, fontWeight: '800', color: COLORS.primary, letterSpacing: -1, marginBottom: 8 },
  subtitle: { fontSize: 16, color: COLORS.textMuted },
  form: { width: '100%', maxWidth: 400, alignSelf: 'center' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 16, fontSize: 16, color: COLORS.text, ...SHADOWS.card },
  spacer: { height: 10 },
  divider: { alignItems: 'center', marginVertical: 24 },
  dividerText: { color: COLORS.textMuted, fontSize: 12, fontWeight: 'bold' }
});