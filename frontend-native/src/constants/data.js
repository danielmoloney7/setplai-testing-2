// src/constants/data.js

export const ASSESSMENT_DRILLS = [
  {
    id: 'd3', 
    name: 'Forehand Consistency', 
    category: 'Forehand', 
    description: 'Hit cross-court forehands aiming for depth beyond the service line.', 
    target: 20,
    prompt: "Out of 20 shots, how many landed deep?"
  },
  {
    id: 'd6', 
    name: 'Backhand Stability', 
    category: 'Backhand', 
    description: 'Hit cross-court backhands aiming for depth beyond the service line.', 
    target: 20,
    prompt: "Out of 20 shots, how many landed deep?"
  },
  {
    id: 'd1', 
    name: 'Serve Accuracy', 
    category: 'Serve', 
    description: 'Place a target in the wide corner. Hit 10 serves aiming for it.', 
    target: 10,
    prompt: "Out of 10 serves, how many hit the target area?"
  },
  {
    id: 'd8', 
    name: 'Net Play Execution', 
    category: 'Volley', 
    description: 'Hit an approach shot and finish with a volley.', 
    target: 15,
    prompt: "Out of 15 attempts, how many points did you win?"
  },
];