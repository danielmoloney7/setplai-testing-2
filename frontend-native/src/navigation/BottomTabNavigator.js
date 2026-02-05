import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Layout, CalendarDays, Plus, TrendingUp, User as UserIcon, Users, Dumbbell, ClipboardList } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/theme';

// Screens
import DashboardScreen from '../screens/DashboardScreen';
import PlansScreen from '../screens/PlansScreen';
import ProgressScreen from '../screens/ProgressScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TeamScreen from '../screens/TeamScreen';
import DrillLibraryScreen from '../screens/DrillLibraryScreen';
import ProgramsListScreen from '../screens/ProgramsListScreen';

const Tab = createBottomTabNavigator();

const CustomTabBarButton = ({ children, onPress }) => (
  <View style={styles.floatingButtonContainer}>
    <TouchableOpacity style={styles.floatingButton} onPress={onPress} activeOpacity={0.8}>
      {children}
    </TouchableOpacity>
  </View>
);

export default function BottomTabNavigator({ navigation }) {
  const [role, setRole] = useState('PLAYER');

  useEffect(() => {
    const getRole = async () => {
      const storedRole = await AsyncStorage.getItem('user_role');
      if (storedRole) setRole(storedRole.toUpperCase());
    };
    getRole();
  }, []);

  const handleCreatePress = () => {
    if (role === 'COACH') {
      navigation.navigate('CoachAction'); // Opens the "Create New" Menu
    } else {
      // ✅ FIX: Navigate Players to Program Builder (Self-Assign Mode)
      // Passing { squadMode: false } ensures they see the individual assignment flow
      navigation.navigate('ProgramBuilder', { squadMode: false }); 
    }
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginBottom: 4 }
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} 
        options={{ tabBarLabel: 'Home', tabBarIcon: ({ color }) => <Layout color={color} size={24} /> }} 
      />

      {role === 'COACH' ? (
        <>
          {/* COACH TABS */}
          <Tab.Screen name="Team" component={TeamScreen} 
            options={{ tabBarLabel: 'Team', tabBarIcon: ({ color }) => <Users color={color} size={24} /> }} 
          />
          <Tab.Screen name="Create" component={DashboardScreen}
            options={{ tabBarIcon: ({ color }) => <Plus color="#FFF" size={32} />, tabBarButton: (props) => <CustomTabBarButton {...props} onPress={handleCreatePress} /> }} 
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
          {/* PLAYER TABS */}
          <Tab.Screen name="Plans" component={PlansScreen} 
            options={{ tabBarLabel: 'Plans', tabBarIcon: ({ color }) => <CalendarDays color={color} size={24} /> }} 
          />
          <Tab.Screen name="Create" component={DashboardScreen}
            options={{ tabBarIcon: ({ color }) => <Plus color="#FFF" size={32} />, tabBarButton: (props) => <CustomTabBarButton {...props} onPress={handleCreatePress} /> }} 
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
  tabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', height: Platform.OS === 'ios' ? 88 : 70, paddingBottom: Platform.OS === 'ios' ? 28 : 10, paddingTop: 10 },
  floatingButtonContainer: { top: -30, justifyContent: 'center', alignItems: 'center' },
  floatingButton: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8, borderWidth: 4, borderColor: '#F8FAFC' }
});