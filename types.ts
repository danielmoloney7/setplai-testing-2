

export enum UserRole {
  COACH = 'COACH',
  PLAYER = 'PLAYER'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
  coachId?: string; 
  linkedPlayerIds?: string[];
  friendIds?: string[]; // Social
  xp?: number; // Gamification
  // Onboarding Data
  sex?: 'Male' | 'Female' | 'Other';
  yearsPlayed?: number;
  level?: 'Beginner' | 'Intermediate' | 'Advanced';
  goals?: string[];
  squadIds?: string[];
  connectedDevices?: string[];
}

export interface Squad {
  id: string;
  name: string;
  coachId: string;
  memberIds: string[];
  level?: 'Beginner' | 'Intermediate' | 'Advanced';
}

export enum DrillCategory {
  WARMUP = 'Warmup',
  SERVE = 'Serve',
  FOREHAND = 'Forehand',
  BACKHAND = 'Backhand',
  VOLLEY = 'Volley',
  FOOTWORK = 'Footwork',
  STRATEGY = 'Strategy',
  FITNESS = 'Fitness'
}

export interface Drill {
  id: string;
  name: string;
  category: DrillCategory;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  defaultDurationMin: number;
  visualUrl?: string; 
  // FIX: Added optional successCriteria to Drill interface.
  successCriteria?: {
    type: 'reps' | 'rallyCount';
    target: number;
    prompt: string;
  };
}

export interface ProgramItem {
  drillId: string;
  targetDurationMin: number;
  sets?: number;
  reps?: number;
  notes?: string;
  mode?: 'Cooperative' | 'Competitive'; 
}

export interface ProgramSession {
  id: string;
  title: string;
  items: ProgramItem[];
  completed: boolean;
  dateCompleted?: string;
}

export enum ProgramStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  DROPPED = 'DROPPED',
  ARCHIVED = 'ARCHIVED'
}

export interface ProgramConfig {
  weeks: number;
  frequencyPerWeek: number;
  targetDate?: string;
}

export interface Program {
  id: string;
  title: string;
  description: string;
  assignedBy: string; 
  assignedTo: string; 
  sessions: ProgramSession[]; 
  createdAt: string;
  completed: boolean;
  status: ProgramStatus;
  config?: ProgramConfig;
  isQuickStart?: boolean; 
  difficultyLevel?: number; 
  isTemplate?: boolean; // For Library
}

export interface SquadSession {
  id: string;
  coachId: string;
  squadId: string;
  title: string;
  description: string;
  dateScheduled: string;
  items: ProgramItem[];
  attendeeIds: string[];
  completed: boolean;
  notes?: string;
}

// FIX: Added DrillPerformance interface to be used in SessionLog.
export interface DrillPerformance {
  drillId: string;
  outcome: 'success' | 'fail';
  achieved?: number;
}

export interface SessionLog {
  id: string;
  programId?: string;
  sessionId?: string; 
  squadSessionId?: string;
  playerId: string;
  dateCompleted: string;
  durationMin: number;
  rpe: number; 
  notes: string;
  // FIX: Replaced completedDrillIds with drillPerformance to align with application logic.
  drillPerformance: DrillPerformance[];
  photoUrl?: string;
  location?: string;
  avgHeartRate?: number;
  maxHeartRate?: number;
  caloriesBurned?: number;
  deviceUsed?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'PROGRAM_ASSIGNED' | 'PROGRAM_UPDATE' | 'SQUAD_INVITE' | 'PROGRAM_LEFT';
  title: string;
  message: string;
  relatedId?: string; 
  read: boolean;
  date: string;
}

export interface ConsultationDrill extends Drill {
    scoring: {
        metric: 'count' | 'time';
        target: number;
        prompt: string;
    };
}

export interface ConsultationResult {
  drillId: string;
  score: number;
  target: number;
}

export interface ConsultationLog {
  id: string;
  playerId: string;
  dateCompleted: string;
  results: ConsultationResult[];
  totalScore: number;
  calculatedLevel: 'Beginner' | 'Intermediate' | 'Advanced';
}
