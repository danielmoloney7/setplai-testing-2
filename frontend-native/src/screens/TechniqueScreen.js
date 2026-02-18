import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Play, Video, History, ArrowRight } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { fetchProLibrary } from '../services/api';
import api from '../services/api'; // To get Base URL

export default function TechniqueScreen({ navigation }) {
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper to construct full video URL
  const getFullUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    
    // Ensure there is exactly one slash between the base and the path
    const baseUrl = api.defaults.baseURL.replace('/api/v1', '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    
    return `${baseUrl}${cleanPath}`; 
};

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await fetchProLibrary();
      setLibrary(data);
    } catch (e) {
      console.log("Error loading library", e);
    } finally {
      setLoading(false);
    }
  };

  const renderProCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('VideoCompare', { 
          proVideo: { ...item, video_url: getFullUrl(item.video_url) } 
      })}
    >
      <View style={styles.thumbnailBox}>
        <Play size={32} color="#FFF" />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.player_name}</Text>
        <Text style={styles.cardSub}>{item.shot_type}</Text>
        <View style={styles.tagRow}>
          {item.tags.split(',').map(tag => (
            <View key={tag} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>
          ))}
        </View>
      </View>
      <ArrowRight size={20} color="#94A3B8" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Technique Lab</Text>
      </View>

      {loading ? <ActivityIndicator color={COLORS.primary} style={{marginTop: 50}}/> : (
        <FlatList
          data={library}
          renderItem={renderProCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No pro videos found.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 24, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  list: { paddingHorizontal: 24 },
  card: { flexDirection: 'row', backgroundColor: '#FFF', padding: 12, borderRadius: 16, marginBottom: 12, alignItems: 'center', ...SHADOWS.small },
  thumbnailBox: { width: 80, height: 80, backgroundColor: '#1E293B', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  cardSub: { fontSize: 14, color: COLORS.primary, fontWeight: '600', marginBottom: 6 },
  tagRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tag: { backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagText: { fontSize: 10, color: '#64748B', fontWeight: '600' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#94A3B8' }
});