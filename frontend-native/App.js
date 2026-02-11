import React from 'react';
import { NavigationContainer } from '@react-navigation/native';     
import { createNativeStackNavigator } from '@react-navigation/native-stack'; 

// Auth Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';

// Main Navigation
import BottomTabNavigator from './src/navigation/BottomTabNavigator';

// Core Feature Screens
import ProgramBuilderScreen from './src/screens/ProgramBuilderScreen';
import SessionScreen from './src/screens/SessionScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ProgramDetailScreen from './src/screens/ProgramDetailScreen';
import AssessmentScreen from './src/screens/AssessmentScreen';

// Team & Detail Screens
import AthleteDetailScreen from './src/screens/AthleteDetailScreen';
import SquadDetailScreen from './src/screens/SquadDetailScreen';

// Session Management
import SessionLogDetailScreen from './src/screens/SessionLogDetailScreen';
import SessionSummaryScreen from './src/screens/SessionSummaryScreen';

// ✅ NEW FEATURES
import NotificationsScreen from './src/screens/NotificationsScreen';
import MatchListScreen from './src/screens/MatchListScreen';  // The List View
import MatchDiaryScreen from './src/screens/MatchDiaryScreen'; // The Detail/Form View

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">

        {/* --- AUTHENTICATION --- */}
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }} 
        />

        <Stack.Screen 
          name="Register" 
          component={RegisterScreen} 
          options={{ headerShown: false }} 
        />
              
        {/* --- MAIN APP (TABS) --- */}
        <Stack.Screen 
          name="Main" 
          component={BottomTabNavigator} 
          options={{ headerShown: false }} 
        />

        {/* --- TRAINING FEATURES --- */}
        <Stack.Screen 
          name="ProgramBuilder" 
          component={ProgramBuilderScreen} 
          options={{ headerShown: false }} 
        />

        <Stack.Screen 
          name="Session" 
          component={SessionScreen} 
          options={{ headerShown: false }} 
        />

        <Stack.Screen 
          name="Profile" 
          component={ProfileScreen} 
          options={{ headerShown: false, presentation: 'modal' }} 
        />

        <Stack.Screen 
          name="ProgramDetail" 
          component={ProgramDetailScreen} 
          options={{ headerTitle: 'Program Details', headerBackTitle: 'Back' }} 
        />

        <Stack.Screen 
          name="Assessment" 
          component={AssessmentScreen} 
          options={{ headerShown: false }} 
        />

        {/* --- TEAM & SQUAD MANAGEMENT --- */}
        <Stack.Screen 
          name="AthleteDetail" 
          component={AthleteDetailScreen} 
          options={{ headerShown: false }} 
        />

        <Stack.Screen 
          name="SquadDetail" 
          component={SquadDetailScreen} 
          options={{ headerShown: false }} 
        />

        {/* --- SESSION LOGS --- */}
        <Stack.Screen 
          name="SessionLogDetail" 
          component={SessionLogDetailScreen} 
        />

        <Stack.Screen 
          name="SessionSummary" 
          component={SessionSummaryScreen} 
          options={{ headerShown: false }} 
        />

        {/* --- ✅ NEW: NOTIFICATIONS --- */}
        <Stack.Screen 
          name="Notifications" 
          component={NotificationsScreen} 
          options={{ headerShown: false, presentation: 'modal' }} // Slide up effect
        />

        {/* --- ✅ NEW: MATCH DIARY --- */}
        {/* 1. The LIST of matches (Opened from Dashboard) */}
        <Stack.Screen 
          name="MatchDiary" 
          component={MatchListScreen} 
          options={{ headerShown: false }} 
        />

        {/* 2. The FORM/DETAIL view (Opened from List or Notifications) */}
        <Stack.Screen 
          name="MatchDetail" 
          component={MatchDiaryScreen} 
          options={{ headerShown: false, presentation: 'modal' }} 
        />

      </Stack.Navigator>
    </NavigationContainer>
  );
}