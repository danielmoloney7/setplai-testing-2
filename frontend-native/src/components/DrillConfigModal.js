import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { X, Save, Clock, FileText } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';

export default function DrillConfigModal({ isOpen, onClose, item, onSave }) {
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (item) {
      setDuration(String(item.duration || item.targetDurationMin || 10));
      setNotes(item.notes || '');
    }
  }, [item]);

  const handleSave = () => {
    onSave({ 
        ...item, 
        duration: parseInt(duration) || 10, 
        targetDurationMin: parseInt(duration) || 10, // Maintain legacy compat
        notes 
    });
  };

  if (!item) return null;

  return (
    <Modal visible={isOpen} transparent animationType="fade">
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardView}>
            <View style={styles.card}>
                <View style={styles.header}>
                    <Text style={styles.title}>Edit Drill</Text>
                    <TouchableOpacity onPress={onClose}><X size={24} color="#64748B" /></TouchableOpacity>
                </View>
                
                <Text style={styles.drillName}>{item.drill_name || item.name}</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Duration (Minutes)</Text>
                    <View style={styles.rowInput}>
                        <Clock size={20} color="#64748B" />
                        <TextInput 
                            style={styles.input} 
                            value={duration} 
                            onChangeText={setDuration}
                            keyboardType="numeric"
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Coaching Notes</Text>
                    <View style={[styles.rowInput, {alignItems: 'flex-start'}]}>
                        <FileText size={20} color="#64748B" style={{marginTop: 12}} />
                        <TextInput 
                            style={[styles.input, {height: 80, textAlignVertical: 'top'}]} 
                            value={notes} 
                            onChangeText={setNotes}
                            multiline
                            placeholder="Add specific instructions..."
                        />
                    </View>
                </View>

                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                    <Save size={20} color="#FFF" />
                    <Text style={styles.saveText}>Update Drill</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  keyboardView: { flex: 1, justifyContent: 'center' },
  card: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, ...SHADOWS.medium },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  drillName: { fontSize: 16, fontWeight: '600', color: COLORS.primary, marginBottom: 24 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 8, textTransform: 'uppercase' },
  rowInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12 },
  input: { flex: 1, padding: 12, fontSize: 16, color: '#0F172A' },
  saveBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 8 },
  saveText: { color: '#FFF', fontWeight: '700', fontSize: 16 }
});