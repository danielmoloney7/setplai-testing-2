import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. iOS Simulator: 'http://127.0.0.1:8000/api/v1'
// 2. Android Emulator: 'http://10.0.2.2:8000/api/v1'
// 3. Real Phone: 'http://YOUR_LAPTOP_IP:8000/api/v1'
// const API_URL = 'http://10.3.23.151:8000/api/v1'; 

const API_URL = 'http://192.168.0.15:8000/api/v1'; 

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

// Used for assigning existing programs (optional flow)
export const assignProgram = async (programData) => {
  try {
    const response = await api.post('/assign-program', programData);
    return response.data;
  } catch (error) {
    console.log("Assign Program Error:", error.response?.data || error);
    throw error;
  }
};

// Fetches the single "Active" program (Legacy/Dashboard single view)
export const fetchMyProgram = async () => {
  try {
    const response = await api.get('/my-active-program');
    return response.data;
  } catch (error) {
    // Return null if 404 (no active program) or other error
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

export const updateProfile = async (goals) => {
  try {
    const response = await api.put('/my-profile', { goals });
    return response.data;
  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
};

export const fetchUserProfile = async () => {
  try {
    // ✅ Hit the new /me endpoint we just created
    const response = await api.get('/auth/me');
    return response.data;
  } catch (error) {
    console.error("Error fetching profile:", error);
    return null;
  }
};

// --- PROGRAM MANAGEMENT (For Builder, List & Status) ---

// 1. Fetch ALL Programs (For Programs List Tab & Dashboard Filtering)
export const fetchPrograms = async () => {
  try {
    const response = await api.get('/programs'); 
    return response.data;
  } catch (error) {
    console.error("Fetch Programs Error:", error);
    return []; 
  }
};

// 2. Create/Save New Program (For Builder Screen)
export const createProgram = async (programData) => {
  try {
    const response = await api.post('/programs', programData); 
    return response.data;
  } catch (error) {
    console.error("Create Program Error:", error);
    throw error;
  }
};

// 3. Update Status (Accept/Decline) - ✅ NEW ADDITION
export const updateProgramStatus = async (programId, status) => {
  try {
    // status can be 'ACTIVE', 'DECLINED', 'COMPLETED', etc.
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
    console.error("Fetch Squads Error:", error);
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

export const fetchMatches = async (playerId = null) => {
  // If playerId is provided, append it to the query string
  const endpoint = playerId ? `/matches/?player_id=${playerId}` : '/matches/';
  const response = await api.get(endpoint);
  return response.data;
};

export const createMatchLog = async (data) => {
  // data can now include { player_id: "..." }
  const response = await api.post('/matches', data);
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

export const updateMatchDetails = async (matchId, updates) => {
  try {
    const response = await api.patch(`/matches/${matchId}`, updates);
    return response.data;
  } catch (error) {
    console.error("Update Match Error:", error);
    throw error;
  }
};

export const fetchUnreadCounts = async () => {
  const response = await api.get('/notifications/unread-counts');
  return response.data;
};

export const fetchAthletes = async () => {
  const response = await api.get('/squads/athletes'); // Matches the endpoint above
  return response.data;
};

export default api;