import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Layout, Plus, Users, Dumbbell, ClipboardList, CalendarDays, TrendingUp, User as UserIcon } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/theme';
import { fetchPrograms } from '../services/api';

// Screens
import DashboardScreen from '../screens/DashboardScreen';
import TeamScreen from '../screens/TeamScreen';
import DrillLibraryScreen from '../screens/DrillLibraryScreen';
import ProgramsListScreen from '../screens/ProgramsListScreen';
import CoachActionScreen from '../screens/CoachActionScreen';
import ProgressScreen from '../screens/ProgressScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function BottomTabNavigator({ navigation }) {
  const [role, setRole] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const checkData = async () => {
      try {
        const storedRole = await AsyncStorage.getItem('user_role');
        const safeRole = storedRole ? storedRole.toUpperCase() : 'PLAYER';
        setRole(safeRole);
        if (safeRole === 'PLAYER') {
          const programs = await fetchPrograms();
          const count = programs.filter(p => (p.status || '').toUpperCase() === 'PENDING').length;
          setPendingCount(count);
        }
      } catch (e) { setRole('PLAYER'); }
    };
    checkData();
  }, []);

  if (role === null) return <ActivityIndicator size="large" style={{flex:1}} />;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: styles.tabBar,
        // ✅ CRITICAL: This ensures all items (visible or hidden) don't mess up the flex math
        tabBarItemStyle: { height: 50 }, 
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
          
          {/* ✅ FIXED + BUTTON: Uses listeners instead of a custom button component for better layout stability */}
          <Tab.Screen 
            name="CoachAction" 
            component={CoachActionScreen} 
            options={{ 
              tabBarLabel: '',
              tabBarIcon: () => (
                <View style={styles.floatingButton}>
                  <Plus color="#FFF" size={30} />
                </View>
              ),
            }} 
          />
          
          <Tab.Screen name="Drills" component={DrillLibraryScreen} 
            options={{ tabBarLabel: 'Drills', tabBarIcon: ({ color }) => <Dumbbell color={color} size={24} /> }} 
          />
          
          <Tab.Screen name="Programs" component={ProgramsListScreen} 
            options={{ tabBarLabel: 'Programs', tabBarIcon: ({ color }) => <ClipboardList color={color} size={24} /> }} 
          />
        </>
      ) : (
        <>
          {/* PLAYER TABS: Standard 4-item layout */}
          <Tab.Screen name="Plans" component={ProgramsListScreen} 
            options={{ tabBarLabel: 'Plans', tabBarIcon: ({ color }) => <CalendarDays color={color} size={24} /> }} 
          />
          <Tab.Screen name="CreatePlayer" component={View} 
            listeners={{ tabPress: (e) => { e.preventDefault(); navigation.navigate('ProgramBuilder'); } }}
            options={{ 
              tabBarLabel: '',
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
          <Tab.Screen name="Profile" component={ProfileScreen} 
            options={{ tabBarLabel: 'Profile', tabBarIcon: ({ color }) => <UserIcon color={color} size={24} /> }} 
          />
        </>
      )}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: { 
    position: 'absolute', 
    backgroundColor: '#FFFFFF', 
    borderTopWidth: 1, 
    borderTopColor: '#E2E8F0', 
    height: 70, 
    paddingBottom: 12,
    // ✅ This forces the items to distribute across the whole width
    display: 'flex',
  },
  floatingButton: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    backgroundColor: COLORS.primary, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: -30, // Lifts it up
    borderWidth: 4, 
    borderColor: '#FFF',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5
  }
});