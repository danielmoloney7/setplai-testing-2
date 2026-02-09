import React, { useState, useEffect } from 'react';
import { 
  View, Text, Modal, StyleSheet, TextInput, ActivityIndicator, 
  TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform 
} from 'react-native';
import { Wand2, X, Clock, Trash2, Save, FileText } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { generateSquadSession } from '../services/geminiService';
import { fetchDrills } from '../services/api';

export default function EditSessionModal({ visible, onClose, session, onSave }) {
  // AI State
  const [players, setPlayers] = useState('4');
  const [courts, setCourts] = useState('1');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  // Manual Edit State
  const [editedItems, setEditedItems] = useState([]);

  // Load session items when modal opens
  useEffect(() => {
    if (session?.items) {
      setEditedItems(JSON.parse(JSON.stringify(session.items))); // Deep copy
    }
  }, [session]);

  // --- AI GENERATION ---
  const handleAiRegenerate = async () => {
    setLoading(true);
    try {
      const allDrills = await fetchDrills();
      const newItems = await generateSquadSession(
        prompt || `Adapt session "${session.title}" for this group size.`,
        allDrills,
        { players: parseInt(players), courts: parseInt(courts) }
      );
      
      if (newItems && newItems.length > 0) {
        setEditedItems(newItems); // Update local state instead of closing immediately
        Alert.alert("AI Updated", "Drills regenerated. Review and save changes.");
      } else {
        Alert.alert("AI Error", "Could not generate drills.");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to connect to AI.");
    } finally {
      setLoading(false);
    }
  };

  // --- MANUAL EDITING ---
  const updateItem = (index, field, value) => {
    const updated = [...editedItems];
    updated[index] = { ...updated[index], [field]: value };
    setEditedItems(updated);
  };

  const deleteItem = (index) => {
    const updated = editedItems.filter((_, i) => i !== index);
    setEditedItems(updated);
  };

  const handleSaveChanges = () => {
    // Save back to parent
    onSave({ ...session, items: editedItems });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
          <View style={styles.card}>
            
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Edit Session</Text>
                <Text style={styles.subtitle}>{session?.title}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={24} color="#64748B"/>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
              
              {/* 1. AI ADAPTATION SECTION */}
              <View style={styles.aiSection}>
                <Text style={styles.sectionTitle}>✨ AI Adaptation</Text>
                <View style={styles.row}>
                   <View style={styles.inputWrap}>
                      <Text style={styles.subLabel}>Players</Text>
                      <TextInput style={styles.input} value={players} onChangeText={setPlayers} keyboardType="numeric"/>
                   </View>
                   <View style={styles.inputWrap}>
                      <Text style={styles.subLabel}>Courts</Text>
                      <TextInput style={styles.input} value={courts} onChangeText={setCourts} keyboardType="numeric"/>
                   </View>
                </View>
                <TextInput 
                   style={[styles.input, {height: 60, marginTop: 8}]} 
                   multiline 
                   placeholder="Prompt: e.g. 'Focus on heavy spin'"
                   placeholderTextColor="#94A3B8"
                   value={prompt}
                   onChangeText={setPrompt}
                />
                <TouchableOpacity style={styles.aiBtn} onPress={handleAiRegenerate} disabled={loading}>
                   {loading ? <ActivityIndicator color="#FFF" size="small"/> : (
                       <>
                         <Wand2 size={16} color="#FFF" style={{marginRight: 6}}/>
                         <Text style={styles.aiBtnText}>Regenerate Drills</Text>
                       </>
                   )}
                </TouchableOpacity>
              </View>

              {/* 2. DRILL LIST EDITOR */}
              <Text style={[styles.sectionTitle, {marginTop: 24, marginBottom: 12}]}>📝 Drill List ({editedItems.length})</Text>
              
              {editedItems.map((item, index) => (
                <View key={index} style={styles.drillRow}>
                  {/* Drill Header */}
                  <View style={styles.drillHeader}>
                    <Text style={styles.drillIndex}>{index + 1}</Text>
                    <Text style={styles.drillName}>{item.drill_name || item.name || "Drill"}</Text>
                    <TouchableOpacity onPress={() => deleteItem(index)} style={styles.deleteBtn}>
                      <Trash2 size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>

                  {/* Edit Duration */}
                  <View style={styles.editRow}>
                    <Clock size={16} color="#64748B" />
                    <Text style={styles.fieldLabel}>Mins:</Text>
                    <TextInput 
                      style={styles.smallInput} 
                      value={String(item.duration || item.targetDurationMin || 0)} 
                      keyboardType="numeric"
                      onChangeText={(val) => updateItem(index, 'duration', parseInt(val) || 0)}
                    />
                  </View>

                  {/* Edit Notes */}
                  <View style={styles.notesContainer}>
                    <View style={{flexDirection:'row', alignItems:'center', marginBottom: 4}}>
                      <FileText size={14} color="#64748B" />
                      <Text style={styles.fieldLabel}> Notes:</Text>
                    </View>
                    <TextInput 
                      style={styles.notesInput} 
                      multiline 
                      placeholder="Add coaching notes..."
                      value={item.notes} 
                      onChangeText={(val) => updateItem(index, 'notes', val)}
                    />
                  </View>
                </View>
              ))}

              {editedItems.length === 0 && (
                <Text style={styles.emptyText}>No drills in this session.</Text>
              )}

            </ScrollView>

            {/* Footer Save Action */}
            <View style={styles.footer}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveChanges}>
                <Save size={20} color="#FFF" style={{marginRight: 8}}/>
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>

          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { flex: 1, justifyContent: 'flex-end' },
  card: { backgroundColor: '#F8FAFC', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '85%', ...SHADOWS.medium },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 14, color: '#64748B' },
  closeBtn: { padding: 4 },

  scrollContent: { padding: 24, paddingBottom: 100 },

  // AI Section
  aiSection: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#334155', marginBottom: 12, textTransform: 'uppercase' },
  row: { flexDirection: 'row', gap: 12 },
  inputWrap: { flex: 1 },
  subLabel: { fontSize: 11, color: '#64748B', marginBottom: 4, fontWeight: '600' },
  input: { backgroundColor: '#F1F5F9', borderRadius: 8, padding: 10, fontSize: 14, color: '#0F172A', borderWidth: 1, borderColor: '#E2E8F0' },
  aiBtn: { backgroundColor: '#7C3AED', marginTop: 12, padding: 12, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  aiBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  // List Editor
  drillRow: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.small },
  drillHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  drillIndex: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#E0F2FE', textAlign: 'center', textAlignVertical: 'center', fontSize: 12, fontWeight: '700', color: '#0284C7', marginRight: 10 },
  drillName: { flex: 1, fontSize: 16, fontWeight: '700', color: '#0F172A' },
  deleteBtn: { padding: 4 },

  editRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  fieldLabel: { fontSize: 13, color: '#64748B', fontWeight: '600', marginLeft: 6, marginRight: 8 },
  smallInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, width: 60, textAlign: 'center', fontWeight: '700' },

  notesContainer: { marginTop: 4 },
  notesInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 10, fontSize: 13, color: '#334155', minHeight: 60, textAlignVertical: 'top' },

  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 20, fontStyle: 'italic' },

  footer: { padding: 24, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  saveBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', ...SHADOWS.medium },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});