import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { 
  ChevronLeft, Bell, Calendar, Users, Info, Check, XCircle, CheckCircle, 
  Trophy, MessageSquare, ClipboardList, Activity 
} from 'lucide-react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import { fetchNotifications, markNotificationRead, fetchMatches, respondToCoachRequest } from '../services/api'; 

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [navigating, setNavigating] = useState(false); 

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
      // 1. Mark read (if it's a simple tap and not an action button)
      if (!item.is_read) {
          try {
             await markNotificationRead(item.id);
             setNotifications(prev => prev.map(n => n.id === item.id ? {...n, is_read: true} : n));
          } catch(e) {}
      }

      const type = item.type || "";
      const refId = item.reference_id || item.related_id;

      if (type.includes('MATCH')) {
          handleMatchNavigation(refId);
          return;
      }

      switch (type) {
        case 'PROGRAM_INVITE':
            navigation.navigate('Main', { screen: 'Plans' }); 
            break;

        case 'SQUAD_INVITE':
            if (refId) {
                navigation.navigate('SquadDetail', { squad: { id: refId, name: 'Squad Invite' } });
            }
            break;
            
        case 'COACH_REQUEST':
            // Instead of just navigating, we let them use the Accept/Decline buttons
            // But if they tap the card itself, maybe go to their profile or Team screen
            navigation.navigate('Main', { screen: 'Team' });
            break;

        default:
            console.log("Unknown notification type:", type);
            break;
      }
  };

  // ✅ NEW: Handle Coach Request Actions
  const handleRespondCoachRequest = async (item, action) => {
      try {
          // The player's ID should be in related_user_id or reference_id
          const playerId = item.related_user_id || item.reference_id;
          if (!playerId) {
              Alert.alert("Error", "Player information missing from notification.");
              return;
          }

          // 1. Send API request ('ACCEPT' or 'REJECT')
          await respondToCoachRequest(playerId, action);

          // 2. Mark notification as read
          await markNotificationRead(item.id);

          // 3. Remove the notification from the list (or mark it read so the buttons hide)
          setNotifications(prev => prev.filter(n => n.id !== item.id));

          Alert.alert("Success", `Request ${action.toLowerCase()}ed.`);
      } catch (e) {
          console.error("Coach Request Error:", e);
          Alert.alert("Error", "Could not process the request.");
      }
  };

  const handleMatchNavigation = async (matchId) => {
      if (!matchId || navigating) return;
      
      setNavigating(true);
      try {
          const allMatches = await fetchMatches(null, true); 
          const targetMatch = allMatches.find(m => m.id === matchId);

          if (targetMatch) {
              navigation.navigate('MatchDiary', { matchData: targetMatch });
          } else {
              Alert.alert("Notice", "Match details could not be found.");
          }
      } catch (e) {
          console.error("Nav Error", e);
          Alert.alert("Error", "Could not load match details.");
      } finally {
          setNavigating(false);
      }
  };

  const getIcon = (type) => {
      switch(type) {
          case 'PROGRAM_INVITE': return <Calendar size={20} color={COLORS.primary} />;
          case 'SQUAD_INVITE': return <Users size={20} color="#E11D48" />;
          case 'COACH_REQUEST': return <User size={20} color="#2563EB" />; // User icon for requests
          case 'MATCH_RESULT': return <Trophy size={20} color="#D97706" />;
          case 'MATCH_FEEDBACK': return <MessageSquare size={20} color={COLORS.primary} />;
          case 'MATCH_TACTICS': return <ClipboardList size={20} color="#0F172A" />;
          case 'MATCH_LOG': return <Activity size={20} color="#854D0E" />;
          default: return <Info size={20} color="#64748B" />;
      }
  };

  const renderItem = ({ item }) => {
      const isCoachRequest = item.type === 'COACH_REQUEST';
      // Only show buttons if it's unread/pending
      const showActionButtons = isCoachRequest && !item.is_read; 

      return (
          <TouchableOpacity 
            style={[styles.card, !item.is_read && styles.unreadCard]} 
            onPress={() => handlePress(item)}
            activeOpacity={0.8}
          >
              <View style={{flexDirection: 'row', gap: 12}}>
                  <View style={[styles.iconBox, !item.is_read && {backgroundColor: '#FFF'}]}>
                      {getIcon(item.type)}
                  </View>
                  <View style={{flex: 1}}>
                      <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                          <Text style={[styles.title, !item.is_read && styles.unreadText]}>{item.title}</Text>
                          <Text style={styles.time}>{new Date(item.created_at).toLocaleDateString()}</Text>
                      </View>
                      <Text style={styles.message} numberOfLines={showActionButtons ? 4 : 2}>{item.message}</Text>
                  </View>
                  {!item.is_read && <View style={styles.dot} />}
              </View>

              {/* ✅ ACTION BUTTONS FOR COACH REQUESTS */}
              {showActionButtons && (
                  <View style={styles.actionsRow}>
                      <TouchableOpacity 
                          style={[styles.actionBtn, styles.declineBtn]} 
                          onPress={() => handleRespondCoachRequest(item, 'REJECT')}
                      >
                          <XCircle size={16} color="#B91C1C" />
                          <Text style={styles.declineText}>Decline</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                          style={[styles.actionBtn, styles.acceptBtn]} 
                          onPress={() => handleRespondCoachRequest(item, 'ACCEPT')}
                      >
                          <CheckCircle size={16} color="#FFF" />
                          <Text style={styles.acceptText}>Accept</Text>
                      </TouchableOpacity>
                  </View>
              )}
          </TouchableOpacity>
      );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{width: 24}}>
            {navigating && <ActivityIndicator size="small" color={COLORS.primary} />}
        </View>
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
  
  card: { flexDirection: 'column', backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  unreadCard: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }, 
  iconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 2 },
  unreadText: { fontWeight: '800', color: '#0F172A' },
  message: { fontSize: 13, color: '#64748B', lineHeight: 18 },
  time: { fontSize: 10, color: '#94A3B8' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginTop: 4 },
  
  center: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, color: '#94A3B8', fontSize: 14 },

  // ✅ New styles for the Action Buttons
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 8, gap: 6 },
  acceptBtn: { backgroundColor: COLORS.primary },
  declineBtn: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5' },
  acceptText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  declineText: { color: '#B91C1C', fontWeight: '700', fontSize: 14 },
});