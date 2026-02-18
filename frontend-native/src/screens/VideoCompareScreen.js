import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av'; // Using Expo AV for compatibility
import * as ImagePicker from 'expo-image-picker';
import { Play, Pause, Lock, Unlock, Upload, ChevronLeft, Save } from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import { uploadUserVideo, saveComparison } from '../services/api';
import api from '../services/api';

export default function VideoCompareScreen({ navigation, route }) {
  const { proVideo } = route.params;
  const [userVideoUri, setUserVideoUri] = useState(null);
  const [userVideoId, setUserVideoId] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLinked, setIsLinked] = useState(true);

  const proPlayer = useRef(null);
  const userPlayer = useRef(null);

  const handleUpload = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setUserVideoUri(uri);
      
      // Upload to backend
      setUploading(true);
      try {
          const res = await uploadUserVideo(uri);
          setUserVideoId(res.id); // Save ID for comparison
          Alert.alert("Success", "Video uploaded to cloud.");
      } catch (e) {
          Alert.alert("Error", "Failed to upload video.");
      } finally {
          setUploading(false);
      }
    }
  };

  const togglePlay = async () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    
    if (nextState) {
        proPlayer.current?.playAsync();
        if (isLinked) userPlayer.current?.playAsync();
    } else {
        proPlayer.current?.pauseAsync();
        if (isLinked) userPlayer.current?.pauseAsync();
    }
  };

  const handleSave = async () => {
      if (!userVideoId) return Alert.alert("Error", "Upload a video first.");
      try {
          await saveComparison({
              pro_video_id: proVideo.id,
              user_video_id: userVideoId,
              pro_offset_sec: 0, // Placeholder: Hook up to slider values in Phase 2
              user_offset_sec: 0
          });
          Alert.alert("Saved", "Comparison saved to your history.");
          navigation.goBack();
      } catch (e) {
          Alert.alert("Error", "Could not save.");
      }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.headerOverlay}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <ChevronLeft color="#FFF" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{proVideo.player_name} vs You</Text>
        <TouchableOpacity onPress={handleSave} style={[styles.iconBtn, {backgroundColor: COLORS.primary}]}>
            <Save color="#FFF" size={20} />
        </TouchableOpacity>
      </SafeAreaView>

      <View style={styles.videoContainer}>
        {/* Pro Video */}
        <View style={styles.videoFrame}>
            <Video
                ref={proPlayer}
                source={{ uri: proVideo.video_url }}
                style={styles.video}
                resizeMode={ResizeMode.CONTAIN}
                isLooping
                shouldPlay={isPlaying}
            />
            <View style={styles.labelBadge}><Text style={styles.labelText}>PRO</Text></View>
        </View>

        {/* Controls Bar */}
        <View style={styles.dividerBar}>
            <TouchableOpacity onPress={() => setIsLinked(!isLinked)} style={styles.syncBtn}>
                {isLinked ? <Lock size={16} color="#0F172A" /> : <Unlock size={16} color="#64748B" />}
                <Text style={styles.syncText}>{isLinked ? 'SYNC LOCKED' : 'UNLINKED'}</Text>
            </TouchableOpacity>
        </View>

        {/* User Video */}
        <View style={styles.videoFrame}>
            {userVideoUri ? (
                <Video
                    ref={userPlayer}
                    source={{ uri: userVideoUri }}
                    style={styles.video}
                    resizeMode={ResizeMode.CONTAIN}
                    isLooping
                    shouldPlay={isLinked && isPlaying}
                />
            ) : (
                <View style={styles.uploadPlaceholder}>
                    {uploading ? <ActivityIndicator color="#FFF" /> : (
                        <TouchableOpacity style={styles.uploadBtn} onPress={handleUpload}>
                            <Upload size={32} color="#FFF" />
                            <Text style={styles.uploadText}>Upload Video</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
            <View style={[styles.labelBadge, {bottom: 10, top: undefined}]}><Text style={styles.labelText}>YOU</Text></View>
        </View>
      </View>

      {/* Play Controls */}
      <View style={styles.controls}>
          <TouchableOpacity onPress={togglePlay} style={styles.playBtn}>
              {isPlaying ? <Pause size={32} color="#FFF" fill="#FFF"/> : <Play size={32} color="#FFF" fill="#FFF"/>}
          </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  headerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  headerTitle: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  
  videoContainer: { flex: 1, paddingTop: 80, paddingBottom: 100 },
  videoFrame: { flex: 1, backgroundColor: '#1E293B', justifyContent: 'center' },
  video: { width: '100%', height: '100%' },
  
  dividerBar: { height: 40, backgroundColor: '#0F172A', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  syncBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  syncText: { fontSize: 10, fontWeight: '700' },

  labelBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.6)', padding: 4, borderRadius: 4 },
  labelText: { color: '#FFF', fontSize: 10, fontWeight: '800' },

  uploadPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  uploadBtn: { alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.1)', padding: 24, borderRadius: 16 },
  uploadText: { color: '#FFF', fontWeight: '600' },

  controls: { position: 'absolute', bottom: 30, width: '100%', alignItems: 'center' },
  playBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }
});