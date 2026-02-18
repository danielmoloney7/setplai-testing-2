import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Bell, UserPlus, FileText, CheckCircle, AlertCircle, XCircle } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { fetchNotifications } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function NotificationScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const data = await fetchNotifications();
      setNotifications(data || []);
    } catch (e) {
      console.log("Error loading notifications:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handlePress = async (item) => {
    // 1. Identify Notification Type
    switch (item.type) {
        
        // ✅ CASE: Player requests to join Coach's team
        case 'COACH_REQUEST':
            navigation.navigate('Profile'); // Redirects to Profile to Accept/Reject
            break;

        // CASE: Coach assigns a program to Player
        case 'PROGRAM_INVITE':
        case 'PROGRAM_ASSIGNED':
            navigation.navigate('Main', { screen: 'Plans' });
            break;

        // CASE: Player leaves a program
        case 'PROGRAM_LEFT':
        case 'PROGRAM_REMOVED':
            // Stay here, or go to Dashboard
            break;

        // CASE: Coach Feedback on a session
        case 'SESSION_FEEDBACK':
            navigation.navigate('Main', { screen: 'History' });
            break;

        default:
            console.log("Unknown notification type:", item.type);
            break;
    }
  };

  const getIcon = (type) => {
    switch (type) {
        case 'COACH_REQUEST': return <UserPlus size={24} color={COLORS.primary} />;
        case 'PROGRAM_INVITE': return <FileText size={24} color="#0284C7" />;
        case 'PROGRAM_LEFT': return <XCircle size={24} color="#EF4444" />;
        case 'COACH_RESPONSE': return <CheckCircle size={24} color="#16A34A" />;
        default: return <Bell size={24} color="#64748B" />;
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
        style={[styles.card, !item.is_read && styles.unreadCard]} 
        onPress={() => handlePress(item)}
        activeOpacity={0.7}
    >
      <View style={styles.iconBox}>
        {getIcon(item.type)}
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.message}>{item.message}</Text>
        <Text style={styles.date}>{new Date(item.created_at).toDateString()}</Text>
      </View>
      {!item.is_read && <View style={styles.dot} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.center}>
                <Bell size={48} color="#E2E8F0" />
                <Text style={styles.emptyText}>No new notifications.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  backBtn: { padding: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  list: { padding: 16 },
  
  card: { flexDirection: 'row', backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 12, alignItems: 'center', ...SHADOWS.small, borderWidth: 1, borderColor: 'transparent' },
  unreadCard: { borderColor: COLORS.primary, backgroundColor: '#F0FDF4' },
  
  iconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  content: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  message: { fontSize: 13, color: '#64748B', lineHeight: 18 },
  date: { fontSize: 11, color: '#94A3B8', marginTop: 6 },
  
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginLeft: 8 },
  emptyText: { color: '#94A3B8', marginTop: 16, fontSize: 16, fontWeight: '600' }
});