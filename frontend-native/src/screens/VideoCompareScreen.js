import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Play, Pause, FastForward, Save, X, RotateCcw } from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import { saveAnalysis } from '../services/api';

const { width } = Dimensions.get('window');

export default function VideoCompareScreen({ route, navigation }) {
  const { videos } = route.params; // Array of 1 or 2 videos
  
  const videoRef1 = useRef(null);
  const videoRef2 = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [syncMode, setSyncMode] = useState(true);

  // Helper to toggle play/pause for both
  const togglePlay = async () => {
    if (isPlaying) {
      await videoRef1.current?.pauseAsync();
      if (videos[1]) await videoRef2.current?.pauseAsync();
    } else {
      await videoRef1.current?.playAsync();
      if (videos[1]) await videoRef2.current?.playAsync();
    }
    setIsPlaying(!isPlaying);
  };

  // Helper to change speed
  const changeSpeed = async () => {
    const newSpeed = speed === 1.0 ? 0.5 : (speed === 0.5 ? 0.25 : 1.0);
    setSpeed(newSpeed);
    await videoRef1.current?.setRateAsync(newSpeed, true);
    if (videos[1]) await videoRef2.current?.setRateAsync(newSpeed, true);
  };

  // Save Analysis
  const handleSave = async () => {
      Alert.prompt("Save Analysis", "Add notes to this comparison:", async (notes) => {
          if (notes) {
              try {
                  await saveAnalysis(videos[0].url, videos[1]?.url || "", notes);
                  Alert.alert("Saved", "Analysis saved to your library.");
              } catch(e) {
                  Alert.alert("Error", "Could not save.");
              }
          }
      });
  };

  const renderSinglePlayer = (video, ref, index) => (
      <View style={[styles.playerContainer, videos.length === 2 && styles.halfHeight]}>
          <Video
            ref={ref}
            style={styles.video}
            source={{ uri: video.url }}
            resizeMode={ResizeMode.CONTAIN}
            isLooping
            shouldPlay={false}
          />
          <View style={styles.labelBadge}>
              <Text style={styles.labelText}>{index === 0 ? "Video A" : "Video B"}</Text>
          </View>
      </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><X size={24} color="#FFF" /></TouchableOpacity>
          <Text style={styles.headerTitle}>Comparison Mode</Text>
          <TouchableOpacity onPress={handleSave}><Save size={24} color={COLORS.primary} /></TouchableOpacity>
      </View>

      {/* Video Area */}
      <View style={styles.content}>
          {renderSinglePlayer(videos[0], videoRef1, 0)}
          {videos[1] && renderSinglePlayer(videos[1], videoRef2, 1)}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
          <TouchableOpacity onPress={changeSpeed} style={styles.ctrlBtn}>
              <Text style={styles.speedText}>{speed}x</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={togglePlay} style={styles.playBtn}>
              {isPlaying ? <Pause size={32} color="#000" fill="#000" /> : <Play size={32} color="#000" fill="#000" />}
          </TouchableOpacity>

          <TouchableOpacity 
             onPress={async () => {
                 await videoRef1.current?.replayAsync();
                 if (videos[1]) await videoRef2.current?.replayAsync();
                 setIsPlaying(true);
             }} 
             style={styles.ctrlBtn}
          >
              <RotateCcw size={24} color="#FFF" />
          </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, zIndex: 10 },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  
  content: { flex: 1, justifyContent: 'center' },
  playerContainer: { flex: 1, justifyContent: 'center', backgroundColor: '#111', borderWidth: 1, borderColor: '#333' },
  halfHeight: { flex: 0.5 }, // Split screen logic
  video: { width: '100%', height: '100%' },
  
  labelBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 4 },
  labelText: { color: '#FFF', fontSize: 10, fontWeight: '700' },

  controls: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', paddingVertical: 20, backgroundColor: '#000' },
  playBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  ctrlBtn: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  speedText: { color: '#FFF', fontWeight: '800', fontSize: 16 }
});