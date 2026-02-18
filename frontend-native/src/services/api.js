import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native'; // ✅ Import Platform

// ✅ SMART URL SELECTION
// Use localhost for Web, and your LAN IP for Mobile
const API_URL = Platform.OS === 'web' 
  ? 'http://127.0.0.1:8000/api/v1' 
  : 'http://192.168.0.15:8000/api/v1'; // Ensure this IP is correct for your PC

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Add Token Interceptor
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// --- DATA FETCHING FUNCTIONS ---

export const fetchDrills = async () => {
  try {
    const response = await api.get('/drills');
    return response.data;
  } catch (error) {
    console.log("Fetch Drills Error", error);
    return [];
  }
};

export const fetchMyAthletes = async () => {
  try {
    const response = await api.get('/my-athletes');
    return response.data;
  } catch (error) {
    console.log("Fetch Athletes Error", error);
    return [];
  }
};

export const assignProgram = async (programData) => {
  try {
    const response = await api.post('/assign-program', programData);
    return response.data;
  } catch (error) {
    console.log("Assign Program Error:", error.response?.data || error);
    throw error;
  }
};

export const fetchMyProgram = async () => {
  try {
    const response = await api.get('/my-active-program');
    return response.data;
  } catch (error) {
    return null;
  }
};

export const fetchMyTeam = async () => {
  try {
    const response = await api.get('/my-athletes');
    return response.data;
  } catch (error) {
    console.error("Error fetching team:", error);
    throw error;
  }
};

export const fetchMyHistory = async () => {
  try {
    const response = await api.get('/my-session-logs');
    return response.data;
  } catch (error) {
    console.error("Error fetching history:", error);
    throw error;
  }
};

// --- USER & PROFILE ---

export const updateProfile = async (data) => {
  try {
    // Expects data = { goals: [...], level: "Advanced" }
    const response = await api.put('/my-profile', data);
    return response.data;
  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
};

export const fetchUserProfile = async () => {
  try {
    const response = await api.get('/my-profile');
    return response.data;
  } catch (error) {
    console.error("Error fetching profile:", error);
    return null;
  }
};

// --- PROGRAM MANAGEMENT ---

export const fetchPrograms = async () => {
  try {
    const response = await api.get('/programs'); 
    return response.data;
  } catch (error) {
    console.error("Fetch Programs Error:", error);
    return []; 
  }
};

export const createProgram = async (programData) => {
  try {
    const response = await api.post('/programs', programData); 
    return response.data;
  } catch (error) {
    console.error("Create Program Error:", error);
    throw error;
  }
};

export const deleteProgram = async (programId) => {
  try {
    // Note: URL matches backend router prefix in main.py (/api/v1 -> training router)
    const response = await api.delete(`/programs/${programId}`);
    return response.data;
  } catch (error) {
    console.error("Delete Program Error:", error);
    throw error;
  }
};

export const updateProgramStatus = async (programId, status) => {
  try {
    const response = await api.patch(`/programs/${programId}/status`, { status });
    return response.data;
  } catch (error) {
    console.error("Update Status Error:", error);
    throw error;
  }
};

export const fetchSessionLogs = async () => {
  try {
    const response = await api.get('/my-session-logs');
    return response.data;
  } catch (error) {
    console.error("Error fetching session logs:", error);
    return [];
  }
};

export const fetchPlayerLogs = async (playerId) => {
  try {
    const response = await api.get(`/athletes/${playerId}/logs`);
    return response.data;
  } catch (error) {
    console.error("Error fetching player logs:", error);
    return [];
  }
};

// --- SQUAD ENDPOINTS ---

export const fetchSquads = async () => {
  try {
    const response = await api.get('/squads');
    return response.data;
  } catch (error) {
    return [];
  }
};

export const createSquad = async (name, level, memberIds = []) => {
  const response = await api.post('/squads', { 
    name, 
    level, 
    initial_members: memberIds 
  });
  return response.data;
};

export const fetchSquadMembers = async (squadId) => {
  const response = await api.get(`/squads/${squadId}/members`);
  return response.data;
};

export const addMemberToSquad = async (squadId, playerId) => {
  const response = await api.post(`/squads/${squadId}/members`, { player_id: playerId });
  return response.data;
};

export const removeMemberFromSquad = async (squadId, playerId) => {
  const response = await api.delete(`/squads/${squadId}/members/${playerId}`);
  return response.data;
};

export const fetchCoachActivity = async () => {
  try {
    const response = await api.get('/coach/activity');
    return response.data;
  } catch (error) {
    console.error("Fetch Coach Activity Error:", error);
    return [];
  }
};

export const createDrill = async (drillData) => {
  try {
    const response = await api.post('/drills', drillData);
    return response.data;
  } catch (error) {
    console.error("Create Drill Error:", error);
    throw error;
  }
};

export const markSquadAttendance = async (squadId, playerIds) => {
  const response = await api.post(`/squads/${squadId}/attendance`, { player_ids: playerIds });
  return response.data;
};

export const fetchSquadLeaderboard = async (squadId) => {
  const response = await api.get(`/squads/${squadId}/leaderboard`);
  return response.data;
};

// --- MATCHES & DIARY ---

export const fetchMatches = async (userId = null, allTeam = false) => {
  let query = `?`;
  if (userId) query += `player_id=${userId}&`;
  
  // 🚨 THIS MUST BE HERE
  if (allTeam) query += `all_team=true&`; 
  
  console.log("Fetching matches with URL:", `/matches/${query}`); // Log for debugging
  const response = await api.get(`/matches/${query}`);
  return response.data;
};

// ✅ FIXED: Added trailing slash '/' to prevent 401 Redirect Error
export const createMatchLog = async (data) => {
  const response = await api.post('/matches/', data);
  return response.data;
};

export const submitCoachFeedback = async (matchId, feedbackText) => {
  try {
    const response = await api.put(`/matches/${matchId}/feedback`, { feedback: feedbackText });
    return response.data;
  } catch (error) {
    console.error("Feedback Error:", error);
    throw error;
  }
};

export const updateMatchDetails = async (matchId, updates) => {
  try {
    const response = await api.patch(`/matches/${matchId}`, updates);
    return response.data;
  } catch (error) {
    console.error("Update Match Error:", error);
    throw error;
  }
};

export const submitSessionFeedback = async (sessionId, feedback, liked) => {
  try {
    // ✅ CORRECT URL: Remove '/training' so it matches your other session endpoints
    const response = await api.put(`/sessions/${sessionId}/feedback`, { 
      feedback, 
      liked 
    });
    return response.data;
  } catch (error) {
    console.error("Session Feedback Error:", error);
    throw error;
  }
};

// --- NOTIFICATIONS (Added these!) ---

// ✅ Added fetchNotifications
export const fetchNotifications = async () => {
  try {
    const response = await api.get('/notifications/');
    return response.data;
  } catch (error) {
    console.error("Fetch Notifications Error:", error);
    return [];
  }
};

// ✅ Added markNotificationRead
export const markNotificationRead = async (notificationId) => {
  try {
    const response = await api.post(`/notifications/${notificationId}/read`);
    return response.data;
  } catch (error) {
    console.error("Mark Read Error:", error);
    throw error;
  }
};

export const fetchUnreadCounts = async () => {
  const response = await api.get('/notifications/unread-counts');
  return response.data;
};

// --- AUTH & MISC ---

export const registerUser = async (userData) => {
  try {
    const response = await api.post('/auth/register', {
      email: userData.email,
      password: userData.password,
      role: userData.role.toLowerCase(),
      age: parseInt(userData.age) || null,
      years_experience: parseInt(userData.yearsExperience) || 0,
      level: userData.level,
      goals: userData.goals
    });
    return response.data;
  } catch (error) {
    console.error("Registration Error:", error.response?.data || error.message);
    throw error; 
  }
};

export const fetchAthletes = async () => {
  const response = await api.get('/squads/athletes'); 
  return response.data;
};

export const requestCoach = async (code) => {
  try {
    const response = await api.post('/request-coach', { code });
    return response.data;
  } catch (error) {
    console.error("Request Coach Error:", error);
    throw error;
  }
};

export const fetchCoachRequests = async () => {
  try {
    const response = await api.get('/coach/requests');
    return response.data;
  } catch (error) {
    console.error("Fetch Requests Error:", error);
    return [];
  }
};

export const respondToCoachRequest = async (playerId, action) => {
  try {
    // action: 'ACCEPT' or 'REJECT'
    const response = await api.post(`/coach/requests/${playerId}/respond`, { action });
    return response.data;
  } catch (error) {
    console.error("Respond Error:", error);
    throw error;
  }
};

export const disconnectCoach = async () => {
  try {
    const response = await api.post('/disconnect-coach');
    return response.data;
  } catch (error) {
    console.error("Disconnect Error:", error);
    throw error;
  }
};

export const fetchProLibrary = async () => {
  try {
    const response = await api.get('/technique/pro-videos');
    return response.data;
  } catch (error) {
    console.error("Fetch Pro Library Error:", error);
    return []; // Return empty array to prevent .map errors
  }
};

export default api;