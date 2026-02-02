// FIX: Imported DrillPerformance to be used in history analysis.
import { GoogleGenAI, Type } from "@google/genai";
import { Drill, Program, ProgramItem, ProgramStatus, SessionLog, ProgramConfig, ProgramSession, DrillPerformance } from "../types";

const getDrillKnowledgeBase = (drills: Drill[]) => {
  return drills.map(d => `${d.id}: ${d.name} (${d.category}, ${d.difficulty}) - ${d.description}`).join('\n');
};

export const generateOnboardingPlans = async (
  userInfo: any,
  drills: Drill[]
): Promise<Partial<Program>[] | null> => {
  if (!process.env.API_KEY) {
    console.error("API Key is missing");
    return null;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const drillContext = getDrillKnowledgeBase(drills);

  const systemInstruction = `
    You are an expert elite tennis coach. Create 3 distinct multi-session training programs for a new user.
    Each program should have 3 sessions. Each session must include 1 Warmup drill and 3 main drills.
    
    User Profile:
    Sex: ${userInfo.sex}
    Years Played: ${userInfo.yearsPlayed}
    Level: ${userInfo.level}
    Goals: ${userInfo.goals.join(', ')}

    Drill Library:
    ${drillContext}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Generate 3 starter programs.",
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            plans: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  sessions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING, description: "e.g. Session 1: Baseline Power" },
                        items: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              drillId: { type: Type.STRING },
                              targetDurationMin: { type: Type.INTEGER },
                              sets: { type: Type.INTEGER },
                              reps: { type: Type.INTEGER },
                              notes: { type: Type.STRING }
                            },
                            required: ["drillId", "targetDurationMin", "notes"]
                          }
                        }
                      },
                      required: ["title", "items"]
                    }
                  }
                },
                required: ["title", "description", "sessions"]
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    
    const data = JSON.parse(text);
    
    return data.plans.map((p: any) => ({
      ...p,
      id: Math.random().toString(36).substr(2, 9),
      assignedBy: 'AI_ASSISTANT',
      assignedTo: userInfo.id,
      completed: false,
      status: ProgramStatus.ACCEPTED,
      createdAt: new Date().toISOString(),
      sessions: p.sessions.map((s: any) => ({...s, id: Math.random().toString(36).substr(2, 9), completed: false}))
    }));

  } catch (error) {
    console.error("Error generating onboarding plans:", error);
    return null;
  }
};

export const generateAIProgram = async (
  prompt: string,
  drills: Drill[],
  // FIX: Added goals to currentUserDetails to allow for more personalized program generation.
  currentUserDetails: { id: string; name: string; level?: string; goals?: string[] },
  history: SessionLog[] = [],
  config?: ProgramConfig,
  isProgression: boolean = false,
  baseProgram?: Program,
  singleSession: boolean = false,
  squadConstraints?: { players: number; courts: number }
): Promise<Partial<Program> | null> => {
  if (!process.env.API_KEY) {
    console.error("API Key is missing");
    return null;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const drillContext = getDrillKnowledgeBase(drills);

  // FIX: Updated history analysis to use drillPerformance for more detailed insights.
  // Analyze history for strengths and weaknesses
  // FIX: Used generic type on reduce for better type inference to resolve error on stats property access.
  const historyAnalysis = history.reduce<Record<string, {success: number, fail: number}>>((acc, log) => {
    log.drillPerformance.forEach(perf => {
        if (!acc[perf.drillId]) {
            acc[perf.drillId] = { success: 0, fail: 0 };
        }
        if (perf.outcome === 'success') {
            acc[perf.drillId].success++;
        } else {
            acc[perf.drillId].fail++;
        }
    });
    return acc;
  }, {});

  const strengths = Object.entries(historyAnalysis)
      .filter(([_, stats]) => stats.success > stats.fail)
      .map(([drillId, _]) => drillId);

  const weaknesses = Object.entries(historyAnalysis)
      .filter(([_, stats]) => stats.fail > stats.success)
      .map(([drillId, _]) => drillId);
  
  const strengthsContext = strengths.length > 0
    ? `Player Strengths (drills they usually succeed at): ${strengths.join(', ')}.`
    : '';

  const weaknessesContext = weaknesses.length > 0
    ? `Player Weaknesses (drills they often fail): ${weaknesses.join(', ')}.`
    : '';
  
  const goalsContext = currentUserDetails.goals && currentUserDetails.goals.length > 0 ? `Player's stated goals: ${currentUserDetails.goals.join(', ')}.` : '';

  let structureInstruction = '';
  if (singleSession) {
    structureInstruction = `Create a SINGLE session. The program should contain exactly 1 session. The session must have 1 warmup drill and 3 main drills.`;
  } else {
    structureInstruction = `Create a ${config?.weeks || 4}-session program (one session per week logic for this output). Return a list of sessions. Each session must have 1 warmup and 3 main drills.`;
  }

  // FIX: Improved prompt with more explicit instructions for large groups to ensure better drill selection.
  let constraintContext = '';
  if (squadConstraints) {
    constraintContext = `
      CONSTRAINT: This is a SQUAD program for ${squadConstraints.players} players on ${squadConstraints.courts} courts.
      Choose drills and provide notes that ensure high engagement and efficient rotation for this specific number of players/courts.
      Avoid drills that leave many players standing around.
      If the number of players per court is greater than 4, you MUST select drills that are suitable for larger groups. Prioritize drills that use rotations, feeding lines, or "King/Queen of the Court" style games to keep all players active and engaged. Avoid drills where only 2-4 players can participate at once, leaving others waiting.
    `;
  }

  // FIX: Updated system instruction to leverage strengths and weaknesses for personalization.
  const systemInstruction = `
    You are an expert elite tennis coach creating a personalized training program.

    Your task is to create a program that applies progressive overload based on past performance.
    - For strengths, consider including more advanced drills from the same category or increasing the difficulty (e.g., more reps, less time).
    - For weaknesses, re-include the same drills for practice or suggest slightly easier, foundational drills from the same category. Do not create a program consisting only of drills the user is bad at; balance it with their strengths to build confidence.

    Target Audience Level: ${currentUserDetails.level || 'Intermediate'}
    ${goalsContext}
    
    Player Performance History:
    ${strengthsContext}
    ${weaknessesContext}

    Drill Library:
    ${drillContext}
    
    ${structureInstruction}
    ${constraintContext}

    Instruction for this new program: ${prompt}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Create a tennis program based on my instructions.",
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            sessions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        drillId: { type: Type.STRING },
                        targetDurationMin: { type: Type.INTEGER },
                        sets: { type: Type.INTEGER },
                        reps: { type: Type.INTEGER },
                        notes: { type: Type.STRING, description: "Include instructions on rotations if applicable for squads." },
                        mode: { type: Type.STRING, enum: ["Cooperative", "Competitive"], description: "Default to Cooperative unless it's a game/point play." }
                      },
                      required: ["drillId", "targetDurationMin", "notes"]
                    }
                  }
                },
                required: ["title", "items"]
              }
            }
          },
          required: ["title", "description", "sessions"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    
    const data = JSON.parse(text);
    
    return {
      title: data.title,
      description: data.description,
      sessions: data.sessions.map((s: any) => ({
        ...s,
        id: Math.random().toString(36).substr(2, 9),
        completed: false
      })),
      assignedBy: 'AI_ASSISTANT',
      assignedTo: currentUserDetails.id,
      completed: false,
      status: ProgramStatus.ACCEPTED,
      createdAt: new Date().toISOString(),
      config: config
    };

  } catch (error) {
    console.error("Error generating program:", error);
    return null;
  }
};

export const generateSquadSession = async (
  prompt: string,
  drills: Drill[],
  constraints: { players: number; courts: number }
): Promise<any[] | null> => {
  if (!process.env.API_KEY) {
    console.error("API Key is missing");
    return null;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const drillContext = getDrillKnowledgeBase(drills);

  const systemInstruction = `
    You are an expert tennis coach planning a group squad session.
    Constraints: ${constraints.players} players, ${constraints.courts} courts.
    Drill Library: ${drillContext}
    
    Select drills that work well for this specific group size and court count to minimize standing around and maximize engagement.
    For example, if high player count, choose rotation drills.
    Return a list of drills for the session.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Create a session focusing on: ${prompt}`,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  drillId: { type: Type.STRING },
                  targetDurationMin: { type: Type.INTEGER },
                  sets: { type: Type.INTEGER },
                  notes: { type: Type.STRING, description: "Specific instructions for running this with the group size." },
                  mode: { type: Type.STRING, enum: ["Cooperative", "Competitive"] }
                },
                required: ["drillId", "targetDurationMin", "notes"]
              }
            }
          },
          required: ["items"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    const data = JSON.parse(text);
    return data.items;

  } catch (error) {
    console.error("Error generating squad session:", error);
    return null;
  }
};