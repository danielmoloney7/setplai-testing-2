





// FIX: Added Program to import and added QUICK_START_TEMPLATES and PREMADE_PROGRAMS constants.
import { Drill, DrillCategory, User, UserRole, Squad, Notification, ConsultationDrill, Program } from './types';

export const COMMON_GOALS = ['Improve Serve', 'Consistency', 'Strategy', 'Fitness', 'Mental Game', 'Power', 'Footwork'];

export const MOCK_DRILLS: Drill[] = [
  {
    id: 'w1',
    name: 'Dynamic Court Sprints',
    category: DrillCategory.WARMUP,
    difficulty: 'Beginner',
    description: 'Jogging, high knees, butt kicks, and side shuffles across the baseline.',
    defaultDurationMin: 10,
    visualUrl: 'https://media.giphy.com/media/3o7TKy7hIfMZuK2obC/giphy.gif'
  },
  { 
    id: 'd1', 
    name: 'Wide Serve Targeting', 
    category: DrillCategory.SERVE, 
    difficulty: 'Intermediate', 
    description: 'Hit 10 serves to the deuce wide corner, then 10 to ad wide.', 
    defaultDurationMin: 15,
    visualUrl: 'https://media.giphy.com/media/3o6Zt8qDiPE2d3kAzA/giphy.gif',
    // FIX: Added successCriteria to be used in session feedback.
    successCriteria: {
        type: 'reps',
        target: 20,
        prompt: 'How many serves landed in?'
    }
  },
  { 
    id: 'd2', 
    name: 'T-Serve Precision', 
    category: DrillCategory.SERVE, 
    difficulty: 'Advanced', 
    description: 'Focus on hitting the T-line. 20 reps each side.', 
    defaultDurationMin: 15,
    visualUrl: 'https://media.giphy.com/media/l0HlJDaeqNXVcWWfq/giphy.gif' 
  },
  { 
    id: 'd3', 
    name: 'Cross-Court Forehand Rally', 
    category: DrillCategory.FOREHAND, 
    difficulty: 'Intermediate', 
    description: 'Sustain a cross-court rally for 20 balls without error.', 
    defaultDurationMin: 10,
    visualUrl: 'https://media.giphy.com/media/3o7TKrEzvJbsQNtF5u/giphy.gif',
    // FIX: Added successCriteria to be used in session feedback.
    successCriteria: {
        type: 'rallyCount',
        target: 20,
        prompt: 'How many balls was your longest rally?'
    }
  },
  { 
    id: 'd4', 
    name: 'Inside-Out Forehand Attack', 
    category: DrillCategory.FOREHAND, 
    difficulty: 'Advanced', 
    description: 'Run around the backhand to hit aggressive inside-out forehands.', 
    defaultDurationMin: 12,
    visualUrl: 'https://media.giphy.com/media/xT9IgMw9fokK7jgu4M/giphy.gif'
  },
  { 
    id: 'd5', 
    name: 'Backhand Slice Defense', 
    category: DrillCategory.BACKHAND, 
    difficulty: 'Intermediate', 
    description: 'Defend against high bouncing balls using a deep slice.', 
    defaultDurationMin: 10,
    visualUrl: 'https://media.giphy.com/media/3o7bu3XilJ5BOiSGic/giphy.gif'
  },
  { 
    id: 'd6', 
    name: 'Two-Handed Cross-Court Depth', 
    category: DrillCategory.BACKHAND, 
    difficulty: 'Intermediate', 
    description: 'Focus on hitting past the service line consistently.', 
    defaultDurationMin: 10,
    visualUrl: 'https://media.giphy.com/media/3o6Zt9y2JCjc450T3q/giphy.gif'
  },
  { 
    id: 'd7', 
    name: 'Volley-Volley Reaction', 
    category: DrillCategory.VOLLEY, 
    difficulty: 'Advanced', 
    description: 'Rapid fire volleys at the net with a partner or wall.', 
    defaultDurationMin: 8,
    visualUrl: 'https://media.giphy.com/media/3o7TKvxnDibVYwawHC/giphy.gif'
  },
  { 
    id: 'd8', 
    name: 'Approach & Volley', 
    category: DrillCategory.VOLLEY, 
    difficulty: 'Beginner', 
    description: 'Hit a short ball approach shot and finish with a volley.', 
    defaultDurationMin: 15,
    visualUrl: 'https://media.giphy.com/media/3o7TKSjRrfPHj3fI5O/giphy.gif'
  },
  { 
    id: 'd9', 
    name: 'Spider Drill', 
    category: DrillCategory.FOOTWORK, 
    difficulty: 'Advanced', 
    description: 'Sprint from center mark to corners and back. Timed sets.', 
    defaultDurationMin: 10,
    visualUrl: 'https://media.giphy.com/media/3o7TKy7hIfMZuK2obC/giphy.gif'
  },
  { 
    id: 'd10', 
    name: 'Split Step Timing', 
    category: DrillCategory.FOOTWORK, 
    difficulty: 'Beginner', 
    description: 'Practice the split step timing against a feeder.', 
    defaultDurationMin: 5,
    visualUrl: 'https://media.giphy.com/media/l0HlCqV35hdEg2GMU/giphy.gif'
  },
  { 
    id: 'd11', 
    name: 'Baseline Grinder', 
    category: DrillCategory.FITNESS, 
    difficulty: 'Advanced', 
    description: 'Side to side running hitting groundstrokes for 2 mins non-stop.', 
    defaultDurationMin: 15,
    visualUrl: 'https://media.giphy.com/media/l2R077pC8hRbwM5Py/giphy.gif'
  },
  { 
    id: 'd12', 
    name: 'Serve & Volley Pattern', 
    category: DrillCategory.STRATEGY, 
    difficulty: 'Intermediate', 
    description: 'Serve and immediately move forward to split step.', 
    defaultDurationMin: 20,
    visualUrl: 'https://media.giphy.com/media/3o7TKDkDbIDJieoJws/giphy.gif'
  },
];

export const MOCK_USERS: User[] = [
  {
    id: 'coach1',
    name: 'Coach Williams',
    role: UserRole.COACH,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Coach',
    linkedPlayerIds: ['player1', 'player2', 'player3']
  },
  {
    id: 'player1',
    name: 'Rafael N.',
    role: UserRole.PLAYER,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rafa',
    coachId: 'coach1',
    sex: 'Male',
    yearsPlayed: 12,
    level: 'Advanced',
    goals: ['Win Club Championship'],
    squadIds: ['squad1']
  },
  {
    id: 'player2',
    name: 'Serena W.',
    role: UserRole.PLAYER,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Serena',
    coachId: 'coach1',
    sex: 'Female',
    yearsPlayed: 15,
    level: 'Advanced',
    goals: ['Power Serve'],
    squadIds: ['squad1']
  },
  {
    id: 'player3',
    name: 'Carlos A.',
    role: UserRole.PLAYER,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos',
    coachId: 'coach1',
    sex: 'Male',
    yearsPlayed: 4,
    level: 'Intermediate',
    goals: ['Consistency']
  }
];

export const MOCK_SQUADS: Squad[] = [
  {
    id: 'squad1',
    name: 'Elite Juniors',
    coachId: 'coach1',
    memberIds: ['player1', 'player2'],
    level: 'Advanced'
  }
];

export const CONSULTATION_DRILLS: ConsultationDrill[] = [
  {
    id: 'd3', 
    name: 'Cross-Court Forehand Consistency', 
    category: DrillCategory.FOREHAND, 
    difficulty: 'Intermediate', 
    description: 'With a partner or ball machine, hit cross-court forehands aiming for depth and consistency.', 
    defaultDurationMin: 5,
    visualUrl: 'https://media.giphy.com/media/3o7TKrEzvJbsQNtF5u/giphy.gif',
    scoring: {
        metric: 'count',
        target: 20,
        prompt: "Out of 20 shots, how many landed in beyond the service line?"
    }
  },
  {
    id: 'd6', 
    name: 'Cross-Court Backhand Consistency', 
    category: DrillCategory.BACKHAND, 
    difficulty: 'Intermediate', 
    description: 'With a partner or ball machine, hit cross-court backhands aiming for depth and consistency.', 
    defaultDurationMin: 5,
    visualUrl: 'https://media.giphy.com/media/3o6Zt9y2JCjc450T3q/giphy.gif',
    scoring: {
        metric: 'count',
        target: 20,
        prompt: "Out of 20 shots, how many landed in beyond the service line?"
    }
  },
  {
    id: 'd1', 
    name: 'Serve to Wide Target', 
    category: DrillCategory.SERVE, 
    difficulty: 'Intermediate', 
    description: 'Place a target in the wide area of the deuce court service box and aim for it.', 
    defaultDurationMin: 5,
    visualUrl: 'https://media.giphy.com/media/3o6Zt8qDiPE2d3kAzA/giphy.gif',
    scoring: {
        metric: 'count',
        target: 10,
        prompt: "Out of 10 serves, how many hit the target?"
    }
  },
  {
    id: 'd8', 
    name: 'Approach & Volley Execution', 
    category: DrillCategory.VOLLEY, 
    difficulty: 'Beginner', 
    description: 'Your partner feeds a short ball. Hit an approach shot and move in to put away the volley.', 
    defaultDurationMin: 5,
    visualUrl: 'https://media.giphy.com/media/3o7TKSjRrfPHj3fI5O/giphy.gif',
    scoring: {
        metric: 'count',
        target: 15,
        prompt: "Out of 15 attempts, how many points did you win with the 1-2 punch?"
    }
  },
];

export const MOCK_NOTIFICATIONS: Notification[] = [];

// FIX: Added QUICK_START_TEMPLATES and PREMADE_PROGRAMS to resolve import errors.
export const QUICK_START_TEMPLATES: Partial<Program>[] = [
  {
    title: 'Serve Power Up',
    description: 'A 30-minute session to boost your serve speed and accuracy.',
    isQuickStart: true,
    sessions: [
      {
        // FIX: Added missing id property to conform to ProgramSession type.
        id: 'qs_1_s1',
        title: 'Serve Focus',
        completed: false,
        items: [
          { drillId: 'w1', targetDurationMin: 5, notes: '', mode: 'Cooperative' },
          { drillId: 'd1', targetDurationMin: 15, notes: '', mode: 'Cooperative' },
          { drillId: 'd2', targetDurationMin: 10, notes: '', mode: 'Cooperative' },
        ],
      },
    ],
  },
  {
    title: 'Baseline Consistency',
    description: 'A focused workout to improve your groundstroke depth and reliability.',
    isQuickStart: true,
    sessions: [
      {
        // FIX: Added missing id property to conform to ProgramSession type.
        id: 'qs_2_s1',
        title: 'Groundstroke Groove',
        completed: false,
        items: [
          { drillId: 'w1', targetDurationMin: 5, notes: '', mode: 'Cooperative' },
          { drillId: 'd3', targetDurationMin: 15, notes: '', mode: 'Cooperative' },
          { drillId: 'd6', targetDurationMin: 10, notes: '', mode: 'Cooperative' },
        ],
      },
    ],
  },
];

export const PREMADE_PROGRAMS: Partial<Program>[] = [
  {
    id: 'prem_prog_1',
    title: 'Beginner Foundation',
    description: 'A 4-week program covering all the basic strokes to build a solid foundation.',
    sessions: [
      {
        id: 'prem_prog_1_s1',
        title: 'Session 1: Forehand Fundamentals',
        completed: false,
        items: [
          { drillId: 'w1', targetDurationMin: 10, notes: '', mode: 'Cooperative' },
          { drillId: 'd10', targetDurationMin: 10, notes: '', mode: 'Cooperative' },
          { drillId: 'd3', targetDurationMin: 20, notes: '', mode: 'Cooperative' },
          { drillId: 'd8', targetDurationMin: 15, notes: '', mode: 'Cooperative' },
        ],
      },
      {
        id: 'prem_prog_1_s2',
        title: 'Session 2: Backhand Basics',
        completed: false,
        items: [
          { drillId: 'w1', targetDurationMin: 10, notes: '', mode: 'Cooperative' },
          { drillId: 'd10', targetDurationMin: 10, notes: '', mode: 'Cooperative' },
          { drillId: 'd6', targetDurationMin: 20, notes: '', mode: 'Cooperative' },
          { drillId: 'd5', targetDurationMin: 15, notes: '', mode: 'Cooperative' },
        ],
      },
      {
        id: 'prem_prog_1_s3',
        title: 'Session 3: Serve & Net Play',
        completed: false,
        items: [
          { drillId: 'w1', targetDurationMin: 10, notes: '', mode: 'Cooperative' },
          { drillId: 'd1', targetDurationMin: 20, notes: '', mode: 'Cooperative' },
          { drillId: 'd8', targetDurationMin: 25, notes: '', mode: 'Cooperative' },
        ],
      },
      {
        id: 'prem_prog_1_s4',
        title: 'Session 4: Putting it all together',
        completed: false,
        items: [
          { drillId: 'w1', targetDurationMin: 10, notes: '', mode: 'Cooperative' },
          { drillId: 'd3', targetDurationMin: 15, notes: '', mode: 'Cooperative' },
          { drillId: 'd6', targetDurationMin: 15, notes: '', mode: 'Cooperative' },
          { drillId: 'd12', targetDurationMin: 15, notes: '', mode: 'Cooperative' },
        ],
      },
    ],
  },
  {
    id: 'prem_prog_2',
    title: 'Intermediate Competitor',
    description: 'Sharpen your skills with more advanced drills focusing on strategy and shot placement.',
    sessions: [
        {
            id: 'prem_prog_2_s1',
            title: 'Session 1: Aggressive Baseline',
            completed: false,
            items: [
              { drillId: 'w1', targetDurationMin: 10, notes: '', mode: 'Cooperative' },
              { drillId: 'd4', targetDurationMin: 15, notes: '', mode: 'Cooperative' },
              { drillId: 'd6', targetDurationMin: 15, notes: '', mode: 'Cooperative' },
              { drillId: 'd11', targetDurationMin: 10, notes: '', mode: 'Cooperative' },
            ]
        },
        {
            id: 'prem_prog_2_s2',
            title: 'Session 2: All-Court Game',
            completed: false,
            items: [
              { drillId: 'w1', targetDurationMin: 10, notes: '', mode: 'Cooperative' },
              { drillId: 'd12', targetDurationMin: 20, notes: '', mode: 'Cooperative' },
              { drillId: 'd7', targetDurationMin: 15, notes: '', mode: 'Cooperative' },
              { drillId: 'd9', targetDurationMin: 10, notes: '', mode: 'Cooperative' },
            ]
        }
    ]
  }
];