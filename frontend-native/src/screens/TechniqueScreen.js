import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Play, Video, Upload, CheckCircle, Search, ArrowRight, Plus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SHADOWS } from '../constants/theme';
import { fetchProLibrary, fetchUserVideos, uploadUserVideo } from '../services/api';
import api from '../services/api';

export default function TechniqueScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('pro'); // 'pro' | 'my'
  const [proVideos, setProVideos] = useState([]);
  const [myVideos, setMyVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Selection Mode
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedVideos, setSelectedVideos] = useState([]); // Max 2

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pro, my] = await Promise.all([fetchProLibrary(), fetchUserVideos()]);
      setProVideos(pro);
      setMyVideos(my);
    } catch (e) {
      console.log("Error loading videos", e);
    } finally {
      setLoading(false);
    }
  };

  const getFullUrl = (path) => {
      if (!path) return null;
      if (path.startsWith('http')) return path;
      const baseUrl = api.defaults.baseURL.replace('/api/v1', '');
      return `${baseUrl}${path}`; 
  };

  const handlePickVideo = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      // Simple prompt for title (In real app, use a modal)
      Alert.prompt("Video Title", "Name your upload", async (text) => {
          if (text) {
             setLoading(true);
             try {
                await uploadUserVideo(uri, text);
                loadData(); // Refresh
                Alert.alert("Success", "Video uploaded!");
             } catch(e) {
                Alert.alert("Error", "Upload failed");
             } finally {
                setLoading(false);
             }
          }
      });
    }
  };

  const toggleSelection = (video) => {
      if (selectedVideos.find(v => v.id === video.id)) {
          setSelectedVideos(prev => prev.filter(v => v.id !== video.id));
      } else {
          if (selectedVideos.length >= 2) {
              Alert.alert("Limit Reached", "You can only compare 2 videos.");
              return;
          }
          setSelectedVideos(prev => [...prev, { ...video, url: getFullUrl(video.url) }]);
      }
  };

  const renderVideoCard = ({ item }) => {
      const isSelected = selectedVideos.find(v => v.id === item.id);
      
      return (
        <TouchableOpacity 
          style={[styles.card, isSelected && styles.selectedCard]}
          onPress={() => {
              if (selectionMode) toggleSelection(item);
              else navigation.navigate('VideoCompare', { videos: [{ ...item, url: getFullUrl(item.url) }] }); 
          }}
          onLongPress={() => {
              setSelectionMode(true);
              toggleSelection(item);
          }}
        >
          <View style={styles.thumbnailBox}>
            <Play size={24} color="#FFF" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSub}>{item.type === 'pro' ? 'Pro Technique' : 'My Upload'}</Text>
          </View>
          {isSelected ? <CheckCircle size={24} color={COLORS.primary} fill="#E0F2FE" /> : <ArrowRight size={20} color="#CBD5E1" />}
        </TouchableOpacity>
      );
  };

  const startComparison = () => {
      if (selectedVideos.length < 2) return;
      navigation.navigate('VideoCompare', { videos: selectedVideos });
      setSelectionMode(false);
      setSelectedVideos([]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Technique Lab</Text>
        <TouchableOpacity onPress={handlePickVideo} style={styles.uploadBtn}>
            <Upload size={20} color="#FFF" />
            <Text style={styles.uploadText}>Upload</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
          <TouchableOpacity onPress={() => setActiveTab('pro')} style={[styles.tab, activeTab === 'pro' && styles.activeTab]}>
              <Text style={[styles.tabText, activeTab === 'pro' && styles.activeTabText]}>Pro Library</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('my')} style={[styles.tab, activeTab === 'my' && styles.activeTab]}>
              <Text style={[styles.tabText, activeTab === 'my' && styles.activeTabText]}>My Videos</Text>
          </TouchableOpacity>
      </View>

      {/* Action Bar (When selecting) */}
      {selectionMode && (
          <View style={styles.actionBar}>
              <Text style={styles.actionText}>{selectedVideos.length} selected</Text>
              <View style={{flexDirection: 'row', gap: 10}}>
                  <TouchableOpacity onPress={() => {setSelectionMode(false); setSelectedVideos([]);}} style={styles.cancelBtn}>
                      <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={startComparison} 
                    style={[styles.compareBtn, selectedVideos.length < 2 && {opacity: 0.5}]}
                    disabled={selectedVideos.length < 2}
                  >
                      <Text style={styles.compareText}>Compare</Text>
                  </TouchableOpacity>
              </View>
          </View>
      )}

      {/* List */}
      {loading ? <ActivityIndicator style={{marginTop: 50}} color={COLORS.primary} /> : (
          <FlatList 
            data={activeTab === 'pro' ? proVideos : myVideos}
            renderItem={renderVideoCard}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>No videos found.</Text>}
          />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#FFF' },
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 6 },
  uploadText: { color: '#FFF', fontWeight: '600', fontSize: 13 },
  
  tabs: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 10 },
  tab: { marginRight: 20, paddingBottom: 10 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 15, color: '#64748B', fontWeight: '600' },
  activeTabText: { color: COLORS.primary },

  list: { padding: 20 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 12, marginBottom: 12, ...SHADOWS.small },
  selectedCard: { borderColor: COLORS.primary, borderWidth: 1, backgroundColor: '#F0F9FF' },
  thumbnailBox: { width: 60, height: 60, backgroundColor: '#1E293B', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  cardSub: { fontSize: 13, color: '#64748B' },
  
  actionBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#E2E8F0', marginHorizontal: 20, borderRadius: 12, marginBottom: 10 },
  actionText: { fontWeight: '700', color: '#334155' },
  compareBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  compareText: { color: '#FFF', fontWeight: '700' },
  cancelBtn: { paddingHorizontal: 10, paddingVertical: 8 },
  cancelText: { color: '#64748B' },
  empty: { textAlign: 'center', marginTop: 40, color: '#94A3B8' }
});