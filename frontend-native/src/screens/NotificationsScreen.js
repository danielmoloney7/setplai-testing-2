import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, Bell, Calendar, Users, Info, Trophy, MessageSquare } from 'lucide-react-native'; // ✅ Added Icons
import { COLORS, SHADOWS } from '../constants/theme';
import { fetchNotifications, markNotificationRead } from '../services/api';

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
        const data = await fetchNotifications();
        setNotifications(data);
    } catch (e) {
        console.error("Notif Error", e);
    } finally {
        setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const handlePress = async (item) => {
      if (!item.is_read) {
          markNotificationRead(item.id);
          setNotifications(prev => prev.map(n => n.id === item.id ? {...n, is_read: true} : n));
      }

      // ✅ Navigation Logic
      if (item.type === 'PROGRAM_INVITE') {
          navigation.navigate('Main', { screen: 'Plans' }); 
      } else if (item.type === 'SQUAD_INVITE') {
          navigation.navigate('SquadDetail', { squad: { id: item.reference_id, name: 'Squad Invite' } });
      } else if (['MATCH_LOG', 'MATCH_RESULT', 'MATCH_FEEDBACK', 'MATCH_TACTICS'].includes(item.type)) {
          // Open Match Diary
          navigation.navigate('MatchDiary'); 
      }
  };

  const getIcon = (type) => {
      switch(type) {
          case 'PROGRAM_INVITE': return <Calendar size={20} color={COLORS.primary} />;
          case 'SQUAD_INVITE': return <Users size={20} color="#E11D48" />;
          case 'MATCH_LOG': 
          case 'MATCH_RESULT': return <Trophy size={20} color="#D97706" />;
          case 'MATCH_FEEDBACK': 
          case 'MATCH_TACTICS': return <MessageSquare size={20} color="#2563EB" />;
          default: return <Info size={20} color="#64748B" />;
      }
  };

  const renderItem = ({ item }) => (
      <TouchableOpacity 
        style={[styles.card, !item.is_read && styles.unreadCard]} 
        onPress={() => handlePress(item)}
      >
          <View style={[styles.iconBox, !item.is_read && {backgroundColor: '#FFF'}]}>
              {getIcon(item.type)}
          </View>
          
          <View style={{flex: 1}}>
              <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                  <Text style={[styles.title, !item.is_read && styles.unreadText]}>{item.title}</Text>
                  <Text style={styles.time}>{new Date(item.created_at).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
          </View>
          
          {!item.is_read && <View style={styles.dot} />}
      </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{width: 24}} />
      </View>

      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
        ListEmptyComponent={
            <View style={styles.center}>
                <Bell size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>No new notifications</Text>
            </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  backBtn: { padding: 4 },
  list: { padding: 16 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 12 },
  unreadCard: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }, 
  iconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 2 },
  unreadText: { fontWeight: '800', color: '#0F172A' },
  message: { fontSize: 13, color: '#64748B', lineHeight: 18 },
  time: { fontSize: 10, color: '#94A3B8' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  center: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, color: '#94A3B8', fontSize: 14 }
});