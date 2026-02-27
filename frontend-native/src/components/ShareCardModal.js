import React, { useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, Platform } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { X, Share2, Activity, Clock, Trophy, Quote } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import api from '../services/api';

export default function ShareCardModal({ visible, onClose, sessionLog }) {
  const viewShotRef = useRef(null);

  const getFullImageUrl = (path) => {
      if (!path) return null;
      if (path.startsWith('http')) return path;
      const baseUrl = api.defaults.baseURL.replace('/api/v1', '');
      return `${baseUrl}${path}`;
  };

  const handleShare = async () => {
    try {
      // 1. Take a snapshot of the ViewShot area
      const uri = await viewShotRef.current.capture();
      
      // 2. Fallback for Web testing
      if (Platform.OS === 'web') {
          window.open(uri, '_blank');
          return;
      }

      // 3. Open Native Share Dialog (Instagram, Messages, etc)
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
            mimeType: 'image/jpeg',
            dialogTitle: 'Share your Session!',
            UTI: 'public.jpeg'
        });
      } else {
        alert("Sharing is not available on this device");
      }
    } catch (error) {
      console.error("Snapshot failed", error);
    }
  };

  if (!sessionLog) return null;

  const dateObj = new Date(sessionLog.date_completed || sessionLog.created_at || Date.now());
  const date = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  
  // Safe Fallbacks
  const programName = sessionLog.program_title || sessionLog.program?.title || "Training Session";
  const sessionName = sessionLog.title || (sessionLog.session_id ? `Day ${sessionLog.session_id}` : "Workout");
  const playerNote = sessionLog.notes || null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
            
            <View style={styles.header}>
                <Text style={styles.title}>Share to Socials</Text>
                <TouchableOpacity onPress={onClose}><X size={24} color="#64748B" /></TouchableOpacity>
            </View>

            {/* 🔥 Everything inside ViewShot is what gets exported to the Image */}
            <ViewShot ref={viewShotRef} options={{ format: "jpg", quality: 0.9 }} style={styles.captureArea}>
                <View style={styles.card}>
                    
                    {/* Background Image or Solid Color */}
                    {sessionLog.photo_url ? (
                        <Image source={{ uri: getFullImageUrl(sessionLog.photo_url) }} style={styles.cardBg} />
                    ) : (
                        <View style={[styles.cardBg, { backgroundColor: COLORS.primary }]} />
                    )}

                    {/* Dark Gradient/Overlay for Text Visibility */}
                    <View style={styles.darkOverlay} />

                    <View style={styles.cardContent}>
                        <View style={styles.topRow}>
                            <View style={styles.badge}>
                                <Trophy size={14} color="#FFF" style={{marginRight: 6}} />
                                <Text style={styles.badgeText}>{sessionName.toUpperCase()}</Text>
                            </View>
                        </View>

                        <View style={styles.bottomBlock}>
                            <Text style={styles.programTitle} numberOfLines={2}>
                                {programName}
                            </Text>
                            <Text style={styles.athleteName}>
                                {sessionLog.player_name || "Athlete"} • {date}
                            </Text>

                            {/* Player Comment / Quote */}
                            {playerNote && (
                                <View style={styles.quoteBox}>
                                    <Quote size={14} color="rgba(255,255,255,0.6)" style={{marginRight: 8, marginTop: 2}} />
                                    <Text style={styles.quoteText} numberOfLines={3}>"{playerNote}"</Text>
                                </View>
                            )}

                            <View style={styles.statsRow}>
                                <View style={styles.statBox}>
                                    <Clock size={18} color="#FFF" style={{marginBottom: 6}}/>
                                    <Text style={styles.statVal}>{sessionLog.duration_minutes || 0}m</Text>
                                    <Text style={styles.statLabel}>Duration</Text>
                                </View>
                                <View style={styles.statBox}>
                                    <Activity size={18} color="#FFF" style={{marginBottom: 6}}/>
                                    <Text style={styles.statVal}>{sessionLog.rpe || '-'}/10</Text>
                                    <Text style={styles.statLabel}>Intensity</Text>
                                </View>
                            </View>
                            
                            <View style={styles.watermark}>
                                <Text style={styles.watermarkText}>setplai</Text>
                                <Text style={styles.watermarkSub}>Available on the App Store</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ViewShot>

            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                <Share2 size={20} color="#FFF" />
                <Text style={styles.shareBtnText}>Share Image</Text>
            </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 24, padding: 24, ...SHADOWS.large },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  
  captureArea: { backgroundColor: '#000', borderRadius: 16, overflow: 'hidden', marginBottom: 24 },
  card: { width: '100%', aspectRatio: 3/4, position: 'relative', backgroundColor: '#000' },
  cardBg: { ...StyleSheet.absoluteFillObject, resizeMode: 'cover' },
  darkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  
  cardContent: { flex: 1, padding: 24, justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 1 },

  bottomBlock: { width: '100%' },
  programTitle: { color: '#FFF', fontSize: 30, fontWeight: '900', letterSpacing: -1, marginBottom: 8, lineHeight: 34 },
  athleteName: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '600', marginBottom: 20 },
  
  quoteBox: { flexDirection: 'row', marginBottom: 24, paddingRight: 20 },
  quoteText: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontStyle: 'italic', fontWeight: '500', lineHeight: 20, flex: 1 },

  statsRow: { flexDirection: 'row', gap: 32, marginBottom: 32 },
  statBox: { alignItems: 'flex-start' },
  statVal: { color: '#FFF', fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  statLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },

  watermark: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  watermarkText: { color: 'rgba(255,255,255,0.9)', fontSize: 20, fontWeight: '900', letterSpacing: -1 },
  watermarkSub: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '600' },

  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: COLORS.primary, padding: 18, borderRadius: 16 },
  shareBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' }
});