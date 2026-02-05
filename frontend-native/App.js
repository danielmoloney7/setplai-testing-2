import React from 'react';
import { NavigationContainer } from '@react-navigation/native';    
import { createNativeStackNavigator } from '@react-navigation/native-stack'; 
import LoginScreen from './src/screens/LoginScreen';
import BottomTabNavigator from './src/navigation/BottomTabNavigator';
import ProgramBuilderScreen from './src/screens/ProgramBuilderScreen';
import SessionScreen from './src/screens/SessionScreen';
import CoachActionScreen from './src/screens/CoachActionScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import TeamScreen from './src/screens/TeamScreen';
import DrillLibraryScreen from './src/screens/DrillLibraryScreen';
import ProgramDetailScreen from './src/screens/ProgramDetailScreen';
import AssessmentScreen from './src/screens/AssessmentScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }} 
        />
        
        {/* REPLACED 'Dashboard' with 'Main' (The Tab Navigator) */}
        <Stack.Screen 
          name="Main" 
          component={BottomTabNavigator} 
          options={{ headerShown: false }} 
        />

        {/* These screens sit ON TOP of the tabs (Full Screen) */}
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
          name="CoachAction" 
          component={CoachActionScreen} 
          options={{ headerShown: false, presentation: 'modal' }} // Nice modal effect
        />

        <Stack.Screen 
          name="Profile" 
          component={ProfileScreen} 
          options={{ headerShown: false, presentation: 'modal' }} // Optional: 'modal' looks nice for profile
        />

        <Stack.Screen 
          name="Team" 
          component={TeamScreen} 
          options={{ headerShown: false }} // Optional: 'modal' looks nice for profile
        />

        <Stack.Screen 
          name="Drills" 
          component={DrillLibraryScreen} 
          options={{ headerShown: false}} // Optional: 'modal' looks nice for profile
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

      </Stack.Navigator>
    </NavigationContainer>
  );
}