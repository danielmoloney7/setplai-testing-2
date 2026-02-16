import React, { useState, useRef } from 'react';
import { 
  View, Text, TextInput, StyleSheet, Alert, SafeAreaView, 
  KeyboardAvoidingView, Platform, ScrollView 
} from 'react-native';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Button from '../components/Button'; 
import { COLORS, SHADOWS } from '../constants/theme';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // ✅ Scroll Refs
  const scrollRef = useRef(null);
  const inputCoords = useRef({});
  const passwordRef = useRef(null); // ✅ Ref Created

  const scrollToInput = (fieldKey) => {
    const y = inputCoords.current[fieldKey];
    if (y !== undefined && scrollRef.current) {
      scrollRef.current.scrollTo({ y: y, animated: true });
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', email.toLowerCase()); 
      formData.append('password', password);

      const response = await api.post('/auth/token', formData.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const { access_token, role, name } = response.data;
      const rawRole = role || (email.toLowerCase().includes('coach') ? 'COACH' : 'PLAYER');
      const normalizedRole = rawRole.toUpperCase(); 

      await AsyncStorage.setItem('access_token', access_token);
      await AsyncStorage.setItem('user_role', normalizedRole); 
      await AsyncStorage.setItem('user_name', name || email.split('@')[0]);
      
      navigation.replace('Main'); 

    } catch (error) {
      Alert.alert("Login Failed", "Please check your email and password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.content}
      >
        <ScrollView 
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logoText}>setplai</Text>
            <Text style={styles.subtitle}>Coach & Player Login</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            
            <View 
              style={styles.inputGroup} 
              onLayout={(e) => inputCoords.current['email'] = e.nativeEvent.layout.y}
            >
              <Text style={styles.label}>Email</Text>
              <TextInput 
                style={styles.input} 
                placeholder="coach@gmail.com"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                onFocus={() => scrollToInput('email')}
                returnKeyType="next" 
                // ✅ When "Next" is pressed, jump to passwordRef
                onSubmitEditing={() => passwordRef.current?.focus()} 
                blurOnSubmit={false}
              />
            </View>

            <View 
              style={styles.inputGroup}
              onLayout={(e) => inputCoords.current['password'] = e.nativeEvent.layout.y}
            >
              <Text style={styles.label}>Password</Text>
              <TextInput 
                ref={passwordRef} // ✅ FIX: Attach the Ref here!
                style={styles.input} 
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                onFocus={() => scrollToInput('password')}
                returnKeyType="done" 
                onSubmitEditing={handleLogin} 
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

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 150 }, 
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