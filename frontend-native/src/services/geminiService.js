import { GoogleGenAI } from "@google/genai";

// ⚠️ REPLACE THIS WITH YOUR ACTUAL API KEY
// In production, use standard React Native env variables (e.g. EXPO_PUBLIC_GEMINI_API_KEY)
const API_KEY = ""; 

const getDrillKnowledgeBase = (drills) => {
  return drills.map(d => `${d.id}: ${d.name} (${d.category}, ${d.difficulty}) - ${d.description}`).join('\n');
};

/**
 * HELPER: Safe Text Extraction
 * Fixes "response.text is not a function" errors by handling different SDK response structures.
 */
const extractResponseText = (response) => {
  try {
    // 1. Try standard function method
    if (typeof response.text === 'function') {
      return response.text();
    }
    // 2. Try nested candidate structure (Newer SDKs/Raw)
    if (response.candidates && response.candidates[0]?.content?.parts[0]?.text) {
      return response.candidates[0].content.parts[0].text;
    }
    // 3. Try direct text property
    if (response.text) {
        return response.text;
    }
    return null;
  } catch (e) {
    console.error("Error extracting text from Gemini response:", e);
    return null;
  }
};

/**
 * HELPER: Clean JSON
 * Removes markdown code blocks (```json ... ```) that Gemini often adds.
 */
const cleanJson = (text) => {
  if (!text) return null;
  // Remove ```json, ```, and trim whitespace
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

/**
 * 1. Generate Onboarding Plans (For the "OnboardingFlow.tsx")
 * Creates 3 distinct starter plans based on user profile.
 */
export const generateOnboardingPlans = async (userInfo, drills) => {
  if (!API_KEY) {
    console.error("API Key is missing");
    return null;
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const drillContext = getDrillKnowledgeBase(drills);

  const systemInstruction = `
    You are an expert elite tennis coach. Create 3 distinct multi-session training programs for a new user.
    Each program should have 3 sessions. Each session must include 1 Warmup drill and 3 main drills.
    
    User Profile:
    Sex: ${userInfo.sex}
    Years Played: ${userInfo.yearsPlayed}
    Level: ${userInfo.level}
    Goals: ${userInfo.goals ? userInfo.goals.join(', ') : 'General'}

    Drill Library:
    ${drillContext}
    
    Return JSON with a property "plans" which is an array of program objects.
  `;

  try {
    // Note: Updated to standard model instantiation if 'ai.models' fails, but keeping your structure if it works for your SDK version.
    // If 'ai.models.generateContent' fails, swap to: const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "Generate 3 starter programs.",
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
      }
    });

    // ✅ FIX: Safe Text Extraction + JSON Cleaning
    const rawText = extractResponseText(response);
    const cleanedText = cleanJson(rawText);

    if (!cleanedText) return null;
    
    const data = JSON.parse(cleanedText);
    
    // Add IDs and Metadata locally
    return data.plans.map((p) => ({
      ...p,
      id: Math.random().toString(36).substr(2, 9),
      assignedBy: 'AI_ASSISTANT',
      assignedTo: userInfo.id,
      completed: false,
      status: 'ACCEPTED',
      createdAt: new Date().toISOString(),
      sessions: p.sessions.map((s) => ({
        ...s,
        id: Math.random().toString(36).substr(2, 9),
        completed: false
      }))
    }));

  } catch (error) {
    console.error("Error generating onboarding plans:", error);
    return null;
  }
};

/**
 * 2. Generate AI Program (The Core Builder Function)
 * Used in "ProgramCreator.tsx" and "PlayerDashboard.tsx"
 */
export const generateAIProgram = async (
  prompt,
  drills,
  currentUserDetails, // { id, name, level, goals }
  history = [],
  config = { weeks: 4 },
  squadConstraints = null // { players: 4, courts: 1 }
) => {
  if (!API_KEY) {
    console.error("API Key is missing");
    return null;
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const drillContext = getDrillKnowledgeBase(drills);

  // --- Analyze History ---
  const historyAnalysis = history.reduce((acc, log) => {
    if (log.drillPerformance) {
        log.drillPerformance.forEach(perf => {
            if (!acc[perf.drillId]) acc[perf.drillId] = { success: 0, fail: 0 };
            if (perf.outcome === 'success') acc[perf.drillId].success++;
            else acc[perf.drillId].fail++;
        });
    }
    return acc;
  }, {});

  const strengths = Object.entries(historyAnalysis)
      .filter(([_, stats]) => stats.success > stats.fail)
      .map(([drillId, _]) => drillId);

  const weaknesses = Object.entries(historyAnalysis)
      .filter(([_, stats]) => stats.fail > stats.success)
      .map(([drillId, _]) => drillId);
  
  const strengthsContext = strengths.length > 0
    ? `Player Strengths: ${strengths.join(', ')}.` : '';
  const weaknessesContext = weaknesses.length > 0
    ? `Player Weaknesses: ${weaknesses.join(', ')}.` : '';
  const goalsContext = currentUserDetails.goals?.length > 0 
    ? `Player Goals: ${currentUserDetails.goals.join(', ')}.` : '';

  // --- Squad Constraints ---
  let constraintContext = '';
  if (squadConstraints) {
    constraintContext = `
      CONSTRAINT: This is a SQUAD program for ${squadConstraints.players} players on ${squadConstraints.courts} courts.
      Choose drills suitable for large groups (rotations, feeding lines, King of Court).
      Avoid drills where players stand around.
    `;
  }

  const systemInstruction = `
    You are an expert elite tennis coach.
    Target Audience Level: ${currentUserDetails.level || 'Intermediate'}
    ${goalsContext}
    
    History:
    ${strengthsContext}
    ${weaknessesContext}

    Drill Library:
    ${drillContext}
    
    ${constraintContext}

    Task: Create a ${config.weeks || 4}-session program. Each session needs 1 warmup and 3 main drills.
    Instruction: ${prompt}
    
    Return JSON format schema:
    {
      "title": "Program Title",
      "description": "Short description",
      "sessions": [
        {
          "title": "Session Title",
          "items": [
            { "drillId": "d1", "targetDurationMin": 15, "notes": "Coach notes", "sets": 3, "reps": 10, "mode": "Cooperative" }
          ]
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: "Generate the JSON.",
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
      }
    });

    // ✅ FIX: Safe Text Extraction + JSON Cleaning
    const rawText = extractResponseText(response);
    const cleanedText = cleanJson(rawText);

    if (!cleanedText) return null;
    
    const data = JSON.parse(cleanedText);
    
    return {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      assignedBy: 'AI_ASSISTANT',
      assignedTo: currentUserDetails.id,
      completed: false,
      status: 'ACCEPTED',
      createdAt: new Date().toISOString(),
      config: config,
      sessions: data.sessions.map(s => ({
        ...s,
        id: Math.random().toString(36).substr(2, 9),
        completed: false
      }))
    };

  } catch (error) {
    console.error("Error generating program:", error);
    return null;
  }
};

/**
 * 3. Generate Squad Session (For "EditSessionModal.tsx")
 * Creates a single session list of drills based on constraints.
 */
export const generateSquadSession = async (
  prompt,
  drills,
  constraints // { players: number, courts: number }
) => {
  if (!API_KEY) {
    console.error("API Key is missing");
    return null;
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const drillContext = getDrillKnowledgeBase(drills);

  const systemInstruction = `
    You are an expert tennis coach planning a group squad session.
    Constraints: ${constraints.players} players, ${constraints.courts} courts.
    Drill Library: ${drillContext}
    
    Select drills that work well for this specific group size and court count to minimize standing around.
    Return JSON with an "items" array.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Switched to 2.0-flash for consistency
      contents: `Create a session focusing on: ${prompt}`,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
      }
    });

    // ✅ FIX: Safe Text Extraction + JSON Cleaning
    const rawText = extractResponseText(response);
    const cleanedText = cleanJson(rawText);
    
    if (!cleanedText) return null;

    const data = JSON.parse(cleanedText);
    return data.items;

  } catch (error) {
    console.error("Error generating squad session:", error);
    return null;
  }
};