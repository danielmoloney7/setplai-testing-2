import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { Layout, Plus, Users, Dumbbell, ClipboardList, CalendarDays, TrendingUp, User as UserIcon, Video, BookOpen } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/theme';
import { fetchPrograms } from '../services/api';

// Screens
import DashboardScreen from '../screens/DashboardScreen';
import TeamScreen from '../screens/TeamScreen';
import DrillLibraryScreen from '../screens/DrillLibraryScreen';
import ProgramsListScreen from '../screens/ProgramsListScreen'; 
import PlansScreen from '../screens/PlansScreen'; 
import CoachActionScreen from '../screens/CoachActionScreen';
import ProgressScreen from '../screens/ProgressScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TechniqueScreen from '../screens/TechniqueScreen';
import VideoCompareScreen from '../screens/VideoCompareScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Tab = createBottomTabNavigator();
const TopTab = createMaterialTopTabNavigator();
const TechniqueStack = createNativeStackNavigator();

// --- 1. Technique Stack (Analysis) ---
function TechniqueStackNavigator() {
  return (
    <TechniqueStack.Navigator screenOptions={{ headerShown: false }}>
      <TechniqueStack.Screen name="TechniqueHome" component={TechniqueScreen} />
      <TechniqueStack.Screen name="VideoCompare" component={VideoCompareScreen} />
    </TechniqueStack.Navigator>
  );
}

// --- 2. Combined Library Navigator (Drills + Technique) ---
function LibraryNavigator() {
  return (
    <View style={{ flex: 1, paddingTop: Platform.OS === 'ios' ? 60 : 40, backgroundColor: '#FFF' }}>
      <Text style={{ fontSize: 28, fontWeight: '800', color: '#0F172A', paddingHorizontal: 24, marginBottom: 10 }}>
        Library
      </Text>
      <TopTab.Navigator
        screenOptions={{
          tabBarLabelStyle: { fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: '#94A3B8',
          tabBarIndicatorStyle: { backgroundColor: COLORS.primary, height: 3 },
          tabBarStyle: { elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }
        }}
      >
        <TopTab.Screen name="Drills" component={DrillLibraryScreen} />
        <TopTab.Screen name="Technique" component={TechniqueStackNavigator} options={{ title: 'Analysis' }} />
      </TopTab.Navigator>
    </View>
  );
}

export default function BottomTabNavigator({ navigation }) {
  const [role, setRole] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  // 1. Check Role
  useEffect(() => {
    const checkData = async () => {
      try {
        const storedRole = await AsyncStorage.getItem('user_role');
        const safeRole = storedRole ? storedRole.toUpperCase() : 'PLAYER';
        setRole(safeRole);
      } catch (e) { setRole('PLAYER'); }
    };
    checkData();
  }, []);

  // 2. Poll for Pending Invites (Only if Player)
  useFocusEffect(
    useCallback(() => {
      if (role !== 'PLAYER') return;

      const checkPending = async () => {
        try {
          const programs = await fetchPrograms();
          const count = programs.filter(p => p.status === 'PENDING').length;
          setPendingCount(count);
        } catch (e) {
          console.log("Badge fetch error", e);
        }
      };

      checkPending();
      const interval = setInterval(checkPending, 10000);
      return () => clearInterval(interval);
    }, [role])
  );

  if (role === null) return <ActivityIndicator size="large" style={{flex:1}} />;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginBottom: 5 },
        tabBarItemStyle: { paddingTop: 5 },
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} 
        options={{ tabBarLabel: 'Home', tabBarIcon: ({ color }) => <Layout color={color} size={24} /> }} 
      />

      {role === 'COACH' ? (
        <>
          <Tab.Screen name="Team" component={TeamScreen} 
            options={{ tabBarLabel: 'Team', tabBarIcon: ({ color }) => <Users color={color} size={24} /> }} 
          />
          
          <Tab.Screen 
            name="CoachAction" 
            component={CoachActionScreen} 
            options={{ 
              tabBarLabel: () => null, 
              tabBarItemStyle: { width: 60 }, 
              tabBarIcon: () => (
                <View style={styles.floatingButton}>
                  <Plus color="#FFF" size={30} />
                </View>
              ),
            }} 
          />
          
          <Tab.Screen name="Programs" component={ProgramsListScreen} 
            options={{ tabBarLabel: 'Programs', tabBarIcon: ({ color }) => <ClipboardList color={color} size={24} /> }} 
          />

           {/* ✅ Library (Combines Drills + Technique) */}
           <Tab.Screen 
            name="Library" 
            component={LibraryNavigator} 
            options={{ 
              tabBarLabel: 'Library', 
              tabBarIcon: ({ color }) => <BookOpen color={color} size={24} /> 
            }} 
          />
          
          {/* Hidden Tabs (Accessible via other means) */}
          {/* <Tab.Screen name="Drills" component={DrillLibraryScreen} options={{ tabBarButton: () => null }} />
          <Tab.Screen name="Technique" component={TechniqueStackNavigator} options={{ tabBarButton: () => null }} /> */}
        </>
      ) : (
        <>
          <Tab.Screen name="Plans" component={PlansScreen} 
            options={{ 
              tabBarLabel: 'Plans', 
              tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
              tabBarBadgeStyle: { backgroundColor: '#EF4444', color: '#FFF', fontSize: 10, fontWeight: 'bold' },
              tabBarIcon: ({ color }) => <CalendarDays color={color} size={24} /> 
            }} 
          />

          <Tab.Screen name="CreatePlayer" component={View} 
            listeners={{ tabPress: (e) => { e.preventDefault(); navigation.navigate('ProgramBuilder'); } }}
            options={{ 
              tabBarLabel: () => null, 
              tabBarItemStyle: { width: 60 },
              tabBarIcon: () => (
                <View style={styles.floatingButton}>
                  <Plus color="#FFF" size={30} />
                </View>
              ),
            }} 
          />

          <Tab.Screen name="Progress" component={ProgressScreen} 
            options={{ tabBarLabel: 'Progress', tabBarIcon: ({ color }) => <TrendingUp color={color} size={24} /> }} 
          />
          
          {/* <Tab.Screen name="Profile" component={ProfileScreen} 
            options={{ tabBarLabel: 'Profile', tabBarIcon: ({ color }) => <UserIcon color={color} size={24} /> }} 
          /> */}
          
          <Tab.Screen 
            name="Technique" 
            component={TechniqueStackNavigator} 
            options={{ 
              tabBarLabel: 'Lab', 
              tabBarIcon: ({ color }) => <Video color={color} size={24} /> 
            }} 
          />
        </>
      )}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: { 
    position: 'absolute', 
    bottom: 0, // ✅ Fix: Anchors to bottom
    left: 0,   // ✅ Fix: Anchors to left edge
    right: 0,  // ✅ Fix: Anchors to right edge (Full Width)
    backgroundColor: '#FFFFFF', 
    borderTopWidth: 1, 
    borderTopColor: '#E2E8F0', 
    height: Platform.OS === 'ios' ? 85 : 65, 
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  floatingButton: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    backgroundColor: COLORS.primary, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: -30, 
    borderWidth: 4, 
    borderColor: '#FFF',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5
  }
});